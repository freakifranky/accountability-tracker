import { NextRequest, NextResponse } from "next/server";
import { getCheckinsByGoalId } from "@/lib/db/checkins";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const checkins = await getCheckinsByGoalId(goalId);
  return NextResponse.json(checkins);
}