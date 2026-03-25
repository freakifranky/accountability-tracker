import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { Goal, CreateGoalInput, UpdateGoalInput } from "../types";

export async function getAllGoals(includeArchived = false): Promise<Goal[]> {
  const db = await readDb();
  if (includeArchived) return db.goals;
  return db.goals.filter((g) => g.archivedAt === null);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const db = await readDb();
  return db.goals.find((g) => g.id === id) ?? null;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const db = await readDb();
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
  await writeDb(db);
  return goal;
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal | null> {
  const db = await readDb();
  const idx = db.goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  db.goals[idx] = {
    ...db.goals[idx],
    ...input,
    description: input.description !== undefined ? (input.description || null) : db.goals[idx].description,
    deadline: input.deadline !== undefined ? (input.deadline || null) : db.goals[idx].deadline,
  };
  await writeDb(db);
  return db.goals[idx];
}

export async function toggleArchiveGoal(id: string): Promise<Goal | null> {
  const db = await readDb();
  const idx = db.goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  db.goals[idx] = {
    ...db.goals[idx],
    archivedAt: db.goals[idx].archivedAt ? null : new Date().toISOString(),
  };
  await writeDb(db);
  return db.goals[idx];
}

export async function deleteGoal(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.goals.length;
  db.goals = db.goals.filter((g) => g.id !== id);
  db.checkins = db.checkins.filter((c) => c.goalId !== id);
  await writeDb(db);
  return db.goals.length < before;
}
