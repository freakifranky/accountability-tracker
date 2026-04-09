import { NextRequest, NextResponse } from "next/server";
import { getGoalNotificationSettings, updateGoalNotificationSettings } from "@/lib/db/push";
import { getGoalById } from "@/lib/db/goals";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const settings = await getGoalNotificationSettings(id);
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const updated = await updateGoalNotificationSettings(id, body);
  return NextResponse.json(updated);
}
