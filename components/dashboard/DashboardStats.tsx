import type { GoalWithStats } from "@/lib/types";

interface DashboardStatsProps {
  goals: GoalWithStats[];
}

export default function DashboardStats({ goals: activeGoals }: DashboardStatsProps) {
  if (activeGoals.length === 0) return null;

  const avgRate =
    activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.commitmentRate, 0) / activeGoals.length)
      : 0;
  const longestStreak = Math.max(...activeGoals.map((g) => g.streak), 0);
  const doneToday = activeGoals.filter((g) => g.todayCheckin?.completed).length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { label: "Active goals", value: activeGoals.length },
        { label: "Avg. commitment", value: `${avgRate}%` },
        { label: "Longest streak", value: `${longestStreak} 🔥` },
      ].map((stat) => (
        <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
