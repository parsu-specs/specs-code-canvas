// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { consumeSharedDestination, rememberSharedDestination } from "./sharedDestination";

beforeEach(() => {
  consumeSharedDestination();
  sessionStorage.clear();
});

describe("shared destinations after sign-in", () => {
  it.each(["/apps/project%20one", "/developers/alex"])(
    "keeps %s through sign-in and consumes it once",
    (path) => {
      rememberSharedDestination(path);
      expect(consumeSharedDestination()).toBe(path);
      expect(consumeSharedDestination()).toBeNull();
    },
  );
  it.each(["https://evil.example", "//evil.example", "/signin", "/profile", "/apps/one/extra"])(
    "rejects non-share destination %s",
    (path) => {
      rememberSharedDestination(path);
      expect(consumeSharedDestination()).toBeNull();
    },
  );
  it("validates values stored before sign-in", () => {
    sessionStorage.setItem("cc.shared-destination.v1", "https://evil.example");
    expect(consumeSharedDestination()).toBeNull();
  });
});
