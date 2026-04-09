import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import {
  getAllSubscriptions,
  updateNotificationSettings,
  getNotificationSettings,
  deleteSubscription,
  getAllGoalNotificationSettings,
  updateGoalNotificationSettings,
} from "@/lib/db/push";
import { getAllGoals } from "@/lib/db/goals";
import type { GoalNotificationSettings } from "@/lib/types";

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

// Resolve which days of week a schedule covers
function scheduleToDays(settings: GoalNotificationSettings): number[] {
  switch (settings.schedule) {
    case "daily":    return [0, 1, 2, 3, 4, 5, 6];
    case "weekdays": return [1, 2, 3, 4, 5];
    case "weekends": return [0, 6];
    case "custom":   return settings.days;
  }
}

// Shared send logic for a specific payload
async function sendPayloadToAll(
  payload: string,
  subscriptions: Awaited<ReturnType<typeof getAllSubscriptions>>
): Promise<{ sent: number; failed: number; expiredEndpoints: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(async (record) => {
      await webpush.sendNotification(record.subscription as webpush.PushSubscription, payload);
      return record.subscription.endpoint;
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  const expiredEndpoints: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expiredEndpoints.push(subscriptions[i].subscription.endpoint);
      }
    }
  });

  return { sent, failed, expiredEndpoints };
}

// Vercel Cron fires GET /api/push/notify on schedule (every 30 min)
export async function GET(req: NextRequest) {
  // 1. Verify cron secret
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Load global settings for timezone
  const globalSettings = await getNotificationSettings();
  const tz = globalSettings.timezone ?? "UTC";

  let localDate: Date;
  try {
    localDate = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    console.warn(`[notify] Invalid timezone "${tz}", falling back to UTC`);
    localDate = new Date();
  }

  const todayDow = localDate.getDay();
  const nowMinutes = localDate.getHours() * 60 + localDate.getMinutes();
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

  if (!vapidConfigured) {
    return NextResponse.json(
      { error: "Push notifications not configured. Set VAPID keys in environment variables." },
      { status: 503 }
    );
  }

  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json({ skipped: "no-subscriptions" });
  }

  // 3. Evaluate per-goal notification settings
  const [allGoalSettings, allGoals] = await Promise.all([
    getAllGoalNotificationSettings(),
    getAllGoals(),
  ]);

  const goalMap = new Map(allGoals.map((g) => [g.id, g]));
  const settingsMap = new Map(allGoalSettings.map((s) => [s.goalId, s]));

  let totalSent = 0;
  let totalFailed = 0;
  const expiredSet = new Set<string>();
  const notifiedGoals: string[] = [];

  for (const goal of allGoals) {
    const settings = settingsMap.get(goal.id);
    if (!settings || !settings.enabled) continue;

    // Day-of-week check
    const allowedDays = scheduleToDays(settings);
    if (!allowedDays.includes(todayDow)) continue;

    // Time window check: within ±15 min of reminderTime
    const [hh, mm] = settings.reminderTime.split(":").map(Number);
    const reminderMinutes = hh * 60 + mm;
    const diff = Math.min(
      Math.abs(nowMinutes - reminderMinutes),
      1440 - Math.abs(nowMinutes - reminderMinutes)
    );
    if (diff > 15) continue;

    // Dedup: don't send twice in the same local day
    if (settings.lastNotifiedDate === todayStr) continue;

    // Build tailored message
    const body = settings.message?.trim()
      ? settings.message
      : `Don't forget: ${goal.dailyAction}`;

    const payload = JSON.stringify({
      title: `Check in: ${goal.name}`,
      body,
      url: `/goals/${goal.id}`,
      goalId: goal.id,
    });

    const { sent, failed, expiredEndpoints } = await sendPayloadToAll(payload, subscriptions);
    totalSent += sent;
    totalFailed += failed;
    expiredEndpoints.forEach((ep) => expiredSet.add(ep));

    if (sent > 0) {
      await updateGoalNotificationSettings(goal.id, { lastNotifiedDate: todayStr });
      notifiedGoals.push(goal.name);
    }
  }

  // 4. Also check global (legacy) notification settings
  if (globalSettings.enabled && globalSettings.reminderTime) {
    const [hh, mm] = globalSettings.reminderTime.split(":").map(Number);
    const reminderMinutes = hh * 60 + mm;
    const diff = Math.min(
      Math.abs(nowMinutes - reminderMinutes),
      1440 - Math.abs(nowMinutes - reminderMinutes)
    );
    const dayOk = globalSettings.days.length === 0 || globalSettings.days.includes(todayDow);

    if (diff <= 15 && dayOk && globalSettings.lastNotifiedDate !== todayStr) {
      // Only send global notification if no per-goal notifications went out
      // (to avoid double-notifying users who have set up per-goal reminders)
      const hasPerGoalReminders = allGoals.some((g) => settingsMap.get(g.id)?.enabled);
      if (!hasPerGoalReminders) {
        const payload = JSON.stringify({
          title: "Time to check in!",
          body: "How are your goals going today?",
          url: "/dashboard",
        });
        const { sent, failed, expiredEndpoints } = await sendPayloadToAll(payload, subscriptions);
        totalSent += sent;
        totalFailed += failed;
        expiredEndpoints.forEach((ep) => expiredSet.add(ep));
        if (sent > 0) {
          await updateNotificationSettings({ lastNotifiedDate: todayStr });
        }
      }
    }
  }

  // Clean up expired subscriptions
  for (const endpoint of expiredSet) {
    await deleteSubscription(endpoint);
    console.log(`[notify] Removed expired subscription: ${endpoint}`);
  }

  return NextResponse.json({
    sent: totalSent,
    failed: totalFailed,
    expiredRemoved: expiredSet.size,
    notifiedGoals,
  });
}

// Settings page "Send test notification" → POST bypasses schedule logic.
export async function POST(req: NextRequest) {
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

  // Optional: test a specific goal notification
  let body: { goalId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  let payload: string;
  if (body.goalId) {
    const { getGoalById } = await import("@/lib/db/goals");
    const { getGoalNotificationSettings } = await import("@/lib/db/push");
    const [goal, settings] = await Promise.all([
      getGoalById(body.goalId),
      getGoalNotificationSettings(body.goalId),
    ]);
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    const notifBody = settings.message?.trim() ? settings.message : `Don't forget: ${goal.dailyAction}`;
    payload = JSON.stringify({
      title: `Check in: ${goal.name}`,
      body: notifBody,
      url: `/goals/${goal.id}`,
      goalId: body.goalId,
    });
  } else {
    payload = JSON.stringify({
      title: "Time to check in!",
      body: "How are your goals going today?",
      url: "/dashboard",
    });
  }

  const results = await Promise.allSettled(
    subscriptions.map((record) =>
      webpush.sendNotification(record.subscription as webpush.PushSubscription, payload)
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ sent, failed });
}
