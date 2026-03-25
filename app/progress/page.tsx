import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { calculateStreak } from "@/lib/calculations/streak";
import { calculateCommitmentRate } from "@/lib/calculations/commitmentRate";
import { format, subDays, eachDayOfInterval } from "date-fns";
import ProgressView from "@/components/progress/ProgressView";
import type { GoalWithStats } from "@/lib/types";

export default async function ProgressPage() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const goals = await getAllGoals(false);
  const allTasks = await getAllTasks();

  const goalsWithStats: GoalWithStats[] = await Promise.all(
    goals.map(async (goal) => {
      const checkins = await getCheckinsByGoalId(goal.id);
      const streak = calculateStreak(checkins, today);
      const commitmentRate = calculateCommitmentRate(checkins, goal.createdAt, today);
      const todayCheckin = checkins.find((c) => c.date === todayStr) ?? null;
      return { ...goal, streak, commitmentRate, todayCheckin };
    })
  );

  // Build last 4 weeks of check-in data for bar chart
  const last28Days = eachDayOfInterval({ start: subDays(today, 27), end: today });
  const checkinsByDate: Record<string, number> = {};
  for (const day of last28Days) {
    checkinsByDate[format(day, "yyyy-MM-dd")] = 0;
  }
  for (const goal of goals) {
    const checkins = await getCheckinsByGoalId(goal.id);
    for (const c of checkins) {
      if (c.completed && checkinsByDate[c.date] !== undefined) {
        checkinsByDate[c.date]++;
      }
    }
  }

  // Weekly rollup (last 4 weeks)
  const weeks: { label: string; count: number; possible: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekDays = last28Days.slice(w === 0 ? 21 : w === 1 ? 14 : w === 2 ? 7 : 0, w === 0 ? 28 : w === 1 ? 21 : w === 2 ? 14 : 7);
    const count = weekDays.reduce((s, d) => s + (checkinsByDate[format(d, "yyyy-MM-dd")] ?? 0), 0);
    const possible = weekDays.length * goals.length;
    weeks.push({ label: `W${4 - w}`, count, possible });
  }

  // Karma score: weighted sum of streaks + commitment rates
  const karmaScore = goalsWithStats.reduce((sum, g) => sum + g.streak * 10 + g.commitmentRate * 2, 0);
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const totalTasks = allTasks.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Progress</h1>
      <ProgressView
        goals={goalsWithStats}
        weeks={weeks}
        dailyData={checkinsByDate}
        karmaScore={karmaScore}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        last28Days={last28Days.map((d) => format(d, "yyyy-MM-dd"))}
      />
    </div>
  );
}