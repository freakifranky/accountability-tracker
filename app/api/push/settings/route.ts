import { NextRequest, NextResponse } from "next/server";
import { getNotificationSettings, updateNotificationSettings } from "@/lib/db/push";

export async function GET() {
  return NextResponse.json(getNotificationSettings());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updated = updateNotificationSettings(body);
  return NextResponse.json(updated);
}
