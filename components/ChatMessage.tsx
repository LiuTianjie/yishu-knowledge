"use client"
import type { VideoRef } from "@/types"
import type { UIMessage, ChatStatus } from "ai"
import { isToolUIPart } from "ai"
import MarkdownContent from "./MarkdownContent"
import { ToolLoading, ToolDone } from "./ToolStatus"
import VideoCard, { groupRefs } from "./VideoCard"

function isAnalyze(name: string) {
  return name === "analyze-question" || name === "analyzeTool"
}
function isRetrieve(name: string) {
  return name === "retrieve-knowledge" || name === "retrieveTool"
}

export default function ChatMessage({
  message,
  chatStatus,
  isLastMessage,
  imageUrl,
}: {
  message: UIMessage
  chatStatus: ChatStatus
  isLastMessage: boolean
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

  /* -- Assistant message -- */

  // Derive all state from AI SDK part states
  const isActive = isLastMessage && (chatStatus === "submitted" || chatStatus === "streaming")
  const hasStreamingText = message.parts.some(p => p.type === "text" && p.state === "streaming")

  let knowledgePoints: string[] = []
  const refs: VideoRef[] = []
  const toolElements: React.ReactNode[] = []
  let textAccumulator = ""

  // Single pass: collect tool data + build tool UI from native part states
  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i]

    if (part.type === "text") {
      textAccumulator += part.text
      continue
    }

    // AI SDK provides isToolUIPart for type-safe tool detection
    // Also handle dynamic-tool type for Mastra compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = part as any
    if (isToolUIPart(part) || p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-"))) {
      const name: string = p.toolName || ""
      const state: string = p.state

      // Collect knowledge points & video refs from completed tools
      if (state === "output-available") {
        const output = p.output
        if (isAnalyze(name) && output?.questions) {
          for (const q of output.questions) {
            if (q.knowledge_points) knowledgePoints.push(...q.knowledge_points)
          }
        }
        if (isAnalyze(name) && output?.references) {
          refs.push(...output.references)
        }
        if (isRetrieve(name) && output?.hits) {
          refs.push(...output.hits)
        }
        toolElements.push(<ToolDone key={`tool-${i}`} toolName={name} output={output} />)
      } else if (state === "output-error") {
        toolElements.push(
          <div key={`tool-${i}`} className="flex items-center gap-2 text-xs text-red-400 px-1 py-1">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            工具执行失败
          </div>
        )
      } else {
        // input-streaming, input-available — tool is running
        toolElements.push(<ToolLoading key={`tool-${i}`} toolName={name} input={p.input} state={state} />)
      }
    }
  }
  knowledgePoints = [...new Set(knowledgePoints)]

  // Determine loading state purely from parts:
  // - No parts at all + active = thinking (waiting for first response)
  // - Tools running + active = tool running (ToolLoading handles display)
  // - Tools done, no text yet + active = generating answer
  const hasAnyContent = textAccumulator || toolElements.length > 0
  const allToolsDone = toolElements.length > 0 && message.parts
    .filter(p => isToolUIPart(p) || (p as { type: string }).type === "dynamic-tool" || (typeof (p as { type: string }).type === "string" && (p as { type: string }).type.startsWith("tool-")))
    .every(p => (p as { state: string }).state === "output-available" || (p as { state: string }).state === "output-error")

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
        {toolElements}

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
            {hasStreamingText && (
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

        {/* Thinking: active but nothing received yet */}
        {isActive && !hasAnyContent && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            思考中…
          </div>
        )}

        {/* Generating answer: tools done, no text yet, stream still active */}
        {isActive && allToolsDone && !textAccumulator && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            生成回答中…
          </div>
        )}
      </div>
    </div>
  )
}
