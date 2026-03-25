import { NextRequest, NextResponse } from "next/server";
import { toggleArchiveGoal } from "@/lib/db/goals";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await toggleArchiveGoal(id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(goal);
}