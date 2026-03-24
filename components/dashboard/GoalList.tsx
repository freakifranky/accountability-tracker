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
}

export default function GoalList({ activeGoals, archivedGoals }: GoalListProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  async function handleArchive(id: string) {
    await fetch(`/api/goals/${id}/archive`, { method: "POST" });
    router.refresh();
  }

  return (
    <div>
      {activeGoals.length === 0 ? (
        <EmptyState
          title="No active goals"
          description="Create your first goal to start tracking your commitment."
          action={
            <Link
              href="/goals/new"
              className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block"
            >
              + New Goal
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onArchive={handleArchive} />
          ))}
        </div>
      )}

      {archivedGoals.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <span>{showArchived ? "▾" : "▸"}</span>
            Archived goals ({archivedGoals.length})
          </button>
          {showArchived && (
            <div className="space-y-3 mt-3">
              {archivedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onArchive={handleArchive} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
