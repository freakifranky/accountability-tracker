import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getGoalById } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import CheckInButton from "@/components/goals/CheckInButton";
import CompletionHeatmap from "@/components/goals/CompletionHeatmap";
import CheckInHistory from "@/components/goals/CheckInHistory";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import DeleteGoalButton from "@/components/goals/DeleteGoalButton";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = getGoalById(id);
  if (!goal) notFound();

  const checkins = getCheckinsByGoalId(id);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const streak = calculateStreak(checkins, today);
  const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
  const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{goal.name}</h1>
              {goal.archivedAt && <Badge variant="gray">Archived</Badge>}
            </div>
            {goal.description && (
              <p className="text-gray-500 text-sm">{goal.description}</p>
            )}
            <p className="text-sm text-gray-600 mt-2 font-medium">
              Daily: <span className="text-gray-700 font-normal">{goal.dailyAction}</span>
            </p>
            {goal.deadline && (
              <p className="text-sm text-gray-400 mt-1">
                Deadline: {format(parseISO(goal.deadline), "MMMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/goals/${goal.id}/edit`}
              className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <DeleteGoalButton goalId={goal.id} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{streak} 🔥</p>
          <p className="text-xs text-gray-500 mt-1">Current streak</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <ProgressBar value={commitmentRate} label="Commitment rate" />
          <p className="text-xs text-gray-500 mt-2 text-center">
            {checkins.filter((c) => c.completed).length} of{" "}
            {Math.max(
              1,
              Math.round(
                (today.getTime() - parseISO(goal.createdAt).getTime()) / 86400000
              ) + 1
            )}{" "}
            days completed
          </p>
        </div>
      </div>

      {/* Today's check-in */}
      {!goal.archivedAt && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Today</h2>
          <CheckInButton goalId={goal.id} todayCheckin={todayCheckin} />
        </div>
      )}

      {/* Heatmap */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Last 12 weeks</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <CompletionHeatmap checkins={checkins} />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Check-in history</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <CheckInHistory checkins={checkins} />
        </div>
      </div>

      <div className="pt-2">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
