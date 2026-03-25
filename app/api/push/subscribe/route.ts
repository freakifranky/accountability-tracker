import { NextRequest, NextResponse } from "next/server";
import { saveSubscription, deleteSubscription } from "@/lib/db/push";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const record = saveSubscription({ endpoint, keys });
  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { endpoint } = body;
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }
  deleteSubscription(endpoint);
  return NextResponse.json({ success: true });
}
