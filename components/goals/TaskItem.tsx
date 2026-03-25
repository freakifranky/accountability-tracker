"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isPast, isToday } from "date-fns";
import type { Task } from "@/lib/types";
import PriorityDot from "@/components/ui/PriorityDot";
import clsx from "clsx";

interface TaskItemProps {
  task: Task;
  showGoal?: boolean;
  goalName?: string;
}

export default function TaskItem({ task, showGoal, goalName }: TaskItemProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleComplete() {
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    setLoading(false);
    router.refresh();
  }

  async function deleteTask() {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  const isOverdue = task.dueDate && !task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate));

  return (
    <div className={clsx("flex items-start gap-3 py-2.5 px-1 group rounded-lg hover:bg-gray-50 transition-colors", task.completed && "opacity-50")}>
      <button
        onClick={toggleComplete}
        disabled={loading}
        className={clsx(
          "mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center",
          task.completed
            ? "bg-gray-300 border-gray-300"
            : task.priority === 1
            ? "border-[#e44332] hover:bg-red-100"
            : task.priority === 2
            ? "border-orange-400 hover:bg-orange-50"
            : task.priority === 3
            ? "border-blue-400 hover:bg-blue-50"
            : "border-gray-300 hover:bg-gray-100"
        )}
      >
        {task.completed && <span className="text-white text-[8px] font-bold">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-sm text-gray-800 leading-snug", task.completed && "line-through text-gray-400")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.dueDate && (
            <span className={clsx("text-xs font-medium", isOverdue ? "text-[#e44332]" : isDueToday ? "text-green-600" : "text-gray-400")}>
              {isDueToday ? "Today" : isOverdue ? `Overdue · ${format(parseISO(task.dueDate), "MMM d")}` : format(parseISO(task.dueDate), "MMM d")}
            </span>
          )}
          {task.recurrence && task.recurrence !== "none" && (
            <span className="text-xs text-gray-400">↻ {task.recurrence}</span>
          )}
          {showGoal && goalName && (
            <span className="text-xs text-gray-400">#{goalName}</span>
          )}
        </div>
      </div>
      <button
        onClick={deleteTask}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all px-1"
      >
        ×
      </button>
    </div>
  );
}
