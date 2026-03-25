import fs from "fs";
import path from "path";
import type { Goal, CheckIn, Task, PushSubscriptionRecord, NotificationSettings } from "../types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

interface DbData {
  goals: Goal[];
  checkins: CheckIn[];
  tasks: Task[];
  pushSubscriptions: PushSubscriptionRecord[];
  notificationSettings: NotificationSettings;
}

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readDb(): DbData {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    return {
      goals: [],
      checkins: [],
      tasks: [],
      pushSubscriptions: [],
      notificationSettings: { enabled: false, reminderTime: "09:00", days: [], lastNotifiedDate: null },
    };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const data = JSON.parse(raw) as DbData;
  // migrations
  if (!data.tasks) data.tasks = [];
  if (!data.pushSubscriptions) data.pushSubscriptions = [];
  if (!data.notificationSettings) {
    data.notificationSettings = { enabled: false, reminderTime: "09:00", days: [], lastNotifiedDate: null };
  }
  // normalize recurrence on old tasks
  data.tasks = data.tasks.map((t) => ({ ...t, recurrence: t.recurrence ?? "none" }));
  return data;
}

export function writeDb(data: DbData): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}
