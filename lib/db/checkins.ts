import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { CheckIn, UpsertCheckinInput } from "../types";

export function getCheckinsByGoalId(goalId: string): CheckIn[] {
  const db = readDb();
  return db.checkins
    .filter((c) => c.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function upsertCheckin(input: UpsertCheckinInput): CheckIn {
  const db = readDb();
  const existing = db.checkins.findIndex(
    (c) => c.goalId === input.goalId && c.date === input.date
  );
  if (existing !== -1) {
    db.checkins[existing] = {
      ...db.checkins[existing],
      completed: input.completed,
      note: input.note ?? null,
    };
    writeDb(db);
    return db.checkins[existing];
  }
  const checkin: CheckIn = {
    id: uuidv4(),
    goalId: input.goalId,
    date: input.date,
    completed: input.completed,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  };
  db.checkins.push(checkin);
  writeDb(db);
  return checkin;
}
