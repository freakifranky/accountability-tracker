import { subDays, format, parseISO, isEqual } from "date-fns";
import type { CheckIn } from "../types";

/**
 * Calculate the current streak for a goal.
 * Grace period: if today has no check-in yet, we start from yesterday
 * so the streak isn't broken until the day is over.
 */
export function calculateStreak(checkins: CheckIn[], today: Date = new Date()): number {
  const completedDates = new Set(
    checkins.filter((c) => c.completed).map((c) => c.date)
  );

  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  // Start from today if checked in, otherwise from yesterday (grace period)
  const startDate = completedDates.has(todayStr) ? today : subDays(today, 1);

  let streak = 0;
  let current = startDate;

  while (true) {
    const dateStr = format(current, "yyyy-MM-dd");
    if (completedDates.has(dateStr)) {
      streak++;
      current = subDays(current, 1);
    } else {
      break;
    }
  }

  return streak;
}
