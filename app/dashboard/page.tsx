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

  const activeGoalTasksFromActiveGoals = (t: typeof allTasks[number]) =>
    !!(t.goalId && activeGoalIds.has(t.goalId));

  // A task is "actionable today" if:
  //   - recurring (shows every day regardless of its dueDate — users think of
  //     dueDate as the goal/deadline date, not the first-occurrence date), OR
  //   - due today or overdue, OR
  //   - no due date
  // Future one-off tasks (non-recurring, dueDate > today) are hidden until their date.
  const isActionableToday = (t: typeof allTasks[number]) => {
    if (t.recurrence !== "none") return true;      // recurring: always show
    if (!t.dueDate) return true;                   // no date: always show
    return t.dueDate <= todayStr;                  // one-off: today or overdue only
  };

  const tasksDueToday = allTasks.filter((t) => {
    if (!activeGoalTasksFromActiveGoals(t)) return false;
    if (t.completed) return t.dueDate === todayStr; // show completed-today only
    return isActionableToday(t);
  });

  const completedToday = allTasks.filter((t) =>
    t.completed && t.dueDate === todayStr && activeGoalTasksFromActiveGoals(t)
  ).length;
  const totalDueToday = allTasks.filter((t) =>
    !t.completed && activeGoalTasksFromActiveGoals(t) && isActionableToday(t)
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