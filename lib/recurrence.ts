import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns";
import type { RecurrenceRule } from "./types";

export function computeNextDueDate(dueDate: string | null, rule: RecurrenceRule): string {
  const base = dueDate ? parseISO(dueDate) : new Date();
  if (rule === "daily") return format(addDays(base, 1), "yyyy-MM-dd");
  if (rule === "weekly") return format(addWeeks(base, 1), "yyyy-MM-dd");
  if (rule === "monthly") return format(addMonths(base, 1), "yyyy-MM-dd");
  return format(addDays(base, 1), "yyyy-MM-dd");
}
