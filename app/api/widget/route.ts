import { NextResponse } from "next/server";
import { getAllTasks } from "@/lib/db/tasks";
import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getNotificationSettings } from "@/lib/db/push";
import { isTaskScheduledForDate, normalizeTaskCompletion, filterTasksForActiveGoals } from "@/lib/task-utils";
import { calculateStreak } from "@/lib/calculations/streak";
import { format } from "date-fns";

export async function GET() {
  const globalSettings = await getNotificationSettings();
  const tz = globalSettings.timezone ?? "UTC";

  let localDate: Date;
  try {
    localDate = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    localDate = new Date();
  }
  const todayStr = format(localDate, "yyyy-MM-dd");

  const activeGoals = await getAllGoals(false);
  const activeGoalIds = new Set(activeGoals.map((g) => g.id));
  const allTasks = await getAllTasks();
  // Same bug as the calendar page (app/calendar/page.tsx) had: without this,
  // archiving a goal never hides its tasks here — the widget would keep
  // surfacing tasks under goals the user already cleaned up.
  const visibleTasks = filterTasksForActiveGoals(allTasks, activeGoalIds);

  const todayTasks = visibleTasks
    .filter((t) => isTaskScheduledForDate(t, todayStr))
    .map((t) => normalizeTaskCompletion(t, todayStr, tz))
    .map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      priority: t.priority,
      // sourceUrl lets the widget's scrollable list open a captured link
      // directly instead of forcing every tap through "mark complete".
      sourceUrl: t.sourceUrl,
    }));

  const completed = todayTasks.filter((t) => t.completed).length;

  // Same "Top streak" the dashboard shows — reused here so the widget's streak
  // badge (added for the action-first redesign) means the same thing everywhere.
  const streaks = await Promise.all(
    activeGoals.map(async (goal) => {
      const checkins = await getCheckinsByGoalId(goal.id);
      return calculateStreak(checkins, localDate);
    })
  );
  const topStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

  return NextResponse.json({
    todayComplete: completed,
    totalTasks: todayTasks.length,
    tasks: todayTasks,
    topStreak,
    date: todayStr,
  });
}
