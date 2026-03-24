import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { Goal, CreateGoalInput, UpdateGoalInput } from "../types";

export function getAllGoals(includeArchived = false): Goal[] {
  const db = readDb();
  if (includeArchived) return db.goals;
  return db.goals.filter((g) => g.archivedAt === null);
}

export function getGoalById(id: string): Goal | null {
  const db = readDb();
  return db.goals.find((g) => g.id === id) ?? null;
}

export function createGoal(input: CreateGoalInput): Goal {
  const db = readDb();
  const goal: Goal = {
    id: uuidv4(),
    name: input.name,
    description: input.description ?? null,
    deadline: input.deadline ?? null,
    dailyAction: input.dailyAction,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
  db.goals.push(goal);
  writeDb(db);
  return goal;
}

export function updateGoal(id: string, input: UpdateGoalInput): Goal | null {
  const db = readDb();
  const idx = db.goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  db.goals[idx] = {
    ...db.goals[idx],
    ...input,
    description: input.description !== undefined ? (input.description || null) : db.goals[idx].description,
    deadline: input.deadline !== undefined ? (input.deadline || null) : db.goals[idx].deadline,
  };
  writeDb(db);
  return db.goals[idx];
}

export function toggleArchiveGoal(id: string): Goal | null {
  const db = readDb();
  const idx = db.goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  db.goals[idx] = {
    ...db.goals[idx],
    archivedAt: db.goals[idx].archivedAt ? null : new Date().toISOString(),
  };
  writeDb(db);
  return db.goals[idx];
}

export function deleteGoal(id: string): boolean {
  const db = readDb();
  const before = db.goals.length;
  db.goals = db.goals.filter((g) => g.id !== id);
  db.checkins = db.checkins.filter((c) => c.goalId !== id);
  writeDb(db);
  return db.goals.length < before;
}
