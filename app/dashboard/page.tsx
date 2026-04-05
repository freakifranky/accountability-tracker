import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { getNotificationSettings } from "@/lib/db/push";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format, parseISO, startOfWeek } from "date-fns";
import type { GoalWithStats, Task } from "@/lib/types";
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

  // For recurring tasks, "completed" means completed in the current period,
  // derived from completedAt timestamp — not the stored boolean (which never
  // resets automatically). This lets a daily habit appear fresh each morning.
  function normalizeTask(t: Task): Task {
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
  }

  const allGoals = await getAllGoals(true);
  const allTasks = (await getAllTasks()).map(normalizeTask);

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

  // One-off tasks are "actionable today" when: due today, overdue, or no due date.
  // Future-dated one-offs are hidden until their date arrives.
  const isOneOffActionableToday = (t: typeof allTasks[number]) => {
    if (!t.dueDate) return true;
    return t.dueDate <= todayStr;
  };

  const tasksDueToday = allTasks.filter((t) => {
    if (!activeGoalTasksFromActiveGoals(t)) return false;
    if (t.recurrence !== "none") return true;             // habits: always in today's list
    if (t.completed) return t.dueDate === todayStr;       // one-off done: only if today
    return isOneOffActionableToday(t);                    // one-off pending: today/overdue/no-date
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
      <TodayTasks tasks={tasksDueToday} goals={allGoals} />
      <GoalList activeGoals={activeGoals} archivedGoals={archivedGoals} taskCountByGoal={taskCountByGoal} />
    </div>
  );
}