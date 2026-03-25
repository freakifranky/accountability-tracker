import { getAllGoals } from "@/lib/db/goals";
import { getCheckinsByGoalId } from "@/lib/db/checkins";
import { getAllTasks } from "@/lib/db/tasks";
import CalendarView from "@/components/calendar/CalendarView";

export default async function CalendarPage() {
  const goals = await getAllGoals(false);
  const tasks = await getAllTasks();

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