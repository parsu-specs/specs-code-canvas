import workerSource from "../../public/font-cache-worker.js?raw";
import { expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const offline = new Response("offline");
  const fetch = vi.fn().mockResolvedValue(new Response("online"));
  const caches = {
    match: vi.fn().mockResolvedValue(offline),
    open: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const clients = { claim: vi.fn().mockResolvedValue(undefined) };
  const runWorker = new Function("self", "caches", "fetch", "URL", "Response", workerSource);
  runWorker(
    {
      addEventListener: (name: string, handler: (event: any) => void) => {
        handlers[name] = handler;
      },
      location: { origin: "https://codecanvas.example" },
      clients,
    },
    caches,
    fetch,
    URL,
    Response,
  );
  return { handlers, offline, fetch, caches, clients };
}

it("uses the network for deep routes and falls back only when navigation fails", async () => {
  const { handlers, fetch, caches, offline } = worker();
  const request = { method: "GET", mode: "navigate", url: "https://codecanvas.example/apps/123" };
  let response: Promise<Response>;
  const respondWith = (value: Promise<Response>) => {
    response = value;
  };
  handlers.fetch({ request, respondWith });
  expect(await (await response!).text()).toBe("online");
  expect(caches.match).not.toHaveBeenCalled();
  fetch.mockRejectedValue(new TypeError("offline"));
  handlers.fetch({ request, respondWith });
  expect(await response!).toBe(offline);
  expect(caches.match).toHaveBeenCalledWith("/offline.html");
});

it("does not intercept API calls or writes", () => {
  const { handlers, fetch, caches } = worker();
  const respondWith = vi.fn();
  for (const method of ["GET", "POST"]) {
    handlers.fetch({
      request: { method, mode: "cors", destination: "", url: "https://api.example/profile" },
      respondWith,
    });
  }
  expect(respondWith).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(caches.match).not.toHaveBeenCalled();
});

it("leaves manifests and install icons on the network for native app updaters", () => {
  const { handlers, caches } = worker();
  const respondWith = vi.fn();
  for (const path of ["/manifest.webmanifest", "/pwa/themes/forest-dark/icon-512.png?v=3"]) {
    handlers.fetch({
      request: { method: "GET", destination: "", url: "https://codecanvas.example" + path },
      respondWith,
    });
  }
  expect(respondWith).not.toHaveBeenCalled();
  expect(caches.open).not.toHaveBeenCalled();
});

it("removes obsolete local branding on upgrade while preserving cached fonts", async () => {
  const { handlers, caches, clients } = worker();
  caches.keys.mockResolvedValue([
    "codecanvas-branding-v1",
    "codecanvas-offline-v2",
    "codecanvas-offline-v3",
    "launchpad-fonts-v1",
  ]);
  let pending: Promise<void>;
  handlers.activate({
    waitUntil: (promise: Promise<void>) => {
      pending = promise;
    },
  });
  await pending!;
  expect(caches.delete.mock.calls.map(([name]) => name)).toEqual([
    "codecanvas-branding-v1",
    "codecanvas-offline-v2",
  ]);
  expect(clients.claim).toHaveBeenCalledOnce();
});
