import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

// Direct unit test of the auth gate — this is the seam that actually proves
// Architecture Issue 2 (zero auth on any /api/* route) is fixed, since the
// route handlers themselves have no auth check of their own; middleware.ts is
// the only thing standing between a stranger and a write.
describe("middleware auth gate", () => {
  const ORIGINAL_SECRET = process.env.NEXT_PUBLIC_API_SHARED_SECRET;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_SHARED_SECRET = "test-secret-123";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_SHARED_SECRET = ORIGINAL_SECRET;
  });

  it("rejects a request with no Authorization header", async () => {
    const req = new NextRequest("https://example.com/api/tasks");
    const res = middleware(req);
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong secret", async () => {
    const req = new NextRequest("https://example.com/api/tasks", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = middleware(req);
    expect(res.status).toBe(401);
  });

  it("allows a request with the correct secret", async () => {
    const req = new NextRequest("https://example.com/api/tasks", {
      headers: { authorization: "Bearer test-secret-123" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(401);
  });

  it("fails closed (500, not open) when the server has no secret configured", async () => {
    delete process.env.NEXT_PUBLIC_API_SHARED_SECRET;
    const req = new NextRequest("https://example.com/api/tasks", {
      headers: { authorization: "Bearer anything" },
    });
    const res = middleware(req);
    expect(res.status).toBe(500);
  });

  it("also allows Vercel Cron's own CRON_SECRET, so scheduled /api/push/notify keeps working", async () => {
    process.env.CRON_SECRET = "vercel-cron-secret";
    const req = new NextRequest("https://example.com/api/push/notify", {
      headers: { authorization: "Bearer vercel-cron-secret" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(401);
    delete process.env.CRON_SECRET;
  });

  it("rejects a value that matches neither the app secret nor CRON_SECRET", async () => {
    process.env.CRON_SECRET = "vercel-cron-secret";
    const req = new NextRequest("https://example.com/api/push/notify", {
      headers: { authorization: "Bearer some-other-value" },
    });
    const res = middleware(req);
    expect(res.status).toBe(401);
    delete process.env.CRON_SECRET;
  });
});
