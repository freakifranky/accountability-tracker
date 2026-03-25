import { v4 as uuidv4 } from "uuid";
import { readDb, writeDb } from "./store";
import type { PushSubscriptionRecord, NotificationSettings } from "../types";

export function getAllSubscriptions(): PushSubscriptionRecord[] {
  return readDb().pushSubscriptions;
}

export function saveSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): PushSubscriptionRecord {
  const db = readDb();
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
  writeDb(db);
  return record;
}

export function deleteSubscription(endpoint: string): void {
  const db = readDb();
  db.pushSubscriptions = db.pushSubscriptions.filter(
    (s) => s.subscription.endpoint !== endpoint
  );
  writeDb(db);
}

export function getNotificationSettings(): NotificationSettings {
  return readDb().notificationSettings;
}

export function updateNotificationSettings(
  patch: Partial<NotificationSettings>
): NotificationSettings {
  const db = readDb();
  db.notificationSettings = { ...db.notificationSettings, ...patch };
  writeDb(db);
  return db.notificationSettings;
}
