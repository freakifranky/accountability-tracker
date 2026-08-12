import type { Goal, CheckIn, Task, PushSubscriptionRecord, NotificationSettings, GoalNotificationSettings } from "../types";

export interface DbData {
  version: number; // incremented on every write; backs optimistic concurrency in mutateDb()
  goals: Goal[];
  checkins: CheckIn[];
  tasks: Task[];
  pushSubscriptions: PushSubscriptionRecord[];
  notificationSettings: NotificationSettings;
  goalNotificationSettings: GoalNotificationSettings[];
}

function defaultDb(): DbData {
  return {
    version: 0,
    goals: [],
    checkins: [],
    tasks: [],
    pushSubscriptions: [],
    notificationSettings: { enabled: false, reminderTime: "09:00", days: [], lastNotifiedDate: null, timezone: null },
    goalNotificationSettings: [],
  };
}

function migrateData(data: Partial<DbData>): DbData {
  const base = defaultDb();
  const merged: DbData = { ...base, ...data };
  // Normalize recurrence on old tasks
  merged.tasks = merged.tasks.map((t) => ({
    ...t,
    recurrence: t.recurrence ?? "none",
    // Backfill capture fields on tasks written before they existed
    source: t.source ?? "manual",
    sourceUrl: t.sourceUrl ?? null,
    sourceId: t.sourceId ?? null,
    contentType: t.contentType ?? null,
  }));
  // Ensure goalNotificationSettings exists
  if (!merged.goalNotificationSettings) merged.goalNotificationSettings = [];
  if (typeof merged.version !== "number") merged.version = 0;
  return merged;
}

// Vercel Storage (Upstash) provides KV_REST_API_URL/TOKEN, direct Upstash uses UPSTASH_REDIS_REST_URL/TOKEN
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

// --- Upstash Redis (production / Vercel) ---
async function redisRead(): Promise<DbData> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url: redisUrl!, token: redisToken! });
  const data = await redis.get<DbData>("accountability-db");
  if (!data) return defaultDb();
  return migrateData(data);
}

async function redisWrite(data: DbData): Promise<void> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url: redisUrl!, token: redisToken! });
  await redis.set("accountability-db", data);
}

// Compare-and-swap write: only writes if the value currently stored still has
// `expectedVersion`. Atomic on the Redis server via a Lua script, so there's no
// read-then-write race window even across concurrent callers. Returns false
// (not an error) on a version mismatch — callers retry with fresh data.
async function redisWriteCAS(data: DbData, expectedVersion: number): Promise<boolean> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url: redisUrl!, token: redisToken! });
  const script = `
    local current = redis.call('GET', KEYS[1])
    local currentVersion = 0
    if current then
      local decoded = cjson.decode(current)
      if decoded.version then currentVersion = decoded.version end
    end
    if currentVersion == tonumber(ARGV[2]) then
      redis.call('SET', KEYS[1], ARGV[1])
      return 1
    else
      return 0
    end
  `;
  const result = await redis.eval(script, ["accountability-db"], [JSON.stringify(data), String(expectedVersion)]);
  return result === 1;
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
    console.warn("[db] Write skipped: filesystem is read-only. Configure Upstash Redis for persistent storage.");
  }
}

// Local dev only, single process — still technically racy under concurrent
// requests within that one process, but this path never runs in production
// (writeDb/mutateDb throw on Vercel without Redis configured), so it's an
// acceptable simplification rather than the real concurrency guarantee Redis gives.
async function fileWriteCAS(data: DbData, expectedVersion: number): Promise<boolean> {
  const current = await fileRead();
  if (current.version !== expectedVersion) return false;
  await fileWrite(data);
  return true;
}

const useRedis = !!(redisUrl && redisToken);

export async function readDb(): Promise<DbData> {
  return useRedis ? redisRead() : fileRead();
}

// Unconditional write — no concurrency protection. Prefer mutateDb() for any
// write that could race with another writer (interactive use vs. the capture job).
export async function writeDb(data: DbData): Promise<void> {
  if (!useRedis && process.env.VERCEL) {
    throw new Error(
      "No persistent storage configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your Vercel environment variables."
    );
  }
  data.version = (data.version ?? 0) + 1;
  return useRedis ? redisWrite(data) : fileWrite(data);
}

// Concurrency-safe read-mutate-write with retry on conflict. `mutator` receives
// the freshly-read db and returns the updated db; it may be called more than
// once if a concurrent writer wins the race, so it must be a pure function of
// its input (no side effects outside the returned object).
export async function mutateDb(mutator: (db: DbData) => DbData, maxRetries = 5): Promise<DbData> {
  if (!useRedis && process.env.VERCEL) {
    throw new Error(
      "No persistent storage configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your Vercel environment variables."
    );
  }
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = await readDb();
    const expectedVersion = current.version;
    const updated = mutator(current);
    updated.version = expectedVersion + 1;
    const success = useRedis
      ? await redisWriteCAS(updated, expectedVersion)
      : await fileWriteCAS(updated, expectedVersion);
    if (success) return updated;
    // Conflict: another writer updated the db between our read and write. Retry with fresh data.
  }
  throw new Error(`mutateDb: failed to write after ${maxRetries} attempts due to concurrent writes`);
}
