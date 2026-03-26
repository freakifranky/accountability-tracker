import { NextResponse } from "next/server";
import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { calculateStreak } from "@/lib/calculations/streak";
import { format } from "date-fns";

export async function GET() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const goals = await getAllGoals(false);

  let totalStreak = 0;
  let todayComplete = 0;

  await Promise.all(
    goals.map(async (goal) => {
      const checkins = await getCheckinsByGoalId(goal.id);
      totalStreak += calculateStreak(checkins, today);
      if (checkins.some((c) => c.date === todayStr && c.completed)) {
        todayComplete++;
      }
    })
  );

  return NextResponse.json({ totalStreak, todayComplete, totalGoals: goals.length });
}
