"use client";

import { useState } from "react";
import type { Task, Goal } from "@/lib/types";
import TaskItem from "@/components/goals/TaskItem";
import AddTaskForm from "@/components/goals/AddTaskForm";
import { format } from "date-fns";

interface TodayTasksProps {
  tasks: Task[];
  goals: Goal[];
}

export default function TodayTasks({ tasks, goals }: TodayTasksProps) {
  const [adding, setAdding] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g.name]));

  const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
  const completedToday = tasks.filter((t) => t.completed && t.dueDate === todayStr);
  // "Pending" = everything not overdue and not completed: today, future-dated, and no-date
  const pending = tasks.filter((t) => !t.completed && !(t.dueDate && t.dueDate < todayStr));
  const completed = completedToday;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tasks</h2>
        <button onClick={() => setAdding(true)} className="text-xs text-[#e44332] hover:underline font-medium py-2 px-1 -my-2">
          + Add task
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
        {overdue.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-[#e44332] mb-1">Overdue</p>
            {overdue.map((t) => (
              <TaskItem key={t.id} task={t} showGoal goalName={t.goalId ? goalMap[t.goalId] : undefined} />
            ))}
          </div>
        )}

        <div className="px-4 py-2">
          {pending.length === 0 && !adding ? (
            <p className="text-sm text-gray-300 py-3 text-center">All tasks done — great work!</p>
          ) : (
            <>
              {pending.map((t) => (
                <TaskItem key={t.id} task={t} showGoal goalName={t.goalId ? goalMap[t.goalId] : undefined} />
              ))}
              {completed.map((t) => (
                <TaskItem key={t.id} task={t} showGoal goalName={t.goalId ? goalMap[t.goalId] : undefined} />
              ))}
            </>
          )}

          {adding ? (
            <div className="mt-1">
              <AddTaskForm defaultDueDate={todayStr} goals={goals} onClose={() => setAdding(false)} />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 py-2 transition-colors w-full"
            >
              <span className="text-base leading-none">+</span> Add task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
