import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Task, CheckIn } from "../types";

export interface CaptureCallout {
  goalId: string;
  capturedCount: number;
  completedCount: number;
  carriedOverCount: number;
  message: string | null; // null = nothing captured this window, show no card at all
}

const CAPTURE_WINDOW_DAYS = 7; // "this week"
const CARRYOVER_HOURS = 48;

// Saved-vs-acted callout for auto-captured (source: "chrome-tab") tasks.
// Design review decision: if nothing was captured in the window, return
// message: null and render no card — silence reads as "nothing happened,"
// not "you failed" (the exact edge case flagged during design review).
export function buildCaptureCallout(
  goalId: string,
  tasks: Task[],
  today: Date = new Date()
): CaptureCallout {
  const goalTasks = tasks.filter((t) => t.goalId === goalId && t.source === "chrome-tab");
  const windowTasks = goalTasks.filter(
    (t) => differenceInCalendarDays(today, parseISO(t.createdAt)) <= CAPTURE_WINDOW_DAYS
  );

  const capturedCount = windowTasks.length;
  const completedCount = windowTasks.filter((t) => t.completed).length;
  const carriedOverCount = windowTasks.filter((t) => {
    if (t.completed) return false;
    const ageHours = (today.getTime() - parseISO(t.createdAt).getTime()) / 36e5;
    return ageHours > CARRYOVER_HOURS;
  }).length;

  if (capturedCount === 0) {
    return { goalId, capturedCount, completedCount, carriedOverCount, message: null };
  }

  const parts = [`${capturedCount} item${capturedCount === 1 ? "" : "s"} captured this week, ${completedCount} done`];
  if (carriedOverCount > 0) {
    parts.push(`${carriedOverCount} carried over from before`);
  }

  return { goalId, capturedCount, completedCount, carriedOverCount, message: parts.join(". ") + "." };
}

export interface StreakHonestyResult {
  streak: number;
  hollowCount: number; // completed check-ins with no note, in the lookback window
  windowSize: number;
  message: string | null; // null when there's nothing worth flagging
}

const HONESTY_LOOKBACK_DAYS = 7;
const MIN_STREAK_TO_FLAG = 3;
const MIN_HOLLOW_TO_FLAG = 3;

// Flags when a streak is being kept alive by minimum-effort taps rather than
// real engagement — the exact Duolingo failure mode Franky named: "I do the
// bare minimum click just to not break the chain." Uses the `note` field
// that CheckInButton.tsx already asks for on every completion ("How did it go
// today?") but that calculateStreak() in streak.ts never looks at — the
// honesty signal already exists in the data, this just stops throwing it away.
//
// Deliberately does NOT change the streak number itself or how it's computed —
// redefining an established, understood metric was explicitly rejected during
// design review. This is a second, independent signal shown alongside it.
export function buildStreakHonestyCheck(
  streak: number,
  checkins: CheckIn[],
  today: Date = new Date()
): StreakHonestyResult {
  const recentCompleted = checkins.filter(
    (c) => c.completed && differenceInCalendarDays(today, parseISO(c.date)) <= HONESTY_LOOKBACK_DAYS
  );
  const hollowCount = recentCompleted.filter((c) => !c.note?.trim()).length;

  if (streak < MIN_STREAK_TO_FLAG || hollowCount < MIN_HOLLOW_TO_FLAG) {
    return { streak, hollowCount, windowSize: recentCompleted.length, message: null };
  }

  return {
    streak,
    hollowCount,
    windowSize: recentCompleted.length,
    message: `${streak}-day streak, but ${hollowCount} of the last ${recentCompleted.length} check-ins had no note. Worth checking if this is real or just protecting the number.`,
  };
}
