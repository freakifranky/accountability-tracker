"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GoalWithStats } from "@/lib/types";
import GoalCard from "./GoalCard";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

interface GoalListProps {
  activeGoals: GoalWithStats[];
  archivedGoals: GoalWithStats[];
  taskCountByGoal: Record<string, number>;
}

export default function GoalList({ activeGoals, archivedGoals, taskCountByGoal }: GoalListProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  async function handleArchive(id: string) {
    await fetch(`/api/goals/${id}/archive`, { method: "POST" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active Goals</h2>
        <Link href="/goals/new" className="text-xs text-[#e44332] hover:underline font-medium py-2 px-1 -my-2">+ Add goal</Link>
      </div>

      {activeGoals.length === 0 ? (
        <EmptyState
          title="No active goals yet"
          description="Create your first goal to start building better habits."
          action={
            <Link href="/goals/new" className="bg-[#e44332] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#c0392b] transition-colors inline-block">
              + New Goal
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} taskCount={taskCountByGoal[goal.id] ?? 0} onArchive={handleArchive} />
          ))}
        </div>
      )}

      {archivedGoals.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1"
          >
            <span>{showArchived ? "▾" : "▸"}</span>
            Archived ({archivedGoals.length})
          </button>
          {showArchived && (
            <div className="space-y-2 mt-2">
              {archivedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} taskCount={taskCountByGoal[goal.id] ?? 0} onArchive={handleArchive} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
