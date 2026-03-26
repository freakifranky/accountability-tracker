"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationNudge() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem("notif-nudge-dismissed")) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function handleDismiss() {
    localStorage.setItem("notif-nudge-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 mb-4">
      <span className="text-2xl leading-none shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Get daily check-in reminders</p>
        <p className="text-xs text-gray-400 mt-0.5">Never miss a day — set up in Settings</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/settings")}
          className="text-xs font-medium border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Settings
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 text-lg leading-none transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
