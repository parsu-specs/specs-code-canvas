import { expect, it } from "vitest";
import { projectImageSources } from "./projectImages";

const host = "https://images.example";
const cover = `${host}/storage/v1/object/public/project-images/u1/v1/image-1/cover`;

it("derives thumbnails and accurate responsive widths from generated cover URLs", () => {
  const image = projectImageSources(`${cover}#w=1600&h=900&tw=768&th=432`, host)!;
  expect(image.cover).toBe(cover);
  expect(image.thumbnail).toBe(cover.replace(/cover$/, "thumbnail"));
  expect(image.srcSet).toBe(`${image.thumbnail} 768w, ${cover} 1600w`);
  expect(image.width).toBe(1600);
  expect(image.thumbnailHeight).toBe(432);
});

it("keeps legacy data URLs and unrelated image hosts unchanged", () => {
  for (const src of ["data:image/jpeg;base64,AQID", "https://external.example/cover.jpg", cover]) {
    const image = projectImageSources(src, "https://another.example")!;
    expect(image.cover).toBe(src);
    expect(image.thumbnail).toBe(src);
    expect(image.srcSet).toBeUndefined();
  }
});

it("does not upscale small originals through inaccurate width descriptors", () => {
  const image = projectImageSources(`${cover}#w=320&h=180&tw=320&th=180`, host)!;
  expect(image.srcSet).toBeUndefined();
});

it("rejects unsafe URLs and ignores invalid dimension metadata", () => {
  expect(projectImageSources("javascript:alert(1)", host)).toBeNull();
  const image = projectImageSources(`${cover}#w=-1&h=NaN&tw=9999999`, host)!;
  expect(image.width).toBeUndefined();
  expect(image.height).toBeUndefined();
  expect(image.srcSet).toBeUndefined();
});
