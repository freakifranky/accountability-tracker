import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO, subDays, startOfWeek } from "date-fns";
import { getGoalById } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getTasksByGoalId } from "@/lib/db/tasks";
import { getNotificationSettings } from "@/lib/db/push";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import CheckInButton from "@/components/goals/CheckInButton";
import CompletionHeatmap from "@/components/goals/CompletionHeatmap";
import CheckInHistory from "@/components/goals/CheckInHistory";
import ProgressBar from "@/components/ui/ProgressBar";
import GoalTasksSection from "@/components/goals/GoalTasksSection";
import DailyProgress from "@/components/goals/DailyProgress";
import DeleteGoalButton from "@/components/goals/DeleteGoalButton";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) notFound();

  const settings = await getNotificationSettings();
  const tz = settings.timezone ?? "UTC";
  let localNow: Date;
  try {
    localNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    localNow = new Date();
  }

  const checkins = await getCheckinsByGoalId(id);
  const rawTasks = await getTasksByGoalId(id);
  const today = localNow;
  const todayStr = format(today, "yyyy-MM-dd");

  // Normalize recurring task completion: "completed" = completed in current period
  const tasks = rawTasks.map((t) => {
    if (t.recurrence === "none") return t;
    if (!t.completedAt) return { ...t, completed: false };
    let completedLocalDate: string;
    try {
      completedLocalDate = format(
        new Date(new Date(t.completedAt).toLocaleString("en-US", { timeZone: tz })),
        "yyyy-MM-dd"
      );
    } catch {
      completedLocalDate = format(new Date(t.completedAt), "yyyy-MM-dd");
    }
    let completedForPeriod: boolean;
    if (t.recurrence === "weekly") {
      const weekStart = format(startOfWeek(parseISO(todayStr), { weekStartsOn: 1 }), "yyyy-MM-dd");
      completedForPeriod = completedLocalDate >= weekStart && completedLocalDate <= todayStr;
    } else if (t.recurrence === "monthly") {
      completedForPeriod = completedLocalDate.startsWith(todayStr.substring(0, 7));
    } else {
      completedForPeriod = completedLocalDate === todayStr;
    }
    return { ...t, completed: completedForPeriod };
  });

  const streak = calculateStreak(checkins, today);
  const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
  const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
  const totalDays = Math.max(1, Math.round((today.getTime() - parseISO(goal.createdAt).getTime()) / 86400000) + 1);
  const completedDays = checkins.filter((c) => c.completed).length;

  // Build last-14-days progress entries
  const progressEntries = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const checkin = checkins.find((c) => c.date === dateStr);
    const tasksCompleted = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const localDate = format(
        new Date(new Date(t.completedAt).toLocaleString("en-US", { timeZone: tz })),
        "yyyy-MM-dd"
      );
      return localDate === dateStr;
    }).map((t) => t.title);
    return { date: dateStr, checkedIn: checkin?.completed ?? false, tasksCompleted };
  });

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

      {/* Daily progress */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Daily Progress</h2>
        <div className="bg-white border border-gray-100 rounded-xl px-4">
          <DailyProgress entries={progressEntries} />
        </div>
      </div>

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