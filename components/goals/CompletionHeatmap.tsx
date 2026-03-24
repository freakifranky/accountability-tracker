"use client";

import { eachDayOfInterval, subWeeks, format, startOfWeek, parseISO } from "date-fns";
import clsx from "clsx";
import type { CheckIn } from "@/lib/types";

interface CompletionHeatmapProps {
  checkins: CheckIn[];
}

const WEEKS = 12;

export default function CompletionHeatmap({ checkins }: CompletionHeatmapProps) {
  const today = new Date();
  const start = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start, end: today });

  const checkinMap = new Map<string, boolean>();
  checkins.forEach((c) => checkinMap.set(c.date, c.completed));

  // Group into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const dayLabels = ["Mon", "Wed", "Fri"];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const status = checkinMap.has(dateStr)
                ? checkinMap.get(dateStr)
                  ? "done"
                  : "skipped"
                : "empty";
              const isToday = dateStr === format(today, "yyyy-MM-dd");

              return (
                <div
                  key={dateStr}
                  title={`${format(day, "MMM d, yyyy")}${status === "done" ? " ✓" : status === "skipped" ? " (skipped)" : ""}`}
                  className={clsx("w-3.5 h-3.5 rounded-sm", {
                    "bg-green-500": status === "done",
                    "bg-gray-300": status === "skipped",
                    "bg-gray-100": status === "empty",
                    "ring-1 ring-gray-500 ring-offset-1": isToday,
                  })}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Done</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" /> Skipped</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> No entry</span>
      </div>
    </div>
  );
}
