"use client"
import { useState } from "react"
import { marked } from "marked"
import katex from "katex"
import { VideoRef } from "@/types"
import VideoCard, { groupRefs } from "./VideoCard"
import type { UIMessage } from "ai"

function normalizeLatex(text: string): string {
  return text
    .replace(/\\\[([^]*?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([^]*?)\\\)/g, (_, m) => `$${m}$`)
}

function stripVideoSection(text: string): string {
  return text
    .replace(/\n*📹\s*相关(视频|知识点)[\s\S]*$/m, "")
    .replace(/\n*#{1,3}\s*相关(视频|知识点)[\s\S]*$/m, "")
    .trimEnd()
}

function renderContent(raw: string): string {
  const text = normalizeLatex(stripVideoSection(raw))
  const mathBlocks: string[] = []
  let processed = text

  processed = processed.replace(/\$\$([^$]+?)\$\$/g, (_, expr) => {
    try {
      mathBlocks.push(katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }))
    } catch {
      mathBlocks.push(`<span class="text-red-400">$$${expr}$$</span>`)
    }
    return `MATHBLOCK_${mathBlocks.length - 1}_END`
  })

  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, expr) => {
    try {
      mathBlocks.push(katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }))
    } catch {
      mathBlocks.push(`<span class="text-red-400">$${expr}$</span>`)
    }
    return `MATHBLOCK_${mathBlocks.length - 1}_END`
  })

  let html = marked.parse(processed, { async: false }) as string
  html = html.replace(/MATHBLOCK_(\d+)_END/g, (_, i) => mathBlocks[parseInt(i)] || "")
  return html
}

function MarkdownContent({ content }: { content: string }) {
  const html = content ? renderContent(content) : ""
  return (
    <div
      className="prose prose-sm max-w-none text-gray-800
        [&_p]:mb-2 [&_p]:last:mb-0 [&_p]:leading-7
        [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3
        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
        [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-1
        [&_li]:leading-7
        [&_code]:bg-gray-100 [&_code]:text-purple-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
        [&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto
        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-800
        [&_strong]:font-semibold [&_strong]:text-gray-900
        [&_hr]:my-3 [&_hr]:border-gray-200
        [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:my-2
        [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): boolean {
  return part.type === "dynamic-tool" || (typeof part.type === "string" && part.type.startsWith("tool-"))
}

function getToolName(part: { type: string; toolName?: string }): string {
  if (part.toolName) return part.toolName
  if (part.type.startsWith("tool-")) return part.type.slice(5)
  return ""
}

function isOcr(name: string) { return name === "ocr-image" || name === "ocrTool" }
function isAnalyze(name: string) { return name === "analyze-question" || name === "analyzeTool" }
function isRetrieve(name: string) { return name === "retrieve-knowledge" || name === "retrieveTool" }

const TOOL_DISPLAY: Record<string, { loading: string; done: string }> = {
  "ocrTool": { loading: "识别图片中...", done: "图片识别完成" },
  "ocr-image": { loading: "识别图片中...", done: "图片识别完成" },
  "analyzeTool": { loading: "分析题目中...", done: "题目分析完成" },
  "analyze-question": { loading: "分析题目中...", done: "题目分析完成" },
  "retrieveTool": { loading: "查询关联知识点中...", done: "查询关联知识点完成" },
  "retrieve-knowledge": { loading: "查询关联知识点中...", done: "查询关联知识点完成" },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolOutputBlock({ toolName, output }: { toolName: string; output: any }) {
  const [expanded, setExpanded] = useState(false)
  const labels = TOOL_DISPLAY[toolName] || { done: "完成" }

  const displayOutput = (() => {
    if (isRetrieve(toolName) && output?.hits) {
      return {
        ...output,
        hits: output.hits.map((h: Record<string, unknown>) => {
          const { text, ...rest } = h
          return rest
        }),
      }
    }
    return output
  })()

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="w-3 h-3 rounded-full bg-green-400 shrink-0" />
        <span>{labels.done}</span>
        <span className="ml-auto text-gray-300">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all font-mono leading-relaxed max-h-60 overflow-y-auto">
            {JSON.stringify(displayOutput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function ToolLoadingBlock({ toolName }: { toolName: string }) {
  const labels = TOOL_DISPLAY[toolName] || { loading: "处理中..." }
  return (
    <div className="flex items-center gap-2 text-xs px-1 py-1">
      <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
      <span className="text-gray-400">{labels.loading}</span>
    </div>
  )
}

export default function ChatMessage({ message, imageUrl }: { message: UIMessage; imageUrl?: string }) {
  const isUser = message.role === "user"

  // 提取所有文本
  let textContent = ""
  for (const part of message.parts) {
    if (part.type === "text") textContent += part.text
  }

  if (isUser) {
    // 用户消息：如果有图片就只显示图片，否则显示文字
    const displayText = textContent === "（图片题目）" ? "" : textContent
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-medium bg-blue-500 text-white">
          我
        </div>
        <div className="flex flex-col gap-2 max-w-[80%] items-end">
          {imageUrl && (
            <img src={imageUrl} alt="题目图片" className="max-w-xs rounded-xl border border-gray-200 shadow-sm" />
          )}
          {displayText && (
            <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-blue-500 text-white rounded-tr-sm whitespace-pre-wrap">
              {displayText}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Assistant 消息：按 parts 顺序逐步渲染 ──
  // 收集结构化数据用于知识点标签和视频卡片
  let knowledgePoints: string[] = []
  let refs: VideoRef[] = []
  const renderedParts: React.ReactNode[] = []
  let hasVisibleContent = false
  let hasRunningTool = false
  let textAccumulator = ""
  const isStreaming = message.parts.some(p => p.type === "text" && p.state === "streaming")

  // 先收集知识点和视频引用
  for (const part of message.parts) {
    if (!isToolPart(part)) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = part as any
    const name = getToolName(p)
    if (p.state !== "output-available") continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = p.output as any
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

  // 按 parts 顺序渲染
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
        renderedParts.push(<ToolLoadingBlock key={`tool-${i}`} toolName={name} />)
      } else if (state === "output-available") {
        hasVisibleContent = true
        renderedParts.push(<ToolOutputBlock key={`tool-${i}`} toolName={name} output={p.output} />)
      }
    }

    // step-start, reasoning 等其他 part 类型忽略
  }

  return (
    <div className="flex gap-3 flex-row">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-medium overflow-hidden">
        <img src="/avatar.jpg" alt="AI" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col gap-2 max-w-[80%] items-start">
        {/* Tool 调用过程 */}
        {renderedParts}

        {/* 知识点标签 */}
        {knowledgePoints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {knowledgePoints.map((kp, i) => (
              <span key={i} className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full">
                {kp}
              </span>
            ))}
          </div>
        )}

        {/* 文本内容 */}
        {textAccumulator && (
          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm">
            <MarkdownContent content={textAccumulator} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* 视频卡片 */}
        {refs.length > 0 && (
          <div className="w-full mt-1">
            <p className="text-xs text-gray-400 font-medium mb-2">相关视频</p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {groupRefs(refs).map((merged) => (
                <VideoCard key={merged.bvid} merged={merged} />
              ))}
            </div>
          </div>
        )}

        {/* 没有任何可见内容时显示思考中 */}
        {!hasVisibleContent && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            思考中...
          </div>
        )}

        {/* 正在生成回答（tool 都完成了但还没有文本） */}
        {hasVisibleContent && !textAccumulator && !hasRunningTool && renderedParts.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
            <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
            生成回答中...
          </div>
        )}
      </div>
    </div>
  )
}
