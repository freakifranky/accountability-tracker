import { NextRequest, NextResponse } from "next/server";

// Single shared-secret check for all API routes. This is a personal, single-user
// app with no login system — the secret's job is to stop opportunistic bots/scrapers
// from POSTing to a public Vercel URL, not to withstand a targeted attacker who
// inspects network requests. See TODOS.md if that threat model ever changes.
//
// Also accepts CRON_SECRET: Vercel Cron automatically sends
// `Authorization: Bearer $CRON_SECRET` on scheduled invocations of routes like
// /api/push/notify, which predates this middleware and checks CRON_SECRET
// itself inside the route handler. Without this, a blanket single-secret check
// here would reject Vercel's own cron requests and silently break the existing
// daily notification job.
export function middleware(request: NextRequest) {
  const apiSecret = process.env.NEXT_PUBLIC_API_SHARED_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: "Server misconfigured: NEXT_PUBLIC_API_SHARED_SECRET not set" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const isValid = authHeader === `Bearer ${apiSecret}` || (!!cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
