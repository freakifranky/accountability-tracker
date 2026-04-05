"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import type { Task } from "@/lib/types";
import clsx from "clsx";

interface TaskItemProps {
  task: Task;
  showGoal?: boolean;
  goalName?: string;
}

const MOODS = [
  { value: 1, emoji: "😔", label: "Hard" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😄", label: "Great" },
  { value: 5, emoji: "🔥", label: "Crushed it" },
];

export default function TaskItem({ task, showGoal, goalName }: TaskItemProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<number | null>(null);

  async function handleToggle() {
    if (task.completed) {
      // Un-ticking — no form needed
      setLoading(true);
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      });
      setLoading(false);
      router.refresh();
    } else {
      // Ticking — show the check-in form
      setShowCheckin(true);
    }
  }

  async function submitCheckin() {
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        completionNote: note.trim() || null,
        completionMood: mood,
      }),
    });
    setShowCheckin(false);
    setNote("");
    setMood(null);
    setLoading(false);
    router.refresh();
  }

  async function skipCheckin() {
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    setShowCheckin(false);
    setNote("");
    setMood(null);
    setLoading(false);
    router.refresh();
  }

  const isOverdue = task.dueDate && !task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate));
  const moodLabel = task.completionMood ? MOODS.find((m) => m.value === task.completionMood) : null;

  return (
    <div className="py-2.5 px-1">
      <div className={clsx("flex items-start gap-3 group rounded-lg hover:bg-gray-50 transition-colors", task.completed && "opacity-50")}>
        <button
          onClick={handleToggle}
          disabled={loading}
          className="mt-0.5 p-2 -m-2 shrink-0 flex items-center justify-center"
        >
          <span className={clsx(
            "w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center",
            task.completed
              ? "bg-gray-300 border-gray-300"
              : task.priority === 1
              ? "border-[#e44332] hover:bg-red-100"
              : task.priority === 2
              ? "border-orange-400 hover:bg-orange-50"
              : task.priority === 3
              ? "border-blue-400 hover:bg-blue-50"
              : "border-gray-300 hover:bg-gray-100"
          )}>
            {task.completed && <span className="text-white text-[8px] font-bold">✓</span>}
          </span>
        </button>
        <div className="flex-1 min-w-0">
          {task.goalId ? (
            <Link href={`/goals/${task.goalId}`} className={clsx("text-sm text-gray-800 leading-snug hover:text-[#e44332] transition-colors", task.completed && "line-through text-gray-400")}>
              {task.title}
            </Link>
          ) : (
            <p className={clsx("text-sm text-gray-800 leading-snug", task.completed && "line-through text-gray-400")}>
              {task.title}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.dueDate && (
              <span className={clsx("text-xs font-medium", isOverdue ? "text-[#e44332]" : isDueToday ? "text-green-600" : "text-gray-400")}>
                {isDueToday ? "Today" : isOverdue ? `Overdue · ${format(parseISO(task.dueDate), "MMM d")}` : format(parseISO(task.dueDate), "MMM d")}
              </span>
            )}
            {task.recurrence && task.recurrence !== "none" && (
              <span className="text-xs text-gray-400">
                ↻ {task.recurrence === "custom" && task.recurrenceDays
                  ? ["Su","M","Tu","W","Th","F","Sa"].filter((_, i) => task.recurrenceDays!.includes(i)).join("/")
                  : task.recurrence}
              </span>
            )}
            {showGoal && goalName && (
              <span className="text-xs text-gray-400">#{goalName}</span>
            )}
          </div>
          {/* Show mood + note from last completion */}
          {task.completed && (moodLabel || task.completionNote) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {moodLabel && <span className="text-sm" title={moodLabel.label}>{moodLabel.emoji}</span>}
              {task.completionNote && (
                <span className="text-xs text-gray-400 italic">{task.completionNote}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => fetch(`/api/tasks/${task.id}`, { method: "DELETE" }).then(() => router.refresh())}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all px-1"
        >
          ×
        </button>
      </div>

      {/* Inline check-in form */}
      {showCheckin && (
        <div className="mt-2 ml-7 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2.5">
          <p className="text-xs font-medium text-gray-600">How did it go?</p>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood((prev) => prev === m.value ? null : m.value)}
                title={m.label}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors text-base",
                  mood === m.value ? "bg-[#e44332]/10 ring-1 ring-[#e44332]" : "hover:bg-gray-100"
                )}
              >
                <span>{m.emoji}</span>
                <span className="text-[9px] text-gray-400 hidden sm:block">{m.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCheckin()}
            placeholder="Quick note (optional)"
            maxLength={120}
            className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-400"
          />
          <div className="flex gap-2">
            <button
              onClick={submitCheckin}
              disabled={loading}
              className="text-xs bg-[#e44332] text-white font-medium px-3 py-1.5 rounded-lg hover:bg-[#c0392b] disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              onClick={skipCheckin}
              disabled={loading}
              className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
