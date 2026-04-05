"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal, Priority, RecurrenceRule } from "@/lib/types";
import clsx from "clsx";

interface AddTaskFormProps {
  goalId?: string;
  goals?: Goal[];        // active goals — shown as selector when no goalId provided
  defaultDueDate?: string;
  onClose?: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: "P1 Urgent" },
  { value: 2, label: "P2 High" },
  { value: 3, label: "P3 Medium" },
  { value: 4, label: "P4 None" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekends", label: "Weekends (Sat–Sun)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Specific days…" },
];

// Sun=0 Mon=1 … Sat=6, displayed Mon-first
const DAY_LABELS = [
  { day: 1, label: "M" },
  { day: 2, label: "T" },
  { day: 3, label: "W" },
  { day: 4, label: "T" },
  { day: 5, label: "F" },
  { day: 6, label: "S" },
  { day: 0, label: "S" },
];

export default function AddTaskForm({ goalId, goals, defaultDueDate, onClose }: AddTaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [priority, setPriority] = useState<Priority>(4);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const activeGoals = goals?.filter((g) => !g.archivedAt) ?? [];
  const [selectedGoalId, setSelectedGoalId] = useState(activeGoals[0]?.id ?? "");

  const resolvedGoalId = goalId ?? (selectedGoalId || undefined);

  function toggleDay(day: number) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const isCustomValid = recurrence !== "custom" || recurrenceDays.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !isCustomValid) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        goalId: resolvedGoalId,
        dueDate: dueDate || undefined,
        priority,
        recurrence,
        recurrenceDays: recurrence === "custom" ? recurrenceDays : undefined,
      }),
    });
    setSaving(false);
    setTitle("");
    setDueDate(defaultDueDate ?? "");
    setPriority(4);
    setRecurrence("none");
    setRecurrenceDays([]);
    router.refresh();
    onClose?.();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 shadow-sm">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task name"
        autoFocus
        className="w-full text-sm text-gray-800 placeholder-gray-400 outline-none"
      />
      {!goalId && activeGoals.length > 0 && (
        <select
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value)}
          className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-400 bg-white"
        >
          <option value="">— No goal —</option>
          {activeGoals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) as Priority)}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={recurrence}
          onChange={(e) => {
            setRecurrence(e.target.value as RecurrenceRule);
            setRecurrenceDays([]);
          }}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400"
        >
          {RECURRENCE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Day picker for custom recurrence */}
      {recurrence === "custom" && (
        <div className="space-y-1">
          <p className="text-xs text-gray-400">Repeat on</p>
          <div className="flex gap-1.5">
            {DAY_LABELS.map(({ day, label }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={clsx(
                  "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                  recurrenceDays.includes(day)
                    ? "bg-[#e44332] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {recurrenceDays.length === 0 && (
            <p className="text-xs text-[#e44332]">Pick at least one day</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving || !title.trim() || !isCustomValid}
          className="bg-[#e44332] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#c0392b] disabled:opacity-50 transition-colors"
        >
          {saving ? "Adding…" : "Add task"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
