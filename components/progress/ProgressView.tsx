"use client";

import { format, parseISO } from "date-fns";
import type { GoalWithStats } from "@/lib/types";
import ProgressBar from "@/components/ui/ProgressBar";
import Link from "next/link";
import clsx from "clsx";

interface WeekData { label: string; count: number; possible: number; }

interface ProgressViewProps {
  goals: GoalWithStats[];
  weeks: WeekData[];
  dailyData: Record<string, number>;
  karmaScore: number;
  completedTasks: number;
  totalTasks: number;
  last28Days: string[];
}

function KarmaRing({ score }: { score: number }) {
  const level = score < 100 ? "Beginner" : score < 300 ? "Novice" : score < 700 ? "Intermediate" : score < 1500 ? "Pro" : "Expert";
  const thresholds = [0, 100, 300, 700, 1500, 3000];
  const levelIdx = thresholds.findIndex((t, i) => score < (thresholds[i + 1] ?? Infinity));
  const nextThreshold = thresholds[levelIdx + 1] ?? thresholds[thresholds.length - 1];
  const prevThreshold = thresholds[levelIdx] ?? 0;
  const progress = Math.min(100, Math.round(((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100));

  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none" stroke="#e44332" strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-400">pts</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-800 mt-2">{level}</p>
      <p className="text-xs text-gray-400">{nextThreshold - score} pts to next level</p>
    </div>
  );
}

export default function ProgressView({ goals, weeks, dailyData, karmaScore, completedTasks, totalTasks, last28Days }: ProgressViewProps) {
  const maxWeekCount = Math.max(...weeks.map((w) => w.possible), 1);
  const maxDaily = Math.max(...Object.values(dailyData), 1);

  return (
    <div className="space-y-4">
      {/* Karma card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-6">
        <KarmaRing score={karmaScore} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Active goals</p>
            <p className="text-lg font-bold text-gray-900">{goals.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Tasks completed</p>
            <p className="text-lg font-bold text-gray-900">{completedTasks} <span className="text-sm font-normal text-gray-400">/ {totalTasks}</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Avg. commitment</p>
            <p className="text-lg font-bold text-gray-900">
              {goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.commitmentRate, 0) / goals.length) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Check-ins · Last 4 weeks</h3>
        <div className="flex items-end gap-2 h-24">
          {weeks.map((w) => {
            const pct = w.possible > 0 ? (w.count / w.possible) * 100 : 0;
            return (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400 font-medium">{w.count}</span>
                <div className="w-full bg-gray-100 rounded-t-sm relative" style={{ height: "60px" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#e44332] rounded-t-sm transition-all duration-500"
                    style={{ height: `${pct}%`, opacity: 0.85 }}
                  />
                </div>
                <span className="text-xs text-gray-400">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily activity (last 28 days as dots) */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Daily Activity · Last 28 days</h3>
        <div className="flex gap-1 flex-wrap">
          {last28Days.map((dateStr) => {
            const count = dailyData[dateStr] ?? 0;
            const intensity = count === 0 ? 0 : Math.min(4, Math.ceil((count / Math.max(goals.length, 1)) * 4));
            return (
              <div
                key={dateStr}
                title={`${format(parseISO(dateStr), "MMM d")}: ${count} check-in${count !== 1 ? "s" : ""}`}
                className={clsx("w-5 h-5 rounded-sm", {
                  "bg-gray-100": intensity === 0,
                  "bg-red-100": intensity === 1,
                  "bg-red-200": intensity === 2,
                  "bg-[#e44332] opacity-60": intensity === 3,
                  "bg-[#e44332]": intensity === 4,
                })}
              />
            );
          })}
        </div>
      </div>

      {/* Per-goal breakdown */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Goal Breakdown</h3>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-4">No active goals yet.</p>
        ) : (
          <div className="space-y-4">
            {goals
              .sort((a, b) => b.commitmentRate - a.commitmentRate)
              .map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Link href={`/goals/${goal.id}`} className="text-sm font-medium text-gray-700 hover:text-[#e44332] transition-colors">
                      {goal.name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>🔥 {goal.streak}</span>
                      <span className="font-semibold text-gray-600">{goal.commitmentRate}%</span>
                    </div>
                  </div>
                  <ProgressBar value={goal.commitmentRate} showValue={false} size="md" />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
