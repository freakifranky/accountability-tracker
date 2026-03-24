"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { CheckIn } from "@/lib/types";

interface CheckInButtonProps {
  goalId: string;
  todayCheckin: CheckIn | null;
}

export default function CheckInButton({ goalId, todayCheckin }: CheckInButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(todayCheckin?.note ?? "");
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isDone = todayCheckin?.completed === true;
  const isSkipped = todayCheckin?.completed === false;

  async function submit(completed: boolean) {
    setSaving(true);
    await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, date: todayStr, completed, note: note.trim() || undefined }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {isDone ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-green-600 font-semibold text-sm">✓ Checked in today</span>
            <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">edit</button>
          </div>
        ) : isSkipped ? (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-500 text-sm">Skipped today</span>
            <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">edit</button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="bg-[#e44332] text-white font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-[#c0392b] transition-colors"
          >
            Check in today
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">How did it go today?</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional note…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none bg-white"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "✓ Done"}
        </button>
        <button
          onClick={() => submit(false)}
          disabled={saving}
          className="bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
        >
          Skip today
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-400 px-3 py-2 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
