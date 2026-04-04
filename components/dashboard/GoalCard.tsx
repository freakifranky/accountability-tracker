"use client";

import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import ProgressBar from "@/components/ui/ProgressBar";
import clsx from "clsx";

interface GoalCardProps {
  goal: GoalWithStats;
  taskCount: number;
  onArchive: (id: string) => void;
}

export default function GoalCard({ goal, taskCount, onArchive }: GoalCardProps) {
  const isOverdue = goal.deadline && !goal.archivedAt && isPast(parseISO(goal.deadline));
  const isDone = goal.todayCheckin?.completed === true;

  return (
    <div className={clsx(
      "bg-white border rounded-xl p-4 transition-all hover:shadow-sm",
      isDone ? "border-green-200" : "border-gray-100"
    )}>
      <div className="flex items-start gap-3">
        {/* Check-in status dot */}
        <div className={clsx(
          "mt-1 w-3 h-3 rounded-full shrink-0",
          isDone ? "bg-green-400" : "bg-gray-200"
        )} title={isDone ? "Checked in today" : "Not checked in yet"} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/goals/${goal.id}`}
              className="font-semibold text-gray-900 hover:text-[#e44332] transition-colors text-sm"
            >
              {goal.name}
            </Link>
            {goal.archivedAt && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Archived</span>
            )}
            {isOverdue && (
              <span className="text-xs text-[#e44332] bg-red-50 px-1.5 py-0.5 rounded">Overdue</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{goal.dailyAction}</p>

          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex-1">
              <ProgressBar value={goal.commitmentRate} showValue={false} />
            </div>
            <span className="text-xs font-semibold text-gray-500 shrink-0">{goal.commitmentRate}%</span>
            <span className="text-xs text-gray-500 shrink-0">🔥 {goal.streak}</span>
            {taskCount > 0 && (
              <span className="text-xs text-gray-400 shrink-0">{taskCount} task{taskCount > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
        <span className="text-xs text-gray-300">
          {goal.deadline ? `Due ${format(parseISO(goal.deadline), "MMM d")}` : "No deadline"}
        </span>
        <div className="flex gap-1">
          <Link href={`/goals/${goal.id}`} className="text-xs text-gray-400 hover:text-gray-700 transition-colors py-2 px-2 -my-2 rounded-md hover:bg-gray-50">
            Open
          </Link>
          <button
            onClick={() => onArchive(goal.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors py-2 px-2 -my-2 rounded-md hover:bg-red-50"
          >
            {goal.archivedAt ? "Unarchive" : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
