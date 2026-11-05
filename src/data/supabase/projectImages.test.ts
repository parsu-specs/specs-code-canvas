import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabase } from "./client";
import { encodeImage, imageDimensions } from "../../utils/images";
import { cleanupProjectImages, withStoredProjectImages } from "./projectImages";

vi.mock("./client", () => ({ getSupabase: vi.fn() }));
vi.mock("../../utils/images", async (original) => ({
  ...(await original<typeof import("../../utils/images")>()),
  encodeImage: vi.fn(),
  imageDimensions: vi.fn(),
}));

const source = "data:image/webp;base64,AQID";
const host = "https://images.example";
const existing = `${host}/storage/v1/object/public/project-images/u1/v1/old/cover#w=1600&h=900&tw=768&th=432`;
const upload = vi.fn(),
  remove = vi.fn(),
  rpc = vi.fn();
const bucket = {
  upload,
  remove,
  getPublicUrl: (path: string) => ({
    data: { publicUrl: `${host}/storage/v1/object/public/project-images/${path}` },
  }),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", host);
  upload.mockReset().mockResolvedValue({ data: {}, error: null });
  remove.mockReset().mockResolvedValue({ data: [], error: null });
  rpc.mockReset().mockResolvedValue({ data: false, error: null });
  vi.mocked(getSupabase).mockReturnValue({ storage: { from: vi.fn(() => bucket) }, rpc } as never);
  vi.mocked(imageDimensions).mockResolvedValue({ width: 1600, height: 900 });
  vi.mocked(encodeImage).mockResolvedValue({
    dataUrl: source,
    width: 768,
    height: 432,
    mimeType: "image/webp",
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("project image persistence", () => {
  it("uploads immutable thumbnail/cover files and saves only their canonical URL and dimensions", async () => {
    const save = vi.fn(async (images: string[]) => images);
    const result = await withStoredProjectImages([source], "u1", save);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls.map(([path]) => path.split("/").at(-1))).toEqual([
      "cover",
      "thumbnail",
    ]);
    expect(upload.mock.calls[0][0]).toMatch(/^u1\/v1\/[^/]+\/cover$/);
    expect(upload.mock.calls[0][2]).toMatchObject({
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });
    expect(result[0]).toMatch(/\/cover#w=1600&h=900&tw=768&th=432$/);
    expect(result[0]).not.toContain("base64");
    expect(remove).not.toHaveBeenCalled();
  });

  it("cleans up both files when the database write fails", async () => {
    const failure = new Error("Database write failed");
    await expect(
      withStoredProjectImages([source], "u1", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(remove).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringMatching(/\/cover$/),
        expect.stringMatching(/\/thumbnail$/),
      ]),
    );
  });

  it("waits for a late successful upload before cleaning up a partially failed pair", async () => {
    let finishCover: (() => void) | undefined;
    upload.mockImplementation((path: string) =>
      path.endsWith("/cover")
        ? new Promise((resolve) => {
            finishCover = () => resolve({ error: null });
          })
        : Promise.resolve({ error: { message: "Upload denied" } }),
    );
    const save = vi.fn();
    const result = withStoredProjectImages([source], "u1", save).catch((error: unknown) => error);
    await vi.waitFor(() => expect(finishCover).toBeDefined());
    expect(remove).not.toHaveBeenCalled();
    finishCover!();
    expect(await result).toEqual(
      expect.objectContaining({ message: expect.stringContaining("Could not upload images") }),
    );
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/\/cover$/)]);
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps compact inline publishing available before the bucket migration is installed", async () => {
    upload.mockResolvedValue({ error: { message: "Bucket not found", statusCode: "404" } });
    const save = vi.fn().mockResolvedValue("published");
    await expect(withStoredProjectImages([source], "u1", save)).resolves.toBe("published");
    expect(save).toHaveBeenCalledWith([source]);
    expect(encodeImage).toHaveBeenLastCalledWith(expect.any(File), {
      maxDimension: 800,
      quality: 0.76,
      maxBytes: 80_000,
    });
  });

  it("does not turn an authorization error into an inline-storage fallback", async () => {
    upload.mockResolvedValue({ error: { message: "Unauthorized", statusCode: "403" } });
    const save = vi.fn();
    await expect(withStoredProjectImages([source], "u1", save)).rejects.toThrow(
      "Could not upload images",
    );
    expect(save).not.toHaveBeenCalled();
    expect(encodeImage).toHaveBeenCalledOnce();
  });

  it("passes existing URLs through without re-uploading or requesting image data", async () => {
    const save = vi.fn().mockResolvedValue("saved");
    await withStoredProjectImages([existing], "u1", save);
    expect(save).toHaveBeenCalledWith([existing]);
    expect(upload).not.toHaveBeenCalled();
    expect(imageDimensions).not.toHaveBeenCalled();
  });
});

describe("retired project image cleanup", () => {
  it("removes only the current owner's unreferenced generated pair", async () => {
    await cleanupProjectImages(
      [existing, existing, "https://other.example/photo.jpg", existing.replace("/u1/", "/u2/")],
      [],
      "u1",
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith("project_image_is_referenced", {
      p_cover_url: existing.split("#")[0],
    });
    expect(remove).toHaveBeenCalledWith(["u1/v1/old/cover", "u1/v1/old/thumbnail"]);
  });

  it("retains assets that are still selected or shared by another project", async () => {
    await cleanupProjectImages([existing], [existing], "u1");
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: true, error: null });
    await cleanupProjectImages([existing], [], "u1");
    expect(remove).not.toHaveBeenCalled();
  });

  it("retains files if the server cannot verify references", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Reference check unavailable" } });
    await cleanupProjectImages([existing], [], "u1");
    expect(remove).not.toHaveBeenCalled();
  });
});
