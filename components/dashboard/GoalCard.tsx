"use client";

import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

interface GoalCardProps {
  goal: GoalWithStats;
  onArchive: (id: string) => void;
}

export default function GoalCard({ goal, onArchive }: GoalCardProps) {
  const isOverdue = goal.deadline && !goal.archivedAt && isPast(parseISO(goal.deadline));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/goals/${goal.id}`}
              className="font-semibold text-gray-900 hover:text-gray-600 truncate"
            >
              {goal.name}
            </Link>
            {goal.archivedAt && <Badge variant="gray">Archived</Badge>}
            {isOverdue && <Badge variant="red">Overdue</Badge>}
            {goal.todayCheckin?.completed && <Badge variant="green">Done today</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{goal.dailyAction}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xl" title={`${goal.streak}-day streak`}>🔥</span>
          <span className="text-sm font-bold text-gray-700">{goal.streak}</span>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={goal.commitmentRate} label="Commitment rate" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>
          {goal.deadline ? `Due ${format(parseISO(goal.deadline), "MMM d, yyyy")}` : "No deadline"}
        </span>
        <div className="flex gap-3">
          <Link href={`/goals/${goal.id}`} className="hover:text-gray-700 transition-colors">
            View
          </Link>
          <button
            onClick={() => onArchive(goal.id)}
            className="hover:text-gray-700 transition-colors"
          >
            {goal.archivedAt ? "Unarchive" : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
