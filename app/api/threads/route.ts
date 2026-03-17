import { NextRequest, NextResponse } from "next/server"
import { memory } from "@/mastra/storage"

const RESOURCE_ID = "default-user"

export async function GET() {
  const { threads } = await memory.listThreads({
    filter: { resourceId: RESOURCE_ID },
    orderBy: { field: "createdAt", direction: "DESC" },
  })

  return NextResponse.json(
    threads.map((t) => ({
      id: t.id,
      title: t.title,
      resourceId: t.resourceId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      metadata: t.metadata,
    }))
  )
}

export async function POST(req: NextRequest) {
  const { title } = await req.json()

  const id = crypto.randomUUID()
  const now = new Date()

  const thread = await memory.saveThread({
    thread: {
      id,
      title: title || "新对话",
      resourceId: RESOURCE_ID,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    },
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
