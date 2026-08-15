import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { GET } from "../route";
import { createGoal, toggleArchiveGoal } from "@/lib/db/goals";
import { createTask } from "@/lib/db/tasks";

// Reproduces the exact production incident: a task under an archived goal
// (recurrence: "daily", so it's "due" every day forever) kept showing up on
// the widget after the goal was archived, because /api/widget never filtered
// by the parent goal's archive status — only the calendar page did.
const DB_PATH = path.join(process.cwd(), "data", "db.json");
const BACKUP_PATH = DB_PATH + ".test-backup";

describe("GET /api/widget", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, BACKUP_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(BACKUP_PATH)) fs.renameSync(BACKUP_PATH, DB_PATH);
  });

  it("excludes tasks whose parent goal has been archived (the production incident)", async () => {
    const goal = await createGoal({ name: "Healthier Lifestyle", dailyAction: "Workout" });
    const today = new Date().toISOString().slice(0, 10);
    await createTask({ title: "Daily Steps", goalId: goal.id, dueDate: today, recurrence: "daily" });

    const beforeArchive = await GET();
    const beforeData = await beforeArchive.json();
    expect(beforeData.tasks.map((t: { title: string }) => t.title)).toContain("Daily Steps");

    await toggleArchiveGoal(goal.id);

    const afterArchive = await GET();
    const afterData = await afterArchive.json();
    expect(afterData.tasks.map((t: { title: string }) => t.title)).not.toContain("Daily Steps");
    expect(afterData.totalTasks).toBe(0);
  });

  it("still shows standalone tasks (no goal) after unrelated goals are archived", async () => {
    const goal = await createGoal({ name: "Some Goal", dailyAction: "Do the thing" });
    await toggleArchiveGoal(goal.id);
    const today = new Date().toISOString().slice(0, 10);
    await createTask({ title: "Standalone reminder", dueDate: today });

    const res = await GET();
    const data = await res.json();
    expect(data.tasks.map((t: { title: string }) => t.title)).toContain("Standalone reminder");
  });
});
