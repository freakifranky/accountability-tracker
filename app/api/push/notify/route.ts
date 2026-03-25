import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAllSubscriptions, updateNotificationSettings } from "@/lib/db/push";
import { format } from "date-fns";

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

export async function POST() {
  if (!vapidConfigured) {
    return NextResponse.json(
      { error: "Push notifications not configured. Set VAPID keys in .env.local." },
      { status: 503 }
    );
  }

  const subscriptions = getAllSubscriptions();
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
      webpush.sendNotification(
        record.subscription as webpush.PushSubscription,
        payload
      )
    )
  );

  // Record that we notified today
  updateNotificationSettings({ lastNotifiedDate: format(new Date(), "yyyy-MM-dd") });

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}
