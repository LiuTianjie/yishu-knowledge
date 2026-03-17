import { NextRequest, NextResponse } from "next/server"
import { listThreads, createThread } from "@/lib/threads"

export async function GET() {
  const threads = await listThreads()
  return NextResponse.json(threads)
}

export async function POST(req: NextRequest) {
  const { title } = await req.json()
  const thread = await createThread(title || "新对话")
  return NextResponse.json(thread)
}
