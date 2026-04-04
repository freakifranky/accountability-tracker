"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Task } from "@/lib/types";
import TaskItem from "./TaskItem";
import AddTaskForm from "./AddTaskForm";

interface GoalTasksSectionProps {
  goalId: string;
  tasks: Task[];
}

export default function GoalTasksSection({ goalId, tasks }: GoalTasksSectionProps) {
  const [adding, setAdding] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Tasks</h2>
        <button onClick={() => setAdding(true)} className="text-xs text-[#e44332] hover:underline font-medium">
          + Add task
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl px-4">
        {pending.length === 0 && done.length === 0 && !adding ? (
          <p className="text-sm text-gray-300 py-4 text-center">No tasks yet — add milestones for this goal.</p>
        ) : (
          <>
            {pending.map((t) => <TaskItem key={t.id} task={t} />)}
            {done.length > 0 && pending.length > 0 && (
              <div className="border-t border-gray-50 my-1" />
            )}
            {done.map((t) => <TaskItem key={t.id} task={t} />)}
          </>
        )}

        {adding ? (
          <div className="py-2">
            <AddTaskForm goalId={goalId} defaultDueDate={todayStr} onClose={() => setAdding(false)} />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 py-3 transition-colors w-full"
          >
            <span className="text-base leading-none">+</span> Add task
          </button>
        )}
      </div>
    </div>
  );
}
