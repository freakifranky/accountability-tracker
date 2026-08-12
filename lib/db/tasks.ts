import { v4 as uuidv4 } from "uuid";
import { readDb, mutateDb } from "./store";
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
  let created: Task;
  await mutateDb((db) => {
    created = {
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
      source: input.source ?? "manual",
      sourceUrl: input.sourceUrl ?? null,
      sourceId: input.sourceId ?? null,
      contentType: input.contentType ?? null,
    };
    return { ...db, tasks: [...db.tasks, created] };
  });
  return created!;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  let result: Task | null = null;
  await mutateDb((db) => {
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      result = null;
      return db;
    }
    const prev = db.tasks[idx];
    const updated: Task = {
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
    result = updated;
    const tasks = [...db.tasks];
    tasks[idx] = updated;
    return { ...db, tasks };
  });
  return result;
}

export async function deleteTask(id: string): Promise<boolean> {
  let deleted = false;
  await mutateDb((db) => {
    const before = db.tasks.length;
    const tasks = db.tasks.filter((t) => t.id !== id);
    deleted = tasks.length < before;
    return { ...db, tasks };
  });
  return deleted;
}

// Batched capture write: dedups against existing tasks by sourceId, then writes
// all new items in ONE mutateDb cycle instead of one createTask() per item —
// avoids N separate read-modify-write round trips (and N separate race windows)
// for a single poll run. Returns only the tasks that were actually created
// (items whose sourceId already exists are silently skipped as duplicates).
export async function createCapturedTasksBatch(
  inputs: CreateTaskInput[]
): Promise<Task[]> {
  let createdTasks: Task[] = [];
  await mutateDb((db) => {
    const existingSourceIds = new Set(db.tasks.map((t) => t.sourceId).filter(Boolean));
    createdTasks = [];
    const newTasks: Task[] = [];
    for (const input of inputs) {
      if (input.sourceId && existingSourceIds.has(input.sourceId)) continue; // duplicate, skip
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
        source: input.source ?? "chrome-tab",
        sourceUrl: input.sourceUrl ?? null,
        sourceId: input.sourceId ?? null,
        contentType: input.contentType ?? null,
      };
      newTasks.push(task);
      if (input.sourceId) existingSourceIds.add(input.sourceId); // guard against dupes within the same batch too
    }
    createdTasks = newTasks;
    return { ...db, tasks: [...db.tasks, ...newTasks] };
  });
  return createdTasks;
}