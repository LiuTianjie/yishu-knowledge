import { NextRequest, NextResponse } from "next/server";
import { getMessages, saveMessages } from "@/lib/threads";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const messages = await getMessages(id);
  return NextResponse.json(messages);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { messages } = await req.json();
  await saveMessages(id, messages);
  return NextResponse.json({ ok: true });
}
