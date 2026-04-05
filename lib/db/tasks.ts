import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
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
    recurrenceDays: input.recurrenceDays && input.recurrenceDays.length > 0 ? input.recurrenceDays : null,
    completed: false,
    completedAt: null,
    completionNote: null,
    completionMood: null,
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
    // Always refresh completedAt when completing so recurring tasks can be
    // re-completed on a new period (prev.completed may still be true from yesterday).
    completedAt:
      input.completed === true
        ? new Date().toISOString()
        : input.completed === false
        ? null
        : prev.completedAt,
  };
  await writeDb(db);
  return db.tasks[idx];
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== id);
  await writeDb(db);
  return db.tasks.length < before;
}