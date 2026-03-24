import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CheckIn } from "../types";

/**
 * Calculate the commitment rate as a percentage (0–100).
 * rate = completedCheckIns / daysSinceCreation * 100
 * Missed days naturally lower the score.
 */
export function calculateCommitmentRate(
  checkins: CheckIn[],
  goalCreatedAt: string,
  today: Date = new Date()
): number {
  const createdDate = parseISO(goalCreatedAt);
  const daysSinceCreation = differenceInCalendarDays(today, createdDate) + 1;

  if (daysSinceCreation <= 0) return 100;

  const completedCount = checkins.filter((c) => c.completed).length;
  const rate = (completedCount / daysSinceCreation) * 100;
  return Math.min(100, Math.round(rate));
}
