import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getAllSubscriptions, updateNotificationSettings, getNotificationSettings } from "@/lib/db/push";

// Only configure VAPID if keys are provided
const vapidConfigured =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

// Shared send logic — called by both the cron (GET) and the test button (POST)
async function sendNotifications(): Promise<NextResponse> {
  if (!vapidConfigured) {
    return NextResponse.json(
      { error: "Push notifications not configured. Set VAPID keys in environment variables." },
      { status: 503 }
    );
  }

  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscriptions" });
  }

  const payload = JSON.stringify({
    title: "Time to check in!",
    body: "How are your goals going today?",
    url: "/dashboard",
  });

  const results = await Promise.allSettled(
    subscriptions.map((record) =>
      webpush.sendNotification(record.subscription as webpush.PushSubscription, payload)
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Record today's date in the user's local timezone to prevent duplicate sends
  const settings = await getNotificationSettings();
  const tz = settings.timezone ?? "UTC";
  let localDate: Date;
  try {
    localDate = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    localDate = new Date();
  }
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  await updateNotificationSettings({ lastNotifiedDate: todayStr });

  return NextResponse.json({ sent, failed });
}

// Vercel Cron fires GET /api/push/notify on schedule
export async function GET(req: NextRequest) {
  // 1. Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Load settings
  const settings = await getNotificationSettings();
  if (!settings.enabled) return NextResponse.json({ skipped: "disabled" });
  if (!settings.reminderTime) return NextResponse.json({ skipped: "no-reminder-time" });

  // 3. Get current time in user's timezone (falls back to UTC on invalid timezone)
  const tz = settings.timezone ?? "UTC";
  let localDate: Date;
  try {
    localDate = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    console.warn(`[notify] Invalid timezone "${tz}", falling back to UTC`);
    localDate = new Date();
  }

  // 4. Day-of-week check (empty days array = every day)
  const todayDow = localDate.getDay();
  if (settings.days.length > 0 && !settings.days.includes(todayDow)) {
    return NextResponse.json({ skipped: "wrong-day" });
  }

  // 5. Time window check: within ±15 min of reminderTime
  //    Uses min(abs, 1440-abs) to handle midnight wraparound correctly
  const [hh, mm] = settings.reminderTime.split(":").map(Number);
  const reminderMinutes = hh * 60 + mm;
  const nowMinutes = localDate.getHours() * 60 + localDate.getMinutes();
  const diff = Math.min(
    Math.abs(nowMinutes - reminderMinutes),
    1440 - Math.abs(nowMinutes - reminderMinutes)
  );
  if (diff > 15) return NextResponse.json({ skipped: "outside-window" });

  // 6. Dedup: don't send twice in the same local day
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  if (settings.lastNotifiedDate === todayStr) {
    return NextResponse.json({ skipped: "already-sent" });
  }

  return sendNotifications();
}

// Settings page "Send test notification" button → POST bypasses all schedule logic
export async function POST() {
  return sendNotifications();
}
