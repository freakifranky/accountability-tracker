"use client";

import { useEffect } from "react";
import { format } from "date-fns";

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

      // Skip push logic if VAPID not configured
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey || !("PushManager" in window)) return;

      // Skip if notifications aren't granted
      if (Notification.permission !== "granted") return;

      try {
        const res = await fetch("/api/push/settings");
        const settings = await res.json();
        if (!settings.enabled) return;

        const todayStr = format(new Date(), "yyyy-MM-dd");
        if (settings.lastNotifiedDate === todayStr) return;

        const [hh, mm] = (settings.reminderTime as string).split(":").map(Number);
        const now = new Date();
        const reminderToday = new Date();
        reminderToday.setHours(hh, mm, 0, 0);
        if (now < reminderToday) return;

        const todayDow = now.getDay();
        if (settings.days.length > 0 && !(settings.days as number[]).includes(todayDow)) return;

        await fetch("/api/push/notify", { method: "POST" });
      } catch {
        // Silently ignore — notifications are optional
      }
    }

    init();
  }, []);

  return null;
}
