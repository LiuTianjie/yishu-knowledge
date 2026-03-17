"use client"
import { useState } from "react"

const TOOL_DISPLAY: Record<string, { loading: string; done: string }> = {
  "ocrTool": { loading: "识别图片中…", done: "图片识别完成" },
  "ocr-image": { loading: "识别图片中…", done: "图片识别完成" },
  "analyzeTool": { loading: "分析题目中…", done: "题目分析完成" },
  "analyze-question": { loading: "分析题目中…", done: "题目分析完成" },
  "retrieveTool": { loading: "检索知识点中…", done: "知识点检索完成" },
  "retrieve-knowledge": { loading: "检索知识点中…", done: "知识点检索完成" },
}

function isRetrieve(name: string) {
  return name === "retrieve-knowledge" || name === "retrieveTool"
}

export function ToolLoading({ toolName }: { toolName: string }) {
  const labels = TOOL_DISPLAY[toolName] || { loading: "处理中…" }
  return (
    <div className="flex items-center gap-2 text-xs px-1 py-1">
      <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
      <span className="text-gray-400">{labels.loading}</span>
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
    if (isRetrieve(toolName) && output?.hits) {
      return {
        ...output,
        hits: output.hits.map((h: Record<string, unknown>) => {
          const { text: _text, ...rest } = h
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
