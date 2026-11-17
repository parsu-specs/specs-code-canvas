// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Modal from "./Modal";
import { SHEET_EXIT_MS, useSheetPresence } from "./useSheetPresence";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const close = () =>
  document.querySelector<HTMLButtonElement>('[aria-label="Close project"]')!.click();

it("keeps a sheet mounted and scroll locked until its slide-down finishes", async () => {
  function Harness() {
    const [open, setOpen] = useState(true);
    return open ? (
      <Modal id="project" title="Project" onClose={() => setOpen(false)}>
        Details
      </Modal>
    ) : null;
  }
  await act(async () => root.render(<Harness />));
  expect(document.querySelector(".sheet-overlay")).not.toBeNull();
  expect(document.body.style.overflow).toBe("hidden");
  await act(async () => close());
  expect(document.querySelector('.sheet-overlay[data-closing="true"]')).not.toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SHEET_EXIT_MS - 1);
  });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(container.inert).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.style.overflow).toBe("");
  expect(container.inert).toBe(false);
});

it("keeps confirmations centered and dismisses them immediately", async () => {
  const onClose = vi.fn();
  await act(async () =>
    root.render(
      <Modal id="project" title="Project" confirmation onClose={onClose}>
        Confirm
      </Modal>,
    ),
  );
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  expect(document.querySelector(".sheet-overlay")).toBeNull();
  await act(async () => close());
  expect(onClose).toHaveBeenCalledOnce();
});

it("centers discard confirmation, retains the draft, and returns to the sheet", async () => {
  const onClose = vi.fn();
  await act(async () =>
    root.render(
      <Modal id="project" title="Project" closeConfirmation="Discard the draft?" onClose={onClose}>
        <input defaultValue="Draft" />
      </Modal>,
    ),
  );
  await act(async () => close());
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  expect(document.querySelector(".sheet-overlay")).toBeNull();
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[aria-label="Keep editing"]')!.click(),
  );
  expect(document.querySelector(".sheet-overlay")).not.toBeNull();
  expect(document.querySelector("input")?.value).toBe("Draft");
  expect(onClose).not.toHaveBeenCalled();
});

it("retains the last content during external dismissal and can reopen before exit ends", async () => {
  function Harness({ value }: { value: string | null }) {
    const sheet = useSheetPresence(value);
    return sheet.present ? <div data-closing={sheet.closing}>{sheet.value}</div> : null;
  }
  await act(async () => root.render(<Harness value="First" />));
  await act(async () => root.render(<Harness value={null} />));
  expect(container.textContent).toBe("First");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
    root.render(<Harness value="Second" />);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SHEET_EXIT_MS);
  });
  expect(container.textContent).toBe("Second");
  await act(async () => root.render(<Harness value={null} />));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SHEET_EXIT_MS);
  });
  expect(container.textContent).toBe("");
});

it("dismisses without an animation delay for reduced motion", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const onClose = vi.fn();
  await act(async () =>
    root.render(
      <Modal id="project" title="Project" onClose={onClose}>
        Details
      </Modal>,
    ),
  );
  await act(async () => close());
  expect(onClose).toHaveBeenCalledOnce();
});

it.each([false, true])("focuses without scrolling during entry (mobile: %s)", async (mobile) => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(width < 48rem)" && mobile,
  }));
  const focus = vi.spyOn(HTMLElement.prototype, "focus");
  try {
    await act(async () =>
      root.render(
        <Modal id="project" title="Project" onClose={() => {}}>
          <input aria-label="Project name" />
        </Modal>,
      ),
    );
    const target = document.querySelector(mobile ? '[role="dialog"]' : "input");
    expect(document.activeElement).toBe(target);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(focus.mock.instances[0]).toBe(target);
  } finally {
    focus.mockRestore();
  }
});
