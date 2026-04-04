"use client";

import { useEffect } from "react";

export default function PushNotificationInit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function init() {
      // Register service worker for PWA (regardless of push config)
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        return;
      }

      // Skip badge logic if VAPID not configured or notifications not granted
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey || !("PushManager" in window)) return;
      if (Notification.permission !== "granted") return;

      // Update app icon badge with total streak count
      try {
        const statsRes = await fetch("/api/stats");
        const stats = await statsRes.json();
        if ("setAppBadge" in navigator && stats.totalStreak > 0) {
          (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> })
            .setAppBadge(stats.totalStreak).catch(() => {});
        }
      } catch {
        // Badge is optional, ignore errors
      }
    }

    init();
  }, []);

  return null;
}
