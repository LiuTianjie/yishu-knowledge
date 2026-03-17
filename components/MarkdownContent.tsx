"use client"
import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"

function normalizeLatex(text: string): string {
  return text
    // KaTeX does not reliably support \tag in this rendering mode; remove it.
    .replace(/\\tag\{[^}]*\}/g, "")
    // \[...\] → display math（必须独立段落）
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    // \(...\) → inline math
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
}

function stripVideoSection(text: string): string {
  return text
    .replace(/\n*📹\s*相关(视频|知识点)[\s\S]*$/m, "")
    .replace(/\n*#{1,3}\s*相关(视频|知识点)[\s\S]*$/m, "")
    .trimEnd()
}

function compactSpacing(text: string): string {
  return text
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing markdown horizontal rules to avoid double separators
    // when the extras section also has a top border.
    .replace(/\n\s*(?:-{3,}|\*{3,}|_{3,})\s*$/g, "")
    .trim()
}

function MarkdownContent({ content }: { content: string }) {
  const cleaned = useMemo(
    () => compactSpacing(stripVideoSection(normalizeLatex(content))),
    [content],
  )

  return (
    <div className="prose prose-sm max-w-full min-w-0 text-gray-800 break-words
      [&_p]:mb-1.5 [&_p]:last:mb-0 [&_p]:leading-[2] [&_p]:break-words
      [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1.5 [&_h1]:mt-2.5
      [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-2.5
      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
      [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ul]:space-y-0.5
      [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5 [&_ol]:space-y-0.5
      [&_li]:leading-[2]
      [&_code]:bg-blue-50/50 [&_code]:text-purple-600 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_code]:font-mono [&_code]:break-all
      [&_pre]:bg-[#F8FAFC] [&_pre]:border [&_pre]:border-gray-200/60 [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:shadow-sm
      [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-800 [&_pre_code]:break-normal [&_pre_code]:whitespace-pre
      [&_strong]:font-semibold [&_strong]:text-slate-900
      [&_hr]:my-3 [&_hr]:border-gray-200
      [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/30 [&_blockquote]:bg-blue-50/30 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:pr-4 [&_blockquote]:text-slate-600 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:rounded-r-lg
      [&_.katex-display]:my-2.5 [&_.katex-display]:px-2 [&_.katex-display]:py-2 [&_.katex-display]:bg-gray-50/50 [&_.katex-display]:rounded-xl [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:max-w-full [&_.katex-display]:shadow-sm
      [&_.katex]:text-base [&_.katex]:leading-normal
      [&_.katex-error]:text-slate-600 [&_.katex-error]:bg-amber-50/70 [&_.katex-error]:px-1 [&_.katex-error]:rounded
      hide-scrollbar"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }], rehypeRaw]}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  )
}

export default memo(MarkdownContent)
