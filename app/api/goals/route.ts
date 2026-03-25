import { NextRequest, NextResponse } from "next/server";
import { getAllGoals, createGoal } from "@/lib/db/goals";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("archived") === "true";
  const goals = await getAllGoals(includeArchived);
  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, deadline, dailyAction } = body;

  if (!name?.trim() || !dailyAction?.trim()) {
    return NextResponse.json(
      { error: "name and dailyAction are required" },
      { status: 400 }
    );
  }

  const goal = await createGoal({ name: name.trim(), description, deadline, dailyAction: dailyAction.trim() });
  return NextResponse.json(goal, { status: 201 });
}