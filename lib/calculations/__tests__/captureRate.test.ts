import { describe, it, expect } from "vitest";
import { buildCaptureCallout, buildStreakHonestyCheck } from "../captureRate";
import type { Task, CheckIn } from "@/lib/types";

const TODAY = new Date("2026-08-12T12:00:00.000Z");

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    goalId: "goal-1",
    title: "Watch something",
    dueDate: "2026-08-12",
    priority: 4,
    recurrence: "none",
    recurrenceDays: null,
    completed: false,
    completedAt: null,
    completionNote: null,
    completionMood: null,
    createdAt: "2026-08-12T08:00:00.000Z",
    source: "chrome-tab",
    sourceUrl: "https://example.com/a",
    sourceId: "example.com/a",
    contentType: "article",
    ...overrides,
  };
}

function makeCheckin(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "checkin-1",
    goalId: "goal-1",
    date: "2026-08-12",
    completed: true,
    note: null,
    createdAt: "2026-08-12T08:00:00.000Z",
    ...overrides,
  };
}

describe("buildCaptureCallout", () => {
  it("returns message: null when nothing was captured (design review zero-state decision)", () => {
    const result = buildCaptureCallout("goal-1", [], TODAY);
    expect(result.message).toBeNull();
    expect(result.capturedCount).toBe(0);
  });

  it("ignores manually-created tasks — only counts chrome-tab captures", () => {
    const manual = makeTask({ source: "manual" });
    const result = buildCaptureCallout("goal-1", [manual], TODAY);
    expect(result.capturedCount).toBe(0);
    expect(result.message).toBeNull();
  });

  it("ignores tasks belonging to a different goal", () => {
    const otherGoal = makeTask({ goalId: "other-goal" });
    const result = buildCaptureCallout("goal-1", [otherGoal], TODAY);
    expect(result.capturedCount).toBe(0);
  });

  it("reports captured vs completed counts", () => {
    const tasks = [
      makeTask({ id: "t1", completed: true }),
      makeTask({ id: "t2", completed: false }),
      makeTask({ id: "t3", completed: false }),
    ];
    const result = buildCaptureCallout("goal-1", tasks, TODAY);
    expect(result.capturedCount).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.message).toContain("3 items captured this week, 1 done");
  });

  it("flags items carried over past the 48-hour threshold", () => {
    const oldTask = makeTask({
      id: "old",
      completed: false,
      createdAt: "2026-08-09T08:00:00.000Z", // ~3 days before TODAY
    });
    const result = buildCaptureCallout("goal-1", [oldTask], TODAY);
    expect(result.carriedOverCount).toBe(1);
    expect(result.message).toContain("carried over");
  });

  it("does not count a completed old task as carried over", () => {
    const oldDone = makeTask({
      id: "old-done",
      completed: true,
      createdAt: "2026-08-09T08:00:00.000Z",
    });
    const result = buildCaptureCallout("goal-1", [oldDone], TODAY);
    expect(result.carriedOverCount).toBe(0);
  });

  it("excludes items outside the 7-day window", () => {
    const stale = makeTask({ createdAt: "2026-07-01T08:00:00.000Z" });
    const result = buildCaptureCallout("goal-1", [stale], TODAY);
    expect(result.capturedCount).toBe(0);
    expect(result.message).toBeNull();
  });

  it("uses singular phrasing for exactly one item", () => {
    const result = buildCaptureCallout("goal-1", [makeTask()], TODAY);
    expect(result.message).toContain("1 item captured");
  });
});

describe("buildStreakHonestyCheck", () => {
  it("does not flag a short streak even with no notes", () => {
    const checkins = [
      makeCheckin({ date: "2026-08-12", note: null }),
      makeCheckin({ date: "2026-08-11", note: null }),
    ];
    const result = buildStreakHonestyCheck(2, checkins, TODAY);
    expect(result.message).toBeNull();
  });

  it("does not flag a long streak where check-ins have real notes", () => {
    const checkins = [
      makeCheckin({ date: "2026-08-12", note: "Read a great paper on transformers" }),
      makeCheckin({ date: "2026-08-11", note: "Watched a full lecture" }),
      makeCheckin({ date: "2026-08-10", note: "Built a small project" }),
    ];
    const result = buildStreakHonestyCheck(6, checkins, TODAY);
    expect(result.message).toBeNull();
  });

  it("flags a long streak with mostly-empty notes — the exact Duolingo failure mode", () => {
    const checkins = [
      makeCheckin({ date: "2026-08-12", note: null }),
      makeCheckin({ date: "2026-08-11", note: "" }),
      makeCheckin({ date: "2026-08-10", note: "   " }),
      makeCheckin({ date: "2026-08-09", note: "Actually engaged today" }),
    ];
    const result = buildStreakHonestyCheck(6, checkins, TODAY);
    expect(result.message).not.toBeNull();
    expect(result.message).toContain("6-day streak");
    expect(result.hollowCount).toBe(3);
  });

  it("does not touch the streak number itself", () => {
    const checkins = [makeCheckin({ note: null })];
    const result = buildStreakHonestyCheck(9, checkins, TODAY);
    expect(result.streak).toBe(9);
  });

  it("only looks at completed check-ins, not skipped ones", () => {
    const checkins = [
      makeCheckin({ date: "2026-08-12", completed: false, note: null }),
      makeCheckin({ date: "2026-08-11", completed: false, note: null }),
      makeCheckin({ date: "2026-08-10", completed: false, note: null }),
    ];
    const result = buildStreakHonestyCheck(5, checkins, TODAY);
    expect(result.hollowCount).toBe(0);
    expect(result.message).toBeNull();
  });

  it("ignores check-ins outside the 7-day lookback window", () => {
    const checkins = Array.from({ length: 4 }, (_, i) =>
      makeCheckin({ date: `2026-07-0${i + 1}`, note: null })
    );
    const result = buildStreakHonestyCheck(6, checkins, TODAY);
    expect(result.hollowCount).toBe(0);
    expect(result.message).toBeNull();
  });
});
