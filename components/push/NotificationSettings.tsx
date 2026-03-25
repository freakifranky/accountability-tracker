"use client";

import { useState, useEffect } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-utils";
import type { NotificationSettings } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const pushSupported = typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator;

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    fetch("/api/push/settings")
      .then((r) => r.json())
      .then((s) => setSettings(s));

    // Check if already subscribed
    if (pushSupported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub));
      });
    }
  }, [pushSupported]);

  async function requestAndSubscribe() {
    if (!vapidKey) return;
    setSaving(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setSaving(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      setSubscribed(true);
    } catch {
      // user denied or error
    }
    setSaving(false);
  }

  async function unsubscribe() {
    setSaving(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function saveSettings(patch: Partial<NotificationSettings>) {
    const updated = { ...settings!, ...patch };
    setSettings(updated);
    await fetch("/api/push/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/push/notify", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTestResult(data.sent > 0 ? `Sent! Check for the notification.` : "No active subscription found.");
    } else {
      setTestResult(data.error ?? "Failed to send.");
    }
    setTesting(false);
  }

  if (!settings) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (!vapidKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <p className="font-medium mb-1">Push notifications not configured</p>
        <p className="text-xs text-amber-600">
          To enable push notifications, generate VAPID keys and add them to <code>.env.local</code>. See the README for setup instructions. The app works fully without this.
        </p>
      </div>
    );
  }

  if (!pushSupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Daily reminder</p>
          <p className="text-xs text-gray-400">Get a push notification to check in on your goals</p>
        </div>
        <button
          onClick={() => saveSettings({ enabled: !settings.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? "bg-[#e44332]" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Reminder time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder time</label>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => saveSettings({ reminderTime: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Days of week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days <span className="text-xs font-normal text-gray-400">(none = every day)</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((day, i) => {
                const active = settings.days.includes(i);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const next = active
                        ? settings.days.filter((d) => d !== i)
                        : [...settings.days, i].sort();
                      saveSettings({ days: next });
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-[#e44332] text-white border-[#e44332]"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Subscription management */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Browser subscription</p>
        {permission === "denied" ? (
          <p className="text-xs text-red-500">
            Notifications blocked in browser settings. Please allow notifications for this site.
          </p>
        ) : subscribed ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-600 font-medium">✓ Subscribed</span>
            <button
              onClick={unsubscribe}
              disabled={saving}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Unsubscribe
            </button>
          </div>
        ) : (
          <button
            onClick={requestAndSubscribe}
            disabled={saving}
            className="bg-[#e44332] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#c0392b] disabled:opacity-50 transition-colors"
          >
            {saving ? "Requesting…" : "Enable push notifications"}
          </button>
        )}
      </div>

      {/* Test notification */}
      {subscribed && (
        <div>
          <button
            onClick={sendTest}
            disabled={testing}
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? "Sending…" : "Send test notification"}
          </button>
          {testResult && (
            <p className="text-xs text-gray-500 mt-2">{testResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
