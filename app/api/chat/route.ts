import { handleChatStream } from "@mastra/ai-sdk"
import { createUIMessageStreamResponse } from "ai"
import { NextRequest } from "next/server"
import { mastra } from "@/mastra/index"
import { volcClient } from "@/mastra/lib/volc-provider"

const VISION_MODEL = process.env.VOLC_VISION_MODEL || "doubao-seed-2-0-pro-260215"

async function ocrImage(image_b64: string): Promise<string> {
  const resp = await volcClient.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_b64}` } },
          { type: "text", text: "请将图片中的数学题目完整转录为文字，保留所有数学符号和公式，不要解答，只转录题目内容。" },
        ],
      },
    ],
    temperature: 0,
  })
  return resp.choices[0].message.content?.trim() || ""
}

export async function POST(req: NextRequest) {
  const params = await req.json()
  const image_b64 = params.image_b64 || ""

  // 如果有图片，先 OCR 再注入到最后一条用户消息
  if (image_b64 && Array.isArray(params.messages) && params.messages.length > 0) {
    try {
      const ocrText = await ocrImage(image_b64)
      if (ocrText) {
        const lastMsg = params.messages[params.messages.length - 1]
        if (lastMsg.role === "user" && Array.isArray(lastMsg.parts)) {
          lastMsg.parts = lastMsg.parts.map((p: { type: string; text?: string }) => {
            if (p.type === "text") {
              const original = p.text || ""
              const enriched = original === "（图片题目）"
                ? `[图片识别结果]\n${ocrText}\n\n请解答以上题目`
                : `[图片识别结果]\n${ocrText}\n\n${original}`
              return { ...p, text: enriched }
            }
            return p
          })
        }
      }
    } catch (e) {
      console.error("OCR failed:", e)
    }
  }

  // 清理 params 中的非标准字段
  delete params.image_b64

  // 将 threadId/resourceId 转换为 Mastra memory 格式
  const threadId = params.threadId
  const resourceId = params.resourceId || "default-user"
  delete params.threadId
  delete params.resourceId

  if (threadId) {
    params.memory = { thread: threadId, resource: resourceId }
  }

  const stream = await handleChatStream({
    mastra,
    agentId: "yishuAgent",
    params,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createUIMessageStreamResponse({ stream: stream as any })
}
