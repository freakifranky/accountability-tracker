import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { getNotificationSettings } from "@/lib/db/push";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import DashboardStats from "@/components/dashboard/DashboardStats";
import GoalList from "@/components/dashboard/GoalList";
import TodayTasks from "@/components/dashboard/TodayTasks";
import InstallBanner from "@/components/pwa/InstallBanner";
import NotificationNudge from "@/components/push/NotificationNudge";

export default async function DashboardPage() {
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
  const allTasks = await getAllTasks();

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

  // Show tasks that are actionable today: overdue, due today, or no due date.
  // Future-dated tasks are excluded so completing a recurring task doesn't
  // immediately resurface its next occurrence in today's list.
  // Also include today's completed tasks so the user can see what they've done.
  const tasksDueToday = allTasks.filter((t) => {
    if (!t.goalId || !activeGoalIds.has(t.goalId)) return false;
    if (t.completed) return t.dueDate === todayStr; // only show completed-today
    return !t.dueDate || t.dueDate <= todayStr;     // pending: no-date, today, or overdue
  });

  const completedToday = allTasks.filter((t) =>
    t.completed && t.dueDate === todayStr && t.goalId != null && activeGoalIds.has(t.goalId)
  ).length;
  const totalDueToday = allTasks.filter((t) =>
    !t.completed && t.goalId != null && activeGoalIds.has(t.goalId) &&
    (!t.dueDate || t.dueDate <= todayStr)
  ).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <InstallBanner />
      <NotificationNudge />
      <DashboardStats
        goals={activeGoals}
        completedToday={completedToday}
        totalTasksDueToday={totalDueToday}
      />
      <TodayTasks tasks={tasksDueToday} goals={allGoals} />
      <GoalList activeGoals={activeGoals} archivedGoals={archivedGoals} taskCountByGoal={taskCountByGoal} />
    </div>
  );
}