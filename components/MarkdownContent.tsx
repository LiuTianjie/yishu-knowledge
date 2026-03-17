"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"

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

export default function MarkdownContent({ content }: { content: string }) {
  const cleaned = stripVideoSection(normalizeLatex(content))

  return (
    <div className="prose prose-sm max-w-none text-gray-800
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
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  )
}
