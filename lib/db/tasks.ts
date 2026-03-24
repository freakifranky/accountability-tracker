import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../types";

export function getAllTasks(): Task[] {
  const db = readDb();
  return db.tasks.sort((a, b) => {
    // Sort: incomplete first, then by dueDate asc, then by priority asc
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.priority - b.priority;
  });
}

export function getTasksByGoalId(goalId: string): Task[] {
  const db = readDb();
  return db.tasks
    .filter((t) => t.goalId === goalId)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.priority - b.priority;
    });
}

export function getTasksByDate(date: string): Task[] {
  const db = readDb();
  return db.tasks.filter((t) => t.dueDate === date);
}

export function getTaskById(id: string): Task | null {
  const db = readDb();
  return db.tasks.find((t) => t.id === id) ?? null;
}

export function createTask(input: CreateTaskInput): Task {
  const db = readDb();
  const task: Task = {
    id: uuidv4(),
    goalId: input.goalId ?? null,
    title: input.title,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? 4,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(task);
  writeDb(db);
  return task;
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const db = readDb();
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
  writeDb(db);
  return db.tasks[idx];
}

export function deleteTask(id: string): boolean {
  const db = readDb();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== id);
  writeDb(db);
  return db.tasks.length < before;
}
