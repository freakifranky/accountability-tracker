import { NextRequest, NextResponse } from "next/server";
import { getAllGoals } from "@/lib/db/goals";
import { createCapturedTasksBatch } from "@/lib/db/tasks";
import { classifyItem, isVideoUrl } from "@/lib/classify/classifyItem";
import { normalizeUrlForDedup } from "@/lib/capture/normalizeUrl";
import type { CreateTaskInput } from "@/lib/types";
import { format } from "date-fns";

interface CapturedItemPayload {
  title: string;
  url: string;
}

// Ingest endpoint for auto-captured items (Chrome extension: open tabs, 3+ days
// old). Classifies each item against active Goals (keyword match, Phase 1 — see
// lib/classify/classifyItem.ts), discards anything that doesn't match a goal,
// dedups by normalized URL, and writes everything in one batched db mutation.
// Auth is handled by middleware.ts (shared secret on all /api/* routes) — this
// route doesn't need its own auth check.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const items: CapturedItemPayload[] | undefined = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }
  for (const item of items) {
    if (!item?.title?.trim() || !item?.url?.trim()) {
      return NextResponse.json({ error: "each item needs a title and url" }, { status: 400 });
    }
  }

  const goals = await getAllGoals();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const inputs: CreateTaskInput[] = [];
  let discarded = 0;
  for (const item of items) {
    const { goalId } = classifyItem(item.title, goals);
    if (!goalId) {
      discarded++;
      continue;
    }
    inputs.push({
      goalId,
      title: item.title.trim(),
      dueDate: todayStr, // required — tasks with no dueDate never show up in the widget/dashboard "today" view
      source: "chrome-tab",
      sourceUrl: item.url,
      sourceId: normalizeUrlForDedup(item.url),
      contentType: isVideoUrl(item.url) ? "video" : "article",
    });
  }

  const created = await createCapturedTasksBatch(inputs);
  const duplicates = inputs.length - created.length;

  return NextResponse.json(
    { created: created.length, discarded, duplicates },
    { status: 201 }
  );
}
