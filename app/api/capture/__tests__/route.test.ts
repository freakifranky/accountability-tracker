import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";
import { POST } from "../route";
import { createGoal } from "@/lib/db/goals";

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_PATH = DB_PATH + ".test-backup";

function requestWithItems(items: { title: string; url: string }[]): NextRequest {
  return { json: async () => ({ items }) } as unknown as NextRequest;
}

describe("POST /api/capture", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, BACKUP_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(BACKUP_PATH)) fs.renameSync(BACKUP_PATH, DB_PATH);
  });

  it("creates a standalone task (not discarded) when nothing matches an active goal", async () => {
    const res = await POST(
      requestWithItems([{ title: "A totally unrelated article", url: "https://example.com/article" }])
    );
    const data = await res.json();

    expect(data.created).toBe(1);
    expect(data.matched).toBe(0);
    expect(data.unsorted).toBe(1);
  });

  it("still auto-attaches to a matching active goal", async () => {
    await createGoal({ name: "Learning AI", dailyAction: "Read one article" });
    const res = await POST(
      requestWithItems([{ title: "GPT-5 coding agent walkthrough", url: "https://example.com/video" }])
    );
    const data = await res.json();

    expect(data.created).toBe(1);
    expect(data.matched).toBe(1);
    expect(data.unsorted).toBe(0);
  });
});
