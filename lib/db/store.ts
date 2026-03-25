import type { Goal, CheckIn, Task, PushSubscriptionRecord, NotificationSettings } from "../types";

export interface DbData {
  goals: Goal[];
  checkins: CheckIn[];
  tasks: Task[];
  pushSubscriptions: PushSubscriptionRecord[];
  notificationSettings: NotificationSettings;
}

function defaultDb(): DbData {
  return {
    goals: [],
    checkins: [],
    tasks: [],
    pushSubscriptions: [],
    notificationSettings: { enabled: false, reminderTime: "09:00", days: [], lastNotifiedDate: null },
  };
}

function migrateData(data: Partial<DbData>): DbData {
  const base = defaultDb();
  const merged: DbData = { ...base, ...data };
  // Normalize recurrence on old tasks
  merged.tasks = merged.tasks.map((t) => ({ ...t, recurrence: t.recurrence ?? "none" }));
  return merged;
}

// --- Upstash Redis (production / Vercel) ---
async function redisRead(): Promise<DbData> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  const data = await redis.get<DbData>("accountability-db");
  if (!data) return defaultDb();
  return migrateData(data);
}

async function redisWrite(data: DbData): Promise<void> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  await redis.set("accountability-db", data);
}

// --- File system (local dev only) ---
async function fileRead(): Promise<DbData> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const DB_PATH = path.default.join(process.cwd(), "data", "db.json");
    if (!fs.default.existsSync(DB_PATH)) return defaultDb();
    const raw = fs.default.readFileSync(DB_PATH, "utf-8");
    return migrateData(JSON.parse(raw) as Partial<DbData>);
  } catch {
    return defaultDb();
  }
}

async function fileWrite(data: DbData): Promise<void> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const DB_PATH = path.default.join(process.cwd(), "data", "db.json");
    const dir = path.default.dirname(DB_PATH);
    if (!fs.default.existsSync(dir)) fs.default.mkdirSync(dir, { recursive: true });
    fs.default.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Filesystem is read-only (Vercel production without Redis configured).
    // Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
    console.warn("[db] Write skipped: filesystem is read-only. Configure Upstash Redis for persistent storage.");
  }
}

const useRedis = !!process.env.UPSTASH_REDIS_REST_URL;

export async function readDb(): Promise<DbData> {
  return useRedis ? redisRead() : fileRead();
}

export async function writeDb(data: DbData): Promise<void> {
  return useRedis ? redisWrite(data) : fileWrite(data);
}