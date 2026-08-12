import type { Goal } from "@/lib/types";

export interface ClassifyResult {
  goalId: string | null; // null = discard, no matching goal
  matchedKeyword: string | null;
}

// Static supplementary keywords for common goal themes, so a captured title
// that doesn't literally contain the goal's own name still matches (e.g. a
// video titled "GPT-5 coding agent walkthrough" should match a goal named
// "Learning AI" even though the word "AI" isn't in the video title).
// Phase 1 design decision: keyword matching, not an LLM call (see design doc) —
// deliberately dumb and fully unit-testable, upgrade path tracked in TODOS.md.
const TOPIC_KEYWORDS: Record<string, string[]> = {
  ai: [
    "ai", "artificial intelligence", "machine learning", "llm", "gpt",
    "claude", "chatgpt", "neural network", "coding agent", "openai", "anthropic",
  ],
  stocks: [
    "stock", "stocks", "ticker", "earnings", "nasdaq", "nyse", "invest",
    "investing", "shares", "market cap", "dividend", "portfolio",
  ],
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

// Matches a captured item's title against each active goal's own name/dailyAction
// first (direct match, highest confidence), then falls back to the static topic
// table mapped to whichever goal's name mentions that topic. Returns
// goalId: null when nothing matches — the item is discarded, not captured.
export function classifyItem(title: string, goals: Goal[]): ClassifyResult {
  const normalizedTitle = normalize(title);

  for (const goal of goals) {
    const goalKeywords = [goal.name, goal.dailyAction].filter(Boolean).map(normalize);
    const matched = goalKeywords.find((kw) => kw.length > 2 && normalizedTitle.includes(kw));
    if (matched) {
      return { goalId: goal.id, matchedKeyword: matched };
    }
  }

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matched = keywords.find((kw) => normalizedTitle.includes(kw));
    if (!matched) continue;
    const matchingGoal = goals.find((g) => normalize(g.name).includes(topic));
    if (matchingGoal) {
      return { goalId: matchingGoal.id, matchedKeyword: matched };
    }
  }

  return { goalId: null, matchedKeyword: null };
}

const VIDEO_HOSTS = new Set(["youtube.com", "youtu.be", "m.youtube.com"]);

export function isVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return VIDEO_HOSTS.has(host);
  } catch {
    return false;
  }
}
