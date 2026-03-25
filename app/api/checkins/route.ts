import { NextRequest, NextResponse } from "next/server";
import { upsertCheckin } from "@/lib/db/checkins";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { goalId, date, completed, note } = body;

  if (!goalId || !date || completed === undefined) {
    return NextResponse.json(
      { error: "goalId, date, and completed are required" },
      { status: 400 }
    );
  }

  const checkin = await upsertCheckin({ goalId, date, completed, note });
  return NextResponse.json(checkin, { status: 201 });
}