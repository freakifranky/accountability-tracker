import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { mutateDb } from "../store";
import type { DbData } from "../store";

// These tests exercise the file-backed store (no Redis env vars set here), which
// runs the identical mutateDb retry/version-check orchestration the Redis path
// uses in production — only the underlying compare-and-swap primitive differs
// (Lua script vs. a file read-check-write). This directly covers the eng
// review's "CRITICAL — concurrent write detected → retries and succeeds" test.
const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_PATH = DB_PATH + ".test-backup";

describe("mutateDb concurrency", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, BACKUP_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(BACKUP_PATH)) fs.renameSync(BACKUP_PATH, DB_PATH);
  });

  it("increments version on each successful mutation", async () => {
    const first = await mutateDb((db) => ({ ...db, goals: [...db.goals] }));
    expect(first.version).toBe(1);
    const second = await mutateDb((db) => ({ ...db, goals: [...db.goals] }));
    expect(second.version).toBe(2);
  });

  it("retries and succeeds when a conflicting write lands between read and write", async () => {
    let mutatorCallCount = 0;

    const result = await mutateDb((db) => {
      mutatorCallCount++;
      if (mutatorCallCount === 1) {
        // Simulate a concurrent writer (e.g. the capture job) landing in the
        // gap between our read and our write.
        const interloper: DbData = {
          ...db,
          version: db.version + 1,
          tasks: [...db.tasks, { id: "concurrent-task" } as DbData["tasks"][number]],
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(interloper, null, 2));
      }
      return { ...db, tasks: [...db.tasks, { id: "our-task" } as DbData["tasks"][number]] };
    });

    expect(mutatorCallCount).toBe(2); // first attempt hit a version conflict and had to retry
    const taskIds = result.tasks.map((t) => t.id);
    expect(taskIds).toContain("concurrent-task"); // the interloper's write survived
    expect(taskIds).toContain("our-task"); // our write landed too, on retry — neither was silently lost
  });

  it("throws after exhausting retries under a permanent conflict", async () => {
    await expect(
      mutateDb((db) => {
        // Every attempt, someone else "wins" the race first — a permanent conflict.
        fs.writeFileSync(DB_PATH, JSON.stringify({ ...db, version: db.version + 1 }, null, 2));
        return db;
      }, 3)
    ).rejects.toThrow(/failed to write after 3 attempts/);
  });
});
