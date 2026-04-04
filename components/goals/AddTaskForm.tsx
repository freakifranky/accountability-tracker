"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal, Priority, RecurrenceRule } from "@/lib/types";

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
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function AddTaskForm({ goalId, goals, defaultDueDate, onClose }: AddTaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [priority, setPriority] = useState<Priority>(4);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [saving, setSaving] = useState(false);

  const activeGoals = goals?.filter((g) => !g.archivedAt) ?? [];
  const [selectedGoalId, setSelectedGoalId] = useState(activeGoals[0]?.id ?? "");

  // When called from a goal page, goalId is set. From dashboard, use the selector.
  const resolvedGoalId = goalId ?? (selectedGoalId || undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
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
      }),
    });
    setSaving(false);
    setTitle("");
    setDueDate(defaultDueDate ?? "");
    setPriority(4);
    setRecurrence("none");
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
          onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-400"
        >
          {RECURRENCE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving || !title.trim()}
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
