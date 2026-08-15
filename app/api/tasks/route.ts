import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/db/tasks";
import { getAllGoals } from "@/lib/db/goals";
import { filterTasksForActiveGoals } from "@/lib/task-utils";

// Nothing in the app currently calls this GET directly (pages read
// getAllTasks() themselves), but it's a public collection endpoint — filtering
// here too means any future caller (or a manual check like the one that found
// this bug) doesn't get tasks under archived goals by surprise.
export async function GET() {
  const [tasks, activeGoals] = await Promise.all([getAllTasks(), getAllGoals(false)]);
  const activeGoalIds = new Set(activeGoals.map((g) => g.id));
  return NextResponse.json(filterTasksForActiveGoals(tasks, activeGoalIds));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, goalId, dueDate, priority, recurrence, recurrenceDays } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const task = await createTask({ title: title.trim(), goalId, dueDate, priority, recurrence, recurrenceDays });
  return NextResponse.json(task, { status: 201 });
}