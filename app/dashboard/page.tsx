import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import DashboardStats from "@/components/dashboard/DashboardStats";
import GoalList from "@/components/dashboard/GoalList";

async function getGoalsWithStats(archived: boolean): Promise<GoalWithStats[]> {
  const goals = getAllGoals(archived);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  return goals.map((goal) => {
    const checkins = getCheckinsByGoalId(goal.id);
    const streak = calculateStreak(checkins, today);
    const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
    const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
    return { ...goal, streak, commitmentRate, todayCheckin };
  });
}

export default async function DashboardPage() {
  const allGoals = await getGoalsWithStats(true);
  const activeGoals = allGoals.filter((g) => !g.archivedAt);
  const archivedGoals = allGoals.filter((g) => g.archivedAt);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Goals</h1>
      <DashboardStats goals={activeGoals} />
      <GoalList activeGoals={activeGoals} archivedGoals={archivedGoals} />
    </div>
  );
}
