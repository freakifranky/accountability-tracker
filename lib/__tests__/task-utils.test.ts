import { describe, it, expect } from "vitest";
import { filterTasksForActiveGoals } from "../task-utils";
import type { Task } from "../types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    goalId: "goal-1",
    title: "A task",
    dueDate: "2026-08-12",
    priority: 4,
    recurrence: "none",
    recurrenceDays: null,
    completed: false,
    completedAt: null,
    completionNote: null,
    completionMood: null,
    createdAt: "2026-08-12T08:00:00.000Z",
    source: "manual",
    sourceUrl: null,
    sourceId: null,
    contentType: null,
    ...overrides,
  };
}

describe("filterTasksForActiveGoals", () => {
  it("excludes tasks whose goal is not in the active set (the archived-goal-still-shows-in-calendar bug)", () => {
    const activeGoalIds = new Set(["active-goal"]);
    const tasks = [
      makeTask({ id: "t1", goalId: "active-goal" }),
      makeTask({ id: "t2", goalId: "archived-goal" }),
    ];
    const result = filterTasksForActiveGoals(tasks, activeGoalIds);
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  it("always includes standalone tasks with no goal", () => {
    const activeGoalIds = new Set<string>();
    const tasks = [makeTask({ id: "standalone", goalId: null })];
    const result = filterTasksForActiveGoals(tasks, activeGoalIds);
    expect(result.map((t) => t.id)).toEqual(["standalone"]);
  });

  it("returns an empty list when every task's goal is archived", () => {
    const activeGoalIds = new Set(["some-other-goal"]);
    const tasks = [makeTask({ goalId: "archived-goal" })];
    expect(filterTasksForActiveGoals(tasks, activeGoalIds)).toHaveLength(0);
  });
});
