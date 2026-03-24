"use client";

import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
  addMonths, subMonths, parseISO, isPast,
} from "date-fns";
import type { Goal, Task } from "@/lib/types";
import clsx from "clsx";
import TaskItem from "@/components/goals/TaskItem";
import AddTaskForm from "@/components/goals/AddTaskForm";

interface CalendarViewProps {
  goals: Goal[];
  tasks: Task[];
  checkinMap: Record<string, string[]>; // date -> goalIds checked in
}

export default function CalendarView({ goals, tasks, checkinMap }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [addingTask, setAddingTask] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedStr = format(selectedDate, "yyyy-MM-dd");
  const tasksForSelected = tasks.filter((t) => t.dueDate === selectedStr);
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  const checkedInGoals = (checkinMap[selectedStr] ?? []).map((id) => goalMap[id]).filter(Boolean);

  function getDayDots(dateStr: string) {
    const checked = checkinMap[dateStr] ?? [];
    const hasTasks = tasks.some((t) => t.dueDate === dateStr);
    return { checked: checked.length, hasTasks };
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            ‹
          </button>
          <h2 className="text-sm font-semibold text-gray-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-300 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const { checked, hasTasks } = getDayDots(dateStr);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "relative flex flex-col items-center py-1.5 rounded-lg transition-colors",
                  isSelected ? "bg-[#e44332] text-white" : isTodayDate ? "bg-red-50 text-[#e44332]" : "hover:bg-gray-50",
                  !isCurrentMonth && "opacity-30"
                )}
              >
                <span className={clsx("text-xs font-medium", isSelected ? "text-white" : isTodayDate ? "text-[#e44332]" : "text-gray-700")}>
                  {format(day, "d")}
                </span>
                <div className="flex gap-0.5 mt-0.5 h-1">
                  {checked > 0 && (
                    <span className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-green-400")} />
                  )}
                  {hasTasks && (
                    <span className={clsx("w-1 h-1 rounded-full", isSelected ? "bg-white opacity-70" : "bg-blue-300")} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE, MMMM d")}
          </h3>
          <button
            onClick={() => setAddingTask(true)}
            className="text-xs text-[#e44332] hover:underline font-medium"
          >
            + Add task
          </button>
        </div>

        {/* Goals checked in */}
        {checkedInGoals.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2">Goals checked in</p>
            <div className="flex flex-wrap gap-1.5">
              {checkedInGoals.map((g) => (
                <span key={g.id} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
                  ✓ {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        {tasksForSelected.length > 0 && (
          <div className="mb-2">
            {checkedInGoals.length > 0 && <div className="border-t border-gray-50 mb-2" />}
            <p className="text-xs text-gray-400 mb-1">Tasks</p>
            {tasksForSelected.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                showGoal
                goalName={t.goalId ? goals.find((g) => g.id === t.goalId)?.name : undefined}
              />
            ))}
          </div>
        )}

        {tasksForSelected.length === 0 && checkedInGoals.length === 0 && !addingTask && (
          <p className="text-sm text-gray-300 text-center py-4">Nothing on this day</p>
        )}

        {addingTask && (
          <AddTaskForm
            defaultDueDate={selectedStr}
            onClose={() => setAddingTask(false)}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Goal check-in</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Task due</span>
      </div>
    </div>
  );
}
