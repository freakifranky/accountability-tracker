import { format, getDay, parseISO, startOfWeek } from "date-fns";
import type { Task } from "./types";

/**
 * Returns true if a task should appear on a given calendar date.
 *
 * - Non-recurring: only on its dueDate
 * - Recurring: based on recurrence rule, respecting deadline (dueDate)
 */
export function isTaskScheduledForDate(task: Task, dateStr: string): boolean {
  if (task.recurrence === "none") {
    return task.dueDate === dateStr;
  }

  // Recurring task past its deadline — no longer shows
  if (task.dueDate && dateStr > task.dueDate) return false;

  const day = getDay(parseISO(dateStr)); // 0=Sun, 1=Mon … 6=Sat

  switch (task.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "weekly": {
      // Appears on the same day-of-week as when the task was created
      const createdDay = getDay(parseISO(task.createdAt.substring(0, 10)));
      return day === createdDay;
    }
    case "monthly": {
      // Appears on the same calendar date each month
      const createdDayOfMonth = new Date(task.createdAt).getDate();
      return parseISO(dateStr).getDate() === createdDayOfMonth;
    }
    case "custom": {
      // User-selected specific days (e.g. Mon/Wed/Fri = [1,3,5])
      if (!task.recurrenceDays || task.recurrenceDays.length === 0) return false;
      return task.recurrenceDays.includes(day);
    }
    default:
      return false;
  }
}

/**
 * For recurring tasks, "completed" means completed within the current period
 * (today for daily/weekday/weekend, this Mon-Sun for weekly, this month for monthly).
 * Uses completedAt timestamp, not the stored boolean (which never auto-resets).
 */
export function isCompletedForPeriod(task: Task, todayStr: string, tz: string): boolean {
  if (task.recurrence === "none") return task.completed;
  if (!task.completedAt) return false;

  let completedLocalDate: string;
  try {
    completedLocalDate = format(
      new Date(new Date(task.completedAt).toLocaleString("en-US", { timeZone: tz })),
      "yyyy-MM-dd"
    );
  } catch {
    completedLocalDate = format(new Date(task.completedAt), "yyyy-MM-dd");
  }

  if (task.recurrence === "weekly") {
    const weekStart = format(startOfWeek(parseISO(todayStr), { weekStartsOn: 1 }), "yyyy-MM-dd");
    return completedLocalDate >= weekStart && completedLocalDate <= todayStr;
  }
  if (task.recurrence === "monthly") {
    return completedLocalDate.startsWith(todayStr.substring(0, 7));
  }
  // daily, weekdays, weekends, custom — reset every scheduled day
  return completedLocalDate === todayStr;
}

/**
 * Returns a copy of the task with `completed` reflecting the current period state.
 * Pass raw DB tasks through this before rendering so the UI always shows today's truth.
 */
export function normalizeTaskCompletion(task: Task, todayStr: string, tz: string): Task {
  if (task.recurrence === "none") return task;
  return { ...task, completed: isCompletedForPeriod(task, todayStr, tz) };
}
