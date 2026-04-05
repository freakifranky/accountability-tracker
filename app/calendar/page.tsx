import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import { getNotificationSettings } from "@/lib/db/push";
import CalendarView from "@/components/calendar/CalendarView";
import { format } from "date-fns";
import { normalizeTaskCompletion } from "@/lib/task-utils";

export default async function CalendarPage() {
  const goals = await getAllGoals(false);
  const settings = await getNotificationSettings();
  const tz = settings.timezone ?? "UTC";
  let localNow: Date;
  try {
    localNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  } catch {
    localNow = new Date();
  }
  const todayStr = format(localNow, "yyyy-MM-dd");
  const rawTasks = await getAllTasks();
  const tasks = rawTasks.map((t) => normalizeTaskCompletion(t, todayStr, tz));

  // Build checkin map: date -> goalId[]
  const checkinMap: Record<string, string[]> = {};
  for (const goal of goals) {
    const checkins = await getCheckinsByGoalId(goal.id);
    for (const c of checkins) {
      if (c.completed) {
        if (!checkinMap[c.date]) checkinMap[c.date] = [];
        checkinMap[c.date].push(goal.id);
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Calendar</h1>
      <CalendarView goals={goals} tasks={tasks} checkinMap={checkinMap} />
    </div>
  );
}