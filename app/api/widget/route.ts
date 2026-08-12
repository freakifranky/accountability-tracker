import { NextResponse } from "next/server";
import { getAllTasks } from "@/lib/db/tasks";
import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getNotificationSettings } from "@/lib/db/push";
import { isTaskScheduledForDate, normalizeTaskCompletion } from "@/lib/task-utils";
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

  const allTasks = await getAllTasks();

  const todayTasks = allTasks
    .filter((t) => isTaskScheduledForDate(t, todayStr))
    .map((t) => normalizeTaskCompletion(t, todayStr, tz))
    .map((t) => ({ id: t.id, title: t.title, completed: t.completed, priority: t.priority }));

  const completed = todayTasks.filter((t) => t.completed).length;

  // Same "Top streak" the dashboard shows — reused here so the widget's streak
  // badge (added for the action-first redesign) means the same thing everywhere.
  const activeGoals = await getAllGoals(false);
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
