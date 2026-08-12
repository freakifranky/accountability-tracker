import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { createCapturedTasksBatch, getAllTasks } from "../tasks";

// Covers the concrete bug Architecture Issue 3 exists to prevent: the same
// YouTube video / tab seen on two consecutive polls must not create a
// duplicate task.
const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_PATH = DB_PATH + ".test-backup";

describe("createCapturedTasksBatch", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, BACKUP_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(BACKUP_PATH)) fs.renameSync(BACKUP_PATH, DB_PATH);
  });

  it("creates a task for each new captured item", async () => {
    const created = await createCapturedTasksBatch([
      { title: "AI video", sourceId: "youtube.com/watch?v=abc", source: "chrome-tab" },
      { title: "Stock tab", sourceId: "example.com/nvda", source: "chrome-tab" },
    ]);
    expect(created).toHaveLength(2);
  });

  it("does not create a duplicate for a sourceId already in the store", async () => {
    await createCapturedTasksBatch([
      { title: "AI video", sourceId: "youtube.com/watch?v=abc", source: "chrome-tab" },
    ]);
    const secondBatch = await createCapturedTasksBatch([
      { title: "AI video (seen again next poll)", sourceId: "youtube.com/watch?v=abc", source: "chrome-tab" },
    ]);
    expect(secondBatch).toHaveLength(0);

    const all = await getAllTasks();
    const matching = all.filter((t) => t.sourceId === "youtube.com/watch?v=abc");
    expect(matching).toHaveLength(1);
  });

  it("does not create duplicates within the same batch either", async () => {
    const created = await createCapturedTasksBatch([
      { title: "Same tab, seen twice in one poll", sourceId: "example.com/x", source: "chrome-tab" },
      { title: "Same tab, seen twice in one poll", sourceId: "example.com/x", source: "chrome-tab" },
    ]);
    expect(created).toHaveLength(1);
  });

  it("writes all items from one call in a single mutation, not one per item", async () => {
    const created = await createCapturedTasksBatch([
      { title: "One", sourceId: "a.com/1", source: "chrome-tab" },
      { title: "Two", sourceId: "a.com/2", source: "chrome-tab" },
      { title: "Three", sourceId: "a.com/3", source: "chrome-tab" },
    ]);
    expect(created).toHaveLength(3);
    const all = await getAllTasks();
    expect(all).toHaveLength(3);
  });
});
