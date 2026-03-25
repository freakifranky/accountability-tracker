import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import DashboardStats from "@/components/dashboard/DashboardStats";
import GoalList from "@/components/dashboard/GoalList";
import TodayTasks from "@/components/dashboard/TodayTasks";

export default async function DashboardPage() {
  const today = new Date();
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

  const tasksDueToday = allTasks.filter((t) => t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr && !t.completed));
  const completedToday = tasksDueToday.filter((t) => t.completed && t.dueDate === todayStr).length;
  const totalDueToday = allTasks.filter((t) => t.dueDate === todayStr).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
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