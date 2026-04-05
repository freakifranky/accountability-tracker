import type { GoalWithStats } from "@/lib/types";
import { format } from "date-fns";

interface DashboardStatsProps {
  goals: GoalWithStats[];
  completedToday: number;
  totalTasksDueToday: number;
}

export default function DashboardStats({ goals, completedToday, totalTasksDueToday }: DashboardStatsProps) {
  const avgRate = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.commitmentRate, 0) / goals.length)
    : 0;
  const longestStreak = Math.max(...goals.map((g) => g.streak), 0);
  const checkedInToday = goals.filter((g) => g.todayCheckin?.completed).length;

  return (
    <div className="mb-6">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
        {format(new Date(), "EEEE, MMMM d")}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: goals.length === 0 ? "—" : `${checkedInToday}/${goals.length}`, label: "Goals today", accent: checkedInToday === goals.length && goals.length > 0 },
          { value: totalTasksDueToday === 0 && completedToday === 0 ? "—" : `${completedToday}/${completedToday + totalTasksDueToday}`, label: "Tasks today", accent: completedToday > 0 && totalTasksDueToday === 0 },
          { value: `${avgRate}%`, label: "Avg. commitment", accent: avgRate >= 75 },
          { value: `${longestStreak} 🔥`, label: "Top streak", accent: longestStreak >= 7 },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3.5">
            <p className={`text-2xl font-bold ${s.accent ? "text-[#e44332]" : "text-gray-900"}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
