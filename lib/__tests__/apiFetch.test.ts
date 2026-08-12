// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, API_ERROR_EVENT } from "../apiFetch";

describe("apiFetch", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves normally and does not dispatch an error event on a 2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const listener = vi.fn();
    window.addEventListener(API_ERROR_EVENT, listener);

    const res = await apiFetch("/api/tasks");

    expect(res.status).toBe(200);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(API_ERROR_EVENT, listener);
  });

  it("throws and dispatches a global error event on a non-ok response (the missing-secret regression)", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Server misconfigured: NEXT_PUBLIC_API_SHARED_SECRET not set" }), {
          status: 500,
        })
      );
    const listener = vi.fn();
    window.addEventListener(API_ERROR_EVENT, listener);

    await expect(apiFetch("/api/tasks", { method: "POST" })).rejects.toThrow(
      "Server misconfigured: NEXT_PUBLIC_API_SHARED_SECRET not set"
    );
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(API_ERROR_EVENT, listener);
  });

  it("throws but does NOT dispatch a toast when silent: true", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const listener = vi.fn();
    window.addEventListener(API_ERROR_EVENT, listener);

    await expect(apiFetch("/api/stats", { silent: true })).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(API_ERROR_EVENT, listener);
  });

  it("falls back to a status-based message when the error body isn't JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("not json", { status: 502 }));
    await expect(apiFetch("/api/tasks")).rejects.toThrow(/502/);
  });

  it("surfaces a network failure (fetch rejecting) as a thrown error with a toast", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const listener = vi.fn();
    window.addEventListener(API_ERROR_EVENT, listener);

    await expect(apiFetch("/api/tasks")).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(API_ERROR_EVENT, listener);
  });
});
