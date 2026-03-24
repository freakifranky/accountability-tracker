import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/db/tasks";

export async function GET() {
  return NextResponse.json(getAllTasks());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, goalId, dueDate, priority } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const task = createTask({ title: title.trim(), goalId, dueDate, priority });
  return NextResponse.json(task, { status: 201 });
}
