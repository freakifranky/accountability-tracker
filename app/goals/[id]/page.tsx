import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getGoalById } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getTasksByGoalId } from "@/lib/db/tasks";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import CheckInButton from "@/components/goals/CheckInButton";
import CompletionHeatmap from "@/components/goals/CompletionHeatmap";
import CheckInHistory from "@/components/goals/CheckInHistory";
import ProgressBar from "@/components/ui/ProgressBar";
import GoalTasksSection from "@/components/goals/GoalTasksSection";
import DeleteGoalButton from "@/components/goals/DeleteGoalButton";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) notFound();

  const checkins = await getCheckinsByGoalId(id);
  const tasks = await getTasksByGoalId(id);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const streak = calculateStreak(checkins, today);
  const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
  const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
  const totalDays = Math.max(1, Math.round((today.getTime() - parseISO(goal.createdAt).getTime()) / 86400000) + 1);
  const completedDays = checkins.filter((c) => c.completed).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Link href="/dashboard" className="text-xs text-gray-300 hover:text-gray-500">← Goals</Link>
              {goal.archivedAt && (
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Archived</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{goal.name}</h1>
            {goal.description && <p className="text-sm text-gray-400 mt-1">{goal.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                Daily: {goal.dailyAction}
              </span>
              {goal.deadline && (
                <span className="text-xs text-gray-400">
                  Due {format(parseISO(goal.deadline), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/goals/${goal.id}/edit`}
              className="text-xs text-gray-400 border border-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <DeleteGoalButton goalId={goal.id} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{streak}</p>
          <p className="text-xs text-gray-400 mt-0.5">Day streak 🔥</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${commitmentRate >= 75 ? "text-green-500" : commitmentRate >= 50 ? "text-yellow-500" : "text-[#e44332]"}`}>
            {commitmentRate}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Commitment</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{completedDays}</p>
          <p className="text-xs text-gray-400 mt-0.5">of {totalDays} days</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <ProgressBar value={commitmentRate} label="Overall commitment rate" size="md" />
      </div>

      {/* Today check-in */}
      {!goal.archivedAt && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today</h2>
          <CheckInButton goalId={goal.id} todayCheckin={todayCheckin} />
        </div>
      )}

      {/* Tasks */}
      <GoalTasksSection goalId={goal.id} tasks={tasks} />

      {/* Heatmap */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Last 12 Weeks</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <CompletionHeatmap checkins={checkins} />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Check-in History</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <CheckInHistory checkins={checkins} />
        </div>
      </div>
    </div>
  );
}