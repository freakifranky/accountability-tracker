import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { PushSubscriptionRecord, NotificationSettings, GoalNotificationSettings } from "../types";

export async function getAllSubscriptions(): Promise<PushSubscriptionRecord[]> {
  return (await readDb()).pushSubscriptions;
}

export async function saveSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushSubscriptionRecord> {
  const db = await readDb();
  const existingIdx = db.pushSubscriptions.findIndex(
    (s) => s.subscription.endpoint === sub.endpoint
  );
  const record: PushSubscriptionRecord = {
    id: existingIdx >= 0 ? db.pushSubscriptions[existingIdx].id : uuidv4(),
    subscription: sub,
    createdAt:
      existingIdx >= 0
        ? db.pushSubscriptions[existingIdx].createdAt
        : new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    db.pushSubscriptions[existingIdx] = record;
  } else {
    db.pushSubscriptions.push(record);
  }
  await writeDb(db);
  return record;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const db = await readDb();
  db.pushSubscriptions = db.pushSubscriptions.filter(
    (s) => s.subscription.endpoint !== endpoint
  );
  await writeDb(db);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return (await readDb()).notificationSettings;
}

export async function updateNotificationSettings(
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const db = await readDb();
  db.notificationSettings = { ...db.notificationSettings, ...patch };
  await writeDb(db);
  return db.notificationSettings;
}

function defaultGoalNotificationSettings(goalId: string): GoalNotificationSettings {
  return {
    goalId,
    enabled: false,
    reminderTime: "09:00",
    schedule: "daily",
    days: [],
    message: null,
    lastNotifiedDate: null,
  };
}

export async function getGoalNotificationSettings(goalId: string): Promise<GoalNotificationSettings> {
  const db = await readDb();
  return db.goalNotificationSettings.find((s) => s.goalId === goalId) ?? defaultGoalNotificationSettings(goalId);
}

export async function getAllGoalNotificationSettings(): Promise<GoalNotificationSettings[]> {
  return (await readDb()).goalNotificationSettings;
}

export async function updateGoalNotificationSettings(
  goalId: string,
  patch: Partial<Omit<GoalNotificationSettings, "goalId">>
): Promise<GoalNotificationSettings> {
  const db = await readDb();
  const idx = db.goalNotificationSettings.findIndex((s) => s.goalId === goalId);
  if (idx >= 0) {
    db.goalNotificationSettings[idx] = { ...db.goalNotificationSettings[idx], ...patch };
  } else {
    db.goalNotificationSettings.push({ ...defaultGoalNotificationSettings(goalId), ...patch });
  }
  await writeDb(db);
  return db.goalNotificationSettings.find((s) => s.goalId === goalId)!;
}