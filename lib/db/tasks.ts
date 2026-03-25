import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import { computeNextDueDate } from "../recurrence";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../types";

export async function getAllTasks(): Promise<Task[]> {
  const db = await readDb();
  return db.tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.priority - b.priority;
  });
}

export async function getTasksByGoalId(goalId: string): Promise<Task[]> {
  const db = await readDb();
  return db.tasks
    .filter((t) => t.goalId === goalId)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.priority - b.priority;
    });
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const db = await readDb();
  return db.tasks.filter((t) => t.dueDate === date);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await readDb();
  return db.tasks.find((t) => t.id === id) ?? null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await readDb();
  const task: Task = {
    id: uuidv4(),
    goalId: input.goalId ?? null,
    title: input.title,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? 4,
    recurrence: input.recurrence ?? "none",
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(task);
  await writeDb(db);
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const db = await readDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const prev = db.tasks[idx];
  db.tasks[idx] = {
    ...prev,
    ...input,
    completedAt:
      input.completed === true && !prev.completed
        ? new Date().toISOString()
        : input.completed === false
        ? null
        : prev.completedAt,
  };
  await writeDb(db);
  const updated = db.tasks[idx];

  // Spawn next occurrence when a recurring task is completed
  if (input.completed === true && !prev.completed && updated.recurrence !== "none") {
    await createTask({
      goalId: updated.goalId ?? undefined,
      title: updated.title,
      priority: updated.priority,
      recurrence: updated.recurrence,
      dueDate: computeNextDueDate(updated.dueDate, updated.recurrence),
    });
  }

  return updated;
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== id);
  await writeDb(db);
  return db.tasks.length < before;
}