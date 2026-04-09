"use client";

import { useState, useEffect } from "react";
import type { GoalNotificationSettings, NotificationSchedule } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SCHEDULE_OPTIONS: { value: NotificationSchedule; label: string; hint: string }[] = [
  { value: "daily",    label: "Every day",   hint: "Mon – Sun" },
  { value: "weekdays", label: "Weekdays",    hint: "Mon – Fri" },
  { value: "weekends", label: "Weekends",    hint: "Sat – Sun" },
  { value: "custom",   label: "Custom days", hint: "Pick below" },
];

interface Props {
  goalId: string;
  goalName: string;
  dailyAction: string;
}

export default function GoalNotificationSettings({ goalId, goalName, dailyAction }: Props) {
  const [settings, setSettings] = useState<GoalNotificationSettings | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const pushSupported = typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    fetch(`/api/goals/${goalId}/notification`)
      .then((r) => r.json())
      .then((s: GoalNotificationSettings) => setSettings(s));

    if (pushSupported) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
      );
    }
  }, [goalId, pushSupported]);

  async function save(patch: Partial<GoalNotificationSettings>) {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSaving(true);
    await fetch(`/api/goals/${goalId}/notification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId }),
    });
    const data = await res.json();
    if (res.ok) {
      setTestResult(data.sent > 0 ? "Sent! Check for the notification." : "No active subscription found.");
    } else {
      setTestResult(data.error ?? "Failed to send.");
    }
    setTesting(false);
  }

  if (!vapidKey) return null;
  if (!pushSupported) return null;
  if (!settings) return <p className="text-xs text-gray-400">Loading…</p>;

  const autoMessage = `Don't forget: ${dailyAction}`;
  const effectiveDays =
    settings.schedule === "daily"    ? [0, 1, 2, 3, 4, 5, 6] :
    settings.schedule === "weekdays" ? [1, 2, 3, 4, 5] :
    settings.schedule === "weekends" ? [0, 6] :
    settings.days;

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Check-in reminder</p>
          <p className="text-xs text-gray-400">Get a push notification for this goal</p>
        </div>
        <button
          onClick={() => save({ enabled: !settings.enabled })}
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

      {!subscribed && settings.enabled && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Push notifications not enabled yet. Go to{" "}
          <a href="/settings" className="underline">Settings</a> to subscribe first.
        </p>
      )}

      {settings.enabled && (
        <>
          {/* Reminder time */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reminder time</label>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => save({ reminderTime: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Schedule preset */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Schedule</label>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => save({ schedule: opt.value })}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    settings.schedule === opt.value
                      ? "bg-[#e44332] text-white border-[#e44332]"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <span className="font-medium block">{opt.label}</span>
                  <span className={settings.schedule === opt.value ? "text-red-100" : "text-gray-400"}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom days picker */}
          {settings.schedule === "custom" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Days <span className="font-normal text-gray-400">(select at least one)</span>
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
                        save({ days: next });
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
          )}

          {/* Preview of effective days */}
          {settings.schedule !== "custom" && (
            <p className="text-xs text-gray-400">
              Notifying on: {effectiveDays.map((d) => DAYS[d]).join(", ")}
            </p>
          )}

          {/* Custom message */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Custom message <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={settings.message ?? ""}
              onChange={(e) => save({ message: e.target.value || null })}
              placeholder={autoMessage}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder:text-gray-300"
            />
            {!settings.message && (
              <p className="text-xs text-gray-400 mt-1">
                Auto: &ldquo;{autoMessage}&rdquo;
              </p>
            )}
          </div>

          {/* Test button */}
          {subscribed && (
            <div>
              <button
                onClick={sendTest}
                disabled={testing || saving}
                className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {testing ? "Sending…" : "Send test notification"}
              </button>
              {testResult && (
                <p className="text-xs text-gray-500 mt-1.5">{testResult}</p>
              )}
              {saving && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
