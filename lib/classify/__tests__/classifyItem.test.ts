import { describe, it, expect } from "vitest";
import { classifyItem, isVideoUrl } from "../classifyItem";
import type { Goal } from "@/lib/types";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    name: "Learning AI",
    description: null,
    deadline: null,
    dailyAction: "Read or watch one AI item",
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...overrides,
  };
}

describe("classifyItem", () => {
  const aiGoal = makeGoal({ id: "ai-goal", name: "Learning AI" });
  const stocksGoal = makeGoal({ id: "stocks-goal", name: "Learning stocks" });
  const goals = [aiGoal, stocksGoal];

  it("matches directly on the goal's own name", () => {
    const result = classifyItem("Deep dive into AI safety", goals);
    expect(result.goalId).toBe("ai-goal");
  });

  it("matches via a topic keyword when the title doesn't contain the goal name", () => {
    const result = classifyItem("New GPT-5 coding agent walkthrough", goals);
    expect(result.goalId).toBe("ai-goal");
    expect(result.matchedKeyword).toBe("gpt");
  });

  it("matches stocks topic keywords to the stocks goal", () => {
    const result = classifyItem("NVDA earnings call reaction", goals);
    expect(result.goalId).toBe("stocks-goal");
  });

  it("discards items that match no goal or topic", () => {
    const result = classifyItem("My cousin's wedding photos", goals);
    expect(result.goalId).toBeNull();
    expect(result.matchedKeyword).toBeNull();
  });

  it("is case-insensitive", () => {
    const result = classifyItem("WHY EVERYONE IS TALKING ABOUT CHATGPT", goals);
    expect(result.goalId).toBe("ai-goal");
  });

  it("returns null when there are no goals to match against", () => {
    const result = classifyItem("Anything at all", []);
    expect(result.goalId).toBeNull();
  });
});

describe("isVideoUrl", () => {
  it("detects youtube.com URLs", () => {
    expect(isVideoUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("detects youtu.be short links", () => {
    expect(isVideoUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("detects the mobile youtube host", () => {
    expect(isVideoUrl("https://m.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("returns false for non-video URLs", () => {
    expect(isVideoUrl("https://example.com/article")).toBe(false);
  });

  it("returns false for a malformed URL instead of throwing", () => {
    expect(isVideoUrl("not-a-url")).toBe(false);
  });
});
