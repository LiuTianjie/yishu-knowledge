"use client"
import type { VideoRef } from "@/types"
import type { UIMessage } from "ai"
import MarkdownContent from "./MarkdownContent"
import { ToolLoading, ToolDone } from "./ToolStatus"
import VideoCard, { groupRefs } from "./VideoCard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): boolean {
  return (
    part.type === "dynamic-tool" ||
    (typeof part.type === "string" && part.type.startsWith("tool-"))
  )
}

function getToolName(part: { type: string; toolName?: string }): string {
  if (part.toolName) return part.toolName
  if (part.type.startsWith("tool-")) return part.type.slice(5)
  return ""
}

function isAnalyze(name: string) {
  return name === "analyze-question" || name === "analyzeTool"
}
function isRetrieve(name: string) {
  return name === "retrieve-knowledge" || name === "retrieveTool"
}

export default function ChatMessage({
  message,
  imageUrl,
}: {
  message: UIMessage
  imageUrl?: string
}) {
  const isUser = message.role === "user"

  // Gather all text parts
  let textContent = ""
  for (const part of message.parts) {
    if (part.type === "text") textContent += part.text
  }

  /* -- User bubble -- */
  if (isUser) {
    const displayText = textContent === "（图片题目）" ? "" : textContent
    return (
      <div className="flex gap-3 justify-end">
        <div className="flex flex-col gap-2 max-w-[80%] items-end">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="题目图片"
              className="max-w-xs rounded-2xl border border-gray-200/60 shadow-sm"
            />
          )}
          {displayText && (
            <div className="px-4 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed bg-blue-500 text-white shadow-sm whitespace-pre-wrap">
              {displayText}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
          我
        </div>
      </div>
    )
  }

  /* -- Assistant bubble -- */
  let knowledgePoints: string[] = []
  const refs: VideoRef[] = []
  const renderedParts: React.ReactNode[] = []
  let hasVisibleContent = false
  let hasRunningTool = false
  let textAccumulator = ""
  const isStreaming = message.parts.some(
    (p) => p.type === "text" && p.state === "streaming"
  )

  // First pass: collect knowledge points & video refs
  for (const part of message.parts) {
    if (!isToolPart(part)) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = part as any
    const name = getToolName(p)
    if (p.state !== "output-available") continue
    const output = p.output
    if (isAnalyze(name) && output?.questions) {
      for (const q of output.questions) {
        if (q.knowledge_points) knowledgePoints.push(...q.knowledge_points)
      }
    }
    if (isRetrieve(name) && output?.hits) {
      refs.push(...output.hits)
    }
  }
  knowledgePoints = [...new Set(knowledgePoints)]

  // Second pass: render in order
  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i]

    if (part.type === "text") {
      textAccumulator += part.text
      hasVisibleContent = true
      continue
    }

    if (isToolPart(part)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = part as any
      const name = getToolName(p)
      const state = p.state as string

      if (state === "input-streaming" || state === "input-available") {
        hasRunningTool = true
        hasVisibleContent = true
        renderedParts.push(<ToolLoading key={`tool-${i}`} toolName={name} />)
      } else if (state === "output-available") {
        hasVisibleContent = true
        renderedParts.push(
          <ToolDone key={`tool-${i}`} toolName={name} output={p.output} />
        )
      }
    }
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
        <img
          src="/avatar.jpg"
          alt="AI"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col gap-2 max-w-[80%] min-w-0 items-start">
        {/* Tool status indicators */}
        {renderedParts}

        {/* Knowledge point tags */}
        {knowledgePoints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {knowledgePoints.map((kp, i) => (
              <span
                key={i}
                className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full"
              >
                {kp}
              </span>
            ))}
          </div>
        )}

        {/* Main text content */}
        {textAccumulator && (
          <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-gray-100 shadow-sm text-sm leading-relaxed text-gray-800">
            <MarkdownContent content={textAccumulator} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* Video cards */}
        {refs.length > 0 && (
          <div className="w-full mt-1">
            <p className="text-xs text-gray-400 font-medium mb-2">📹 相关视频</p>
            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {groupRefs(refs).map((merged) => (
                <VideoCard key={merged.bvid} merged={merged} />
              ))}
            </div>
          </div>
        )}

        {/* Thinking state: no content yet */}
        {!hasVisibleContent && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            思考中…
          </div>
        )}

        {/* Generating: tools done but no text yet */}
        {hasVisibleContent &&
          !textAccumulator &&
          !hasRunningTool &&
          renderedParts.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
              <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
              生成回答中…
            </div>
          )}
      </div>
    </div>
  )
}
