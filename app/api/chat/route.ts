import { handleChatStream } from "@mastra/ai-sdk"
import { createUIMessageStreamResponse } from "ai"
import { NextRequest } from "next/server"
import { mastra } from "@/mastra/index"
import { setAnalyzeImage } from "@/mastra/tools/analyze"

export async function POST(req: NextRequest) {
  const params = await req.json()
  const image_b64: string = params.image_b64 || ""

  // 如果有图片，注入 FileUIPart 到最后一条用户消息（模型直接看图）
  if (image_b64 && Array.isArray(params.messages) && params.messages.length > 0) {
    const lastMsg = params.messages[params.messages.length - 1]
    if (lastMsg.role === "user" && Array.isArray(lastMsg.parts)) {
      // 在文本前面插入图片 part
      lastMsg.parts.unshift({
        type: "file",
        mediaType: "image/jpeg",
        url: `data:image/jpeg;base64,${image_b64}`,
      })
      // 如果用户没输入文字，替换默认占位符
      lastMsg.parts = lastMsg.parts.map(
        (p: { type: string; text?: string }) => {
          if (p.type === "text" && p.text === "（图片题目）") {
            return { ...p, text: "请看图片中的题目并解答" }
          }
          return p
        }
      )
    }
  }

  // 清理 params 中的非标准字段
  delete params.image_b64

  // 把图片传给 analyzeTool（请求级变量，tool 执行时消费一次）
  setAnalyzeImage(image_b64)

  // 将 threadId/resourceId 转换为 Mastra memory 格式
  const threadId = params.threadId
  const resourceId = params.resourceId || "default-user"
  delete params.threadId
  delete params.resourceId

  if (threadId) {
    params.memory = { thread: threadId, resource: resourceId }
  }

  // 强制工具调用顺序：step0 → analyzeTool, step1 → retrieveTool (if math), step2+ → auto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params.prepareStep = ({ stepNumber, steps }: { stepNumber: number; steps: any[] }) => {
    if (stepNumber === 0) {
      // 第一步必须调用 analyzeTool
      return { toolChoice: { type: "tool" as const, toolName: "analyzeTool" } }
    }
    if (stepNumber === 1 && steps.length > 0) {
      // 检查第一步 analyzeTool 是否返回 is_math: true
      const analyzeResults = steps[0]?.toolResults || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isMath = analyzeResults.some((r: any) => r.output?.is_math === true)
      if (isMath) {
        return { toolChoice: { type: "tool" as const, toolName: "retrieveTool" } }
      }
    }
    // 后续步骤让模型自由生成
    return { toolChoice: "auto" as const }
  }

  const stream = await handleChatStream({
    mastra,
    agentId: "yishuAgent",
    params,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createUIMessageStreamResponse({ stream: stream as any })
}
