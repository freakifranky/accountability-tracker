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

  const habits = tasks.filter((t) => t.recurrence !== "none");
  const oneOffs = tasks.filter((t) => t.recurrence === "none");
  const oneOffPending = oneOffs.filter((t) => !t.completed);
  const oneOffDone = oneOffs.filter((t) => t.completed);

  const hasHabits = habits.length > 0;
  const hasOneOffs = oneOffs.length > 0;
  const isEmpty = tasks.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Tasks</h2>
        <button onClick={() => setAdding(true)} className="text-xs text-[#e44332] hover:underline font-medium">
          + Add task
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {isEmpty && !adding ? (
          <p className="text-sm text-gray-300 py-4 text-center px-4">No tasks yet — add habits or milestones for this goal.</p>
        ) : (
          <>
            {/* Habits section */}
            {hasHabits && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
                  ↻ Habits
                </p>
                <div className="px-4">
                  {habits.map((t) => <TaskItem key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {/* One-off tasks section */}
            {hasOneOffs && (
              <div>
                {hasHabits && <div className="border-t border-gray-50 mx-4 mt-1" />}
                {hasHabits && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
                    Tasks
                  </p>
                )}
                <div className="px-4">
                  {oneOffPending.map((t) => <TaskItem key={t.id} task={t} />)}
                  {oneOffDone.map((t) => <TaskItem key={t.id} task={t} />)}
                </div>
              </div>
            )}
          </>
        )}

        {adding ? (
          <div className="px-4 py-2">
            <AddTaskForm goalId={goalId} defaultDueDate={todayStr} onClose={() => setAdding(false)} />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 py-3 px-4 transition-colors w-full"
          >
            <span className="text-base leading-none">+</span> Add task
          </button>
        )}
      </div>
    </div>
  );
}
