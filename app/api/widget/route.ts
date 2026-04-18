import { NextResponse } from "next/server";
import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { calculateStreak } from "@/lib/calculations/streak";
import { format } from "date-fns";

export async function GET() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const goals = await getAllGoals(false);

  const goalData = await Promise.all(
    goals.map(async (goal) => {
      const checkins = await getCheckinsByGoalId(goal.id);
      const streak = calculateStreak(checkins, today);
      const completedToday = checkins.some((c) => c.date === todayStr && c.completed);
      return { id: goal.id, name: goal.name, dailyAction: goal.dailyAction, streak, completedToday };
    })
  );

  const totalStreak = goalData.reduce((sum, g) => sum + g.streak, 0);
  const todayComplete = goalData.filter((g) => g.completedToday).length;

  return NextResponse.json({
    totalStreak,
    todayComplete,
    totalGoals: goals.length,
    goals: goalData,
    date: todayStr,
  });
}
