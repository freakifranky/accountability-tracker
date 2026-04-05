import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/db/tasks";

export async function GET() {
  return NextResponse.json(await getAllTasks());
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