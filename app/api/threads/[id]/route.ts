import { NextRequest, NextResponse } from "next/server"
import { deleteThread, updateThread } from "@/lib/threads"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await deleteThread(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { title } = await req.json()
  const thread = await updateThread(id, title ?? "")
  return NextResponse.json(thread)
}
