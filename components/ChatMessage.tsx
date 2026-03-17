"use client"
import { memo, useEffect, useState } from "react"
import type { VideoRef } from "@/types"
import type { UIMessage, ChatStatus } from "ai"
import { isToolUIPart, getToolName } from "ai"
import MarkdownContent from "./MarkdownContent"
import { StepBar } from "./ToolStatus"
import VideoCard, { groupRefs } from "./VideoCard"

interface QuestionResult {
  question_index: number
  knowledge_points: string[]
  hits: VideoRef[]
}

/** Split answer text into per-question sections by "第N题" headers */
function splitByQuestion(text: string): { before: string; sections: { index: number; content: string }[] } {
  const regex = /(?:^|\n)(#{0,4}\s*第\s*(\d+)\s*题[\s:：]*)/g
  const matches: { pos: number; index: number; headerLen: number }[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    matches.push({ pos: m.index, index: parseInt(m[2]), headerLen: m[0].length })
  }
  if (matches.length === 0) {
    return { before: text, sections: [] }
  }
  const before = text.slice(0, matches[0].pos).trim()
  const sections = matches.map((match, i) => {
    const start = match.pos
    const end = i + 1 < matches.length ? matches[i + 1].pos : text.length
    return { index: match.index, content: text.slice(start, end).trim() }
  })
  return { before, sections }
}

function ChatMessage({
  message,
  chatStatus,
  isLastMessage,
  imageUrl,
  onRetry,
}: {
  message: UIMessage
  chatStatus: ChatStatus
  isLastMessage: boolean
  imageUrl?: string
  onRetry?: (messageId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isUser = message.role === "user"

  useEffect(() => {
    if (!isPreviewOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPreviewOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isPreviewOpen])

  // Gather all text parts
  let textContent = ""
  for (const part of message.parts) {
    if (part.type === "text") textContent += part.text
  }

  /* -- User bubble -- */
  if (isUser) {
    const displayText = textContent === "（图片题目）" ? "" : textContent
    return (
      <>
        <div className="flex justify-end group">
          <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%] items-end min-w-0">
            {imageUrl && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-[20px] overflow-hidden border border-gray-100 shadow-sm cursor-zoom-in"
                title="点击预览"
                aria-label="预览图片"
              >
                <img
                  src={imageUrl}
                  alt="题目图片"
                  className="max-w-xs md:max-w-sm"
                />
              </button>
            )}
            {displayText && (
              <div className="px-5 py-3.5 rounded-[20px] rounded-tr-[4px] bg-[var(--brand)] text-white shadow-[var(--shadow-soft)] break-words whitespace-pre-wrap text-[15px] leading-[2]">
                {displayText}
              </div>
            )}
          </div>
        </div>

        {isPreviewOpen && imageUrl && (
          <div
            className="fixed inset-0 z-[80] bg-black/72 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <img
              src={imageUrl}
              alt="题目预览"
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
              title="关闭预览"
              aria-label="关闭预览"
            >
              ×
            </button>
          </div>
        )}
      </>
    )
  }

  /* -- Assistant message -- */
  const isActive = isLastMessage && (chatStatus === "submitted" || chatStatus === "streaming")
  const hasStreamingText = message.parts.some(p => p.type === "text" && p.state === "streaming")

  const questionResults: QuestionResult[] = []
  let textAccumulator = ""
  let hasToolParts = false

  // Tool step tracking
  type StepState = "pending" | "active" | "done" | "error"
  let analyzeState: StepState = "pending"
  let retrieveState: StepState = "pending"
  let analyzeDetail = ""
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analyzeOutput: any = undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let retrieveOutput: any = undefined
  let hasRetrieveStep = false

  for (const part of message.parts) {
    if (part.type === "text") {
      textAccumulator += part.text
      continue
    }
    if (isToolUIPart(part)) {
      hasToolParts = true
      const toolName = getToolName(part)
      const { state } = part

      if (toolName === "analyzeTool") {
        if (state === "output-available") {
          analyzeState = "done"
          analyzeOutput = part.output
        } else if (state === "output-error") {
          analyzeState = "error"
        } else {
          analyzeState = "active"
          const isStreaming = state === "input-streaming"
          if (isStreaming && part.input && typeof part.input === "object" && "text" in part.input) {
            const t = (part.input as { text: string }).text
            analyzeDetail = t.length > 40 ? t.slice(0, 40) + "…" : t
          }
        }
      }
      if (toolName === "retrieveTool") {
        hasRetrieveStep = true
        if (state === "output-available") {
          retrieveState = "done"
          retrieveOutput = part.output
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const output = part.output as any
          if (output?.results) {
            for (const r of output.results) {
              questionResults.push({
                question_index: r.question_index,
                knowledge_points: r.knowledge_points || [],
                hits: r.hits || [],
              })
            }
          }
        } else if (state === "output-error") {
          retrieveState = "error"
        } else {
          retrieveState = "active"
        }
      }
    }
  }

  // Determine answer generation step state
  let answerState: StepState = "pending"
  const allToolsDone = (!hasToolParts) || (analyzeState === "done" && (retrieveState === "done" || !hasRetrieveStep))
  if (textAccumulator) {
    answerState = isActive ? "active" : "done"
  } else if (isActive && hasToolParts && allToolsDone) {
    answerState = "active"
  }

  // If analyze returned is_math: false, skip retrieve step and show only 2 steps
  const isMath = analyzeOutput?.is_math !== false
  const showRetrieveStep = hasRetrieveStep || (analyzeState !== "done") || isMath

  // AI SDK stream may terminate unexpectedly (abort/network/error), leaving stale pending/active states.
  // Once the message is settled, coerce unfinished tool steps to error to avoid dangling "进行中".
  const isMessageSettled = !isActive && (!isLastMessage || chatStatus === "ready" || chatStatus === "error")
  const finalizeStepState = (state: StepState): StepState => {
    if (!isMessageSettled) return state
    return state === "pending" || state === "active" ? "error" : state
  }

  analyzeState = finalizeStepState(analyzeState)
  retrieveState = finalizeStepState(retrieveState)
  answerState = finalizeStepState(answerState)

  // Build steps array
  const steps = [
    { label: "分析题目", state: analyzeState, detail: analyzeDetail, output: analyzeOutput },
    ...(showRetrieveStep ? [{ label: "检索知识库", state: retrieveState, detail: undefined, output: retrieveOutput }] : []),
    { label: "解答问题", state: answerState, detail: undefined, output: undefined },
  ]

  // Build a map from question_index to its results
  const resultMap = new Map<number, QuestionResult>()
  for (const qr of questionResults) {
    resultMap.set(qr.question_index, qr)
  }

  const hasAnyContent = textAccumulator || hasToolParts
  const showExtras = !isActive // only show knowledge points + videos after streaming ends
  const { before, sections } = splitByQuestion(textAccumulator)
  const useFastStreamingRender = isActive && hasStreamingText
  const canCopy = isMessageSettled && Boolean(textAccumulator.trim())
  const canRetry = isMessageSettled && message.role === "assistant"

  const handleCopy = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(textAccumulator)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Ignore clipboard errors in unsupported environments.
    }
  }

  // Usage metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (message as any).metadata as { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }; durationMs?: number } | undefined

  return (
    <div className="flex w-full group">
      <div className="flex flex-col gap-1.5 w-full min-w-0 items-start">
        {/* Step progress bar */}
        {hasToolParts && <StepBar steps={steps} />}

        {/* Main text content */}
        {textAccumulator && (
          <div className="px-5 py-3.5 rounded-[20px] rounded-tl-[4px] border border-[var(--line-soft)] bg-white text-[15px] leading-[2] text-gray-800 min-w-0 w-full overflow-x-auto hide-scrollbar shadow-[var(--shadow-soft)]">
            {useFastStreamingRender ? (
              <div className="whitespace-pre-wrap break-words leading-[2]">{textAccumulator}</div>
            ) : sections.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {before && <MarkdownContent content={before} />}
                {sections.map((sec) => {
                  const qr = resultMap.get(sec.index) || (sections.length === 1 && questionResults.length === 1 ? questionResults[0] : undefined)
                  return (
                    <div key={sec.index} className="flex flex-col gap-1.5 min-w-0 overflow-x-hidden">
                      <MarkdownContent content={sec.content} />
                      {showExtras && qr && (
                        <QuestionExtras kps={qr.knowledge_points} hits={qr.hits} />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <MarkdownContent content={textAccumulator} />
            )}
            {hasStreamingText && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-1 align-middle rounded-full" />
            )}
          </div>
        )}

        {/* Fallback: if no sections OR index mismatch, still show all extras */}
        {showExtras && sections.length === 0 && questionResults.length > 0 && (
          <>
            {questionResults.map((qr) => (
              <QuestionExtras key={qr.question_index} kps={qr.knowledge_points} hits={qr.hits} />
            ))}
          </>
        )}

        {showExtras && sections.length > 0 && questionResults.length > 0 && (() => {
          const sectionIndexes = new Set(sections.map((s) => s.index))
          const unmatched = questionResults.filter((qr) => !sectionIndexes.has(qr.question_index))
          if (unmatched.length === 0) return null
          return (
            <>
              {unmatched.map((qr, idx) => (
                <QuestionExtras key={`unmatched-${qr.question_index}-${idx}`} kps={qr.knowledge_points} hits={qr.hits} />
              ))}
            </>
          )
        })()}

        {(showExtras && meta && (meta.usage || meta.durationMs)) || canCopy || canRetry ? (
          <div className="w-full px-1 pt-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-white px-2 py-1 text-[var(--text-muted)] opacity-85 group-hover:opacity-100 transition-all">
              <div className="flex items-center gap-2.5 text-[11px] text-slate-400 pr-1">
                {showExtras && meta?.usage?.totalTokens != null && (
                  <span>tokens: {meta.usage.totalTokens}</span>
                )}
                {showExtras && meta?.durationMs != null && (
                  <span>耗时: {(meta.durationMs / 1000).toFixed(1)}s</span>
                )}
              </div>

              {(showExtras && meta?.usage?.totalTokens != null) || (showExtras && meta?.durationMs != null) ? (
                <span className="w-px h-3 bg-[var(--line-soft)]" />
              ) : null}

              {(canCopy || canRetry) && (
                <div className="inline-flex items-center gap-0.5">
                {canCopy && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] hover:text-slate-700 transition-colors"
                    title={copied ? "已复制" : "复制"}
                    aria-label={copied ? "已复制" : "复制"}
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <rect x="9" y="9" width="10" height="10" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 15H6a2 2 0 01-2-2V6a2 2 0 012-2h7a2 2 0 012 2v1" />
                      </svg>
                    )}
                  </button>
                )}
                {canRetry && onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] hover:text-slate-700 transition-colors"
                    title="重试"
                    aria-label="重试"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 109-9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v8h8" />
                    </svg>
                  </button>
                )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Thinking: active but nothing received yet (no tool parts) */}
        {isActive && !hasAnyContent && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            思考中…
          </div>
        )}
      </div>
    </div>
  )
}

/** Per-question knowledge points + video cards */
function QuestionExtras({ kps, hits }: { kps: string[]; hits: VideoRef[] }) {
  const uniqueKps = Array.from(new Set(kps))
  if (uniqueKps.length === 0 && hits.length === 0) return null
  return (
    <div className="mt-2.5 mb-1.5 pt-2.5 border-t border-[var(--line-soft)] w-full overflow-hidden">
      {uniqueKps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {uniqueKps.map((kp, i) => (
            <span
              key={i}
              className="text-[13px] bg-[var(--brand-soft)] text-[#315FBD] border border-[var(--line-soft)] px-2.5 py-1 rounded-lg font-medium"
            >
              {kp}
            </span>
          ))}
        </div>
      )}
      {hits.length > 0 && (
        <div className="w-full">
          <p className="text-[13px] text-slate-500 font-medium mb-2.5 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-9 4h7a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            相关知识点
          </p>
          <div
            className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x hide-scrollbar"
          >
            {groupRefs(hits).map((merged) => (
              <div key={merged.bvid} className="snap-start shrink-0">
                <VideoCard merged={merged} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function areChatMessagePropsEqual(
  prev: {
    message: UIMessage
    chatStatus: ChatStatus
    isLastMessage: boolean
    imageUrl?: string
  },
  next: {
    message: UIMessage
    chatStatus: ChatStatus
    isLastMessage: boolean
    imageUrl?: string
  },
) {
  if (prev.message !== next.message) return false
  if (prev.imageUrl !== next.imageUrl) return false
  if (prev.isLastMessage !== next.isLastMessage) return false

  // Non-last messages don't need to re-render on status changes.
  if (!next.isLastMessage) return true

  return prev.chatStatus === next.chatStatus
}

export default memo(ChatMessage, areChatMessagePropsEqual)
