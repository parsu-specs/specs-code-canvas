// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import SubmitProjectForm, { type SubmitProjectModalProps } from "./SubmitProjectForm";
import type { ImageEditorProps } from "../../components/ImageEditor";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Exercise the submission queue separately from the canvas editor's own tests.
vi.mock("../../components/ImageEditor", () => ({
  default: ({ file, aspectRatio, onSave, onCancel }: ImageEditorProps) => (
    <div data-editor={file.name} data-ratio={aspectRatio}>
      <button
        type="button"
        onClick={() =>
          void Promise.resolve(
            onSave(new File(["crop"], `${file.name}-edited.png`, { type: "image/png" })),
          ).catch(() => {})
        }
      >
        Use edited image
      </button>
      <button type="button" onClick={onCancel}>
        Skip image
      </button>
    </div>
  ),
}));
vi.mock("../../components/MarkdownTextarea", () => ({ default: () => null }));
vi.mock("../../components/MentionInput", () => ({ default: () => null }));
vi.mock("../../components/CollaboratorPicker", () => ({ default: () => null }));

let cleanup = () => {};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(overrides: Partial<SubmitProjectModalProps> = {}) {
  const props: SubmitProjectModalProps = {
    projectStage: "Working prototype",
    setProjectStage: vi.fn(),
    projectVersion: "v0.1",
    setProjectVersion: vi.fn(),
    categories: [],
    categoryInput: "Productivity",
    collabIds: [],
    closeSubmission: vi.fn(),
    desc: "A project",
    docs: "",
    docsFile: null,
    docsPreviewReturnTab: "write",
    docsRepoUrl: "",
    docsTab: "write",
    downloadDocumentation: vi.fn(),
    imageBusy: false,
    icon: "",
    setIcon: vi.fn(),
    pickIcon: vi.fn().mockResolvedValue(true),
    imgError: null,
    importRepositoryFiles: vi.fn(),
    loadRepositoryFiles: vi.fn(),
    pickImages: vi.fn().mockResolvedValue(true),
    profiles: [],
    readMdFile: vi.fn(),
    repoUrl: "",
    repositoryFiles: [],
    repositoryFilesError: null,
    repositoryFilesImporting: false,
    repositoryFilesLoading: false,
    resetRepositoryFiles: vi.fn(),
    screenshots: [],
    selectedRepositoryFiles: [],
    setCategoryInput: vi.fn(),
    setCollabIds: vi.fn(),
    setDesc: vi.fn(),
    setDocs: vi.fn(),
    setDocsFile: vi.fn(),
    setDocsPreviewReturnTab: vi.fn(),
    setDocsTab: vi.fn(),
    setRepoUrl: vi.fn(),
    setScreenshots: vi.fn(),
    setSelectedRepositoryFiles: vi.fn(),
    setTitle: vi.fn(),
    setUrl: vi.fn(),
    submit: vi.fn(),
    submitError: null,
    submitting: false,
    title: "Project",
    url: "https://example.com",
    ...overrides,
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<SubmitProjectForm {...props} />));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const upload = container.querySelector(
    'input[aria-label="Choose thumbnail images"]',
  ) as HTMLInputElement;
  const choose = (count: number) => {
    const files = Array.from(
      { length: count },
      (_, index) => new File(["image"], `${index + 1}.jpg`, { type: "image/jpeg" }),
    );
    Object.defineProperty(upload, "files", { configurable: true, value: files });
    act(() => upload.dispatchEvent(new Event("change", { bubbles: true })));
  };
  const button = (text: string) =>
    Array.from(container.querySelectorAll("button")).find((element) =>
      element.textContent?.includes(text),
    )!;
  const rerender = (next: Partial<SubmitProjectModalProps>) => {
    Object.assign(props, next);
    act(() => root.render(<SubmitProjectForm {...props} />));
  };
  return { props, container, upload, choose, button, rerender };
}

it("allows a visual prototype without a live app link or numbered version", () => {
  const { props, button } = renderForm({
    projectStage: "Visual prototype",
    projectVersion: "",
    url: "",
  });
  act(() => button("Publish project").click());
  expect(props.submit).toHaveBeenCalledOnce();
});

it("crops icons separately from thumbnails, blocks publishing while editing, and supports removal", async () => {
  const { props, container, button, rerender } = renderForm();
  const input = container.querySelector(
    'input[aria-label="Choose project icon"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["icon"], "icon.png", { type: "image/png" })],
  });
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(container.querySelector('[data-editor="icon.png"]')?.getAttribute("data-ratio")).toBe("1");
  expect(button("Publish project").disabled).toBe(true);
  await act(async () => button("Use edited image").click());
  expect(props.pickIcon).toHaveBeenCalledOnce();
  expect(props.pickImages).not.toHaveBeenCalled();
  expect(button("Publish project").disabled).toBe(false);
  rerender({ icon: "data:image/png;base64,aWNvbg==" });
  expect(container.querySelector('img[alt="Project icon preview"]')).not.toBeNull();
  act(() => button("Remove icon").click());
  expect(props.setIcon).toHaveBeenCalledWith("");
});

it("can cancel icon editing and retry a failed icon save", async () => {
  const pickIcon = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { container, button } = renderForm({ pickIcon });
  const input = container.querySelector(
    'input[aria-label="Choose project icon"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["icon"], "icon.png", { type: "image/png" })],
  });
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => button("Use edited image").click());
  expect(button("Publish project").disabled).toBe(true);
  await act(async () => button("Use edited image").click());
  expect(container.querySelector("[data-editor]")).toBeNull();
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
  act(() => button("Skip image").click());
  expect(button("Publish project").disabled).toBe(false);
});

it("validates the version label before publishing", () => {
  const { props, button } = renderForm({ projectVersion: "not a version" });
  act(() => button("Publish project").click());
  expect(props.submit).not.toHaveBeenCalled();
});

it("opens the picker from empty slots, replaces filled slots, and restores a slot after removal", () => {
  const { props, container, upload, rerender } = renderForm();
  const addSlots = () =>
    container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Add thumbnail"]');
  expect(addSlots()).toHaveLength(3);
  const openPicker = vi.spyOn(upload, "click").mockImplementation(() => {});
  act(() => addSlots()[1].click());
  expect(openPicker).toHaveBeenCalledOnce();

  const screenshots = [
    "https://example.com/1.png",
    "https://example.com/2.png",
    "https://example.com/3.png",
  ];
  rerender({ screenshots });
  expect(addSlots()).toHaveLength(0);
  expect(container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(3);
  act(() =>
    (container.querySelector('[aria-label="Remove image 2"]') as HTMLButtonElement).click(),
  );
  const remove = vi.mocked(props.setScreenshots).mock.calls[0][0] as (
    previous: string[],
  ) => string[];
  rerender({ screenshots: remove(screenshots) });
  expect(addSlots()).toHaveLength(1);
  expect(addSlots()[0].disabled).toBe(false);
  expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(3);
  act(() => addSlots()[0].click());
  expect(openPicker).toHaveBeenCalledTimes(2);
});

it("edits before adding, processes files in order, and blocks publishing until finished", async () => {
  const { props, container, upload, choose, button } = renderForm();
  choose(2);
  expect(props.pickImages).not.toHaveBeenCalled();
  expect(container.querySelector('[data-editor="1.jpg"]')?.getAttribute("data-ratio")).toBe(
    String(16 / 9),
  );
  expect(upload.disabled).toBe(true);
  expect(button("Publish project").disabled).toBe(true);
  await act(async () => button("Use edited image").click());
  expect(props.pickImages).toHaveBeenCalledOnce();
  const edited = vi.mocked(props.pickImages).mock.calls[0][0] as File[];
  expect(edited[0].name).toBe("1.jpg-edited.png");
  expect(container.querySelector('[data-editor="2.jpg"]')).not.toBeNull();
  act(() => button("Skip image").click());
  expect(container.querySelector("[data-editor]")).toBeNull();
  expect(props.pickImages).toHaveBeenCalledOnce();
  expect(button("Publish project").disabled).toBe(false);
});

it("limits the queue to the remaining thumbnail slots", async () => {
  const { container, choose, button } = renderForm({
    screenshots: ["https://example.com/a.png", "https://example.com/b.png"],
  });
  choose(3);
  await act(async () => button("Use edited image").click());
  expect(container.querySelector("[data-editor]")).toBeNull();
});

it("keeps the current file queued when compression fails and retries it", async () => {
  const pickImages = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { container, choose, button } = renderForm({ pickImages });
  choose(1);
  await act(async () => button("Use edited image").click());
  expect(container.querySelector('[data-editor="1.jpg"]')).not.toBeNull();
  expect(button("Publish project").disabled).toBe(true);
  await act(async () => button("Use edited image").click());
  expect(container.querySelector("[data-editor]")).toBeNull();
  expect(pickImages).toHaveBeenCalledTimes(2);
});
