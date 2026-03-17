import { NextRequest, NextResponse } from "next/server"
import { memory } from "@/mastra/storage"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await memory.deleteThread(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { title } = await req.json()

  const thread = await memory.updateThread({
    id,
    title: title ?? "",
    metadata: {},
  })

  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    resourceId: thread.resourceId,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    metadata: thread.metadata,
  })
}
