"use client"
import { useState } from "react"

const TOOL_DISPLAY: Record<string, { streaming: string; executing: string; done: string }> = {
  "analyzeTool": { streaming: "正在读取题目…", executing: "分析题目中…", done: "分析完成" },
  "analyze-question": { streaming: "正在读取题目…", executing: "分析题目中…", done: "分析完成" },
  "retrieveTool": { streaming: "准备检索…", executing: "检索知识库中…", done: "检索完成" },
  "retrieve-knowledge": { streaming: "准备检索…", executing: "检索知识库中…", done: "检索完成" },
}

function isAnalyze(name: string) {
  return name === "analyze-question" || name === "analyzeTool"
}
function isRetrieve(name: string) {
  return name === "retrieve-knowledge" || name === "retrieveTool"
}

export function ToolLoading({ toolName, input, state }: { toolName: string; input?: unknown; state?: string }) {
  const labels = TOOL_DISPLAY[toolName] || { streaming: "处理中…", executing: "执行中…" }
  const isStreaming = state === "partial-call" || state === "input-streaming"
  const statusText = isStreaming ? labels.streaming : labels.executing

  // Show streaming input text for analyze tool
  const inputText = input && typeof input === "object" && "text" in input
    ? (input as { text: string }).text
    : null

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden bg-blue-50/30">
      <div className="flex items-center gap-2 text-xs px-3 py-2">
        <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
        <span className="text-blue-600 font-medium">{statusText}</span>
      </div>
      {isStreaming && inputText && (
        <div className="px-3 pb-2 -mt-0.5">
          <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3 leading-relaxed">{inputText}</p>
        </div>
      )}
    </div>
  )
}

export function ToolDone({
  toolName,
  output,
}: {
  toolName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
}) {
  const [expanded, setExpanded] = useState(false)
  const labels = TOOL_DISPLAY[toolName] || { done: "完成" }

  const displayOutput = (() => {
    if (isAnalyze(toolName) && output) {
      return output
    }
    if (isRetrieve(toolName) && output?.hits) {
      return {
        hits: output.hits.map((h: Record<string, unknown>) => {
          const { text: _text, ...r } = h
          return r
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
        <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
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
