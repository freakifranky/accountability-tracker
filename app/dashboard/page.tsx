import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { getNotificationSettings } from "@/lib/db/push";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import { isTaskScheduledForDate, normalizeTaskCompletion } from "@/lib/task-utils";
import DashboardStats from "@/components/dashboard/DashboardStats";
import GoalList from "@/components/dashboard/GoalList";
import TodayTasks from "@/components/dashboard/TodayTasks";
import InstallBanner from "@/components/pwa/InstallBanner";
import NotificationNudge from "@/components/push/NotificationNudge";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  // Use stored timezone so server-side "today" matches the user's local date (not UTC)
  const settings = await getNotificationSettings();
  const tz = settings.timezone ?? "UTC";
  let localNow: Date;
  try {
    localNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    localNow = new Date();
  }
  const today = localNow;
  const todayStr = format(today, "yyyy-MM-dd");

  const allGoals = await getAllGoals(true);
  const allTasks = (await getAllTasks()).map((t) => normalizeTaskCompletion(t, todayStr, tz));

  const goalsWithStats: GoalWithStats[] = await Promise.all(
    allGoals.map(async (goal) => {
      const checkins = await getCheckinsByGoalId(goal.id);
      const streak = calculateStreak(checkins, today);
      const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
      const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
      return { ...goal, streak, commitmentRate, todayCheckin };
    })
  );

  const activeGoals = goalsWithStats.filter((g) => !g.archivedAt);
  const archivedGoals = goalsWithStats.filter((g) => g.archivedAt);

  const taskCountByGoal: Record<string, number> = {};
  allTasks.forEach((t) => {
    if (t.goalId && !t.completed) {
      taskCountByGoal[t.goalId] = (taskCountByGoal[t.goalId] ?? 0) + 1;
    }
  });

  const activeGoalIds = new Set(activeGoals.map((g) => g.id));

  const activeGoalTasksFromActiveGoals = (t: typeof allTasks[number]) =>
    !!(t.goalId && activeGoalIds.has(t.goalId));

  const tasksDueToday = allTasks.filter((t) => {
    if (!activeGoalTasksFromActiveGoals(t)) return false;
    if (t.recurrence !== "none") return isTaskScheduledForDate(t, todayStr); // habits: only on scheduled days
    if (t.completed) return t.dueDate === todayStr;                          // one-off done: only if today
    if (!t.dueDate) return true;                                             // no due date: always show
    return t.dueDate <= todayStr;                                            // one-off pending: today or overdue
  });

  const completedToday = tasksDueToday.filter((t) => t.completed).length;
  const totalDueToday = tasksDueToday.filter((t) => !t.completed).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <InstallBanner />
      <NotificationNudge />
      <DashboardStats
        goals={activeGoals}
        completedToday={completedToday}
        totalTasksDueToday={totalDueToday}
      />
      <TodayTasks tasks={tasksDueToday} goals={allGoals} initialAdding={action === "add-task"} />
      <GoalList activeGoals={activeGoals} archivedGoals={archivedGoals} taskCountByGoal={taskCountByGoal} highlightCheckin={action === "checkin"} />
    </div>
  );
}