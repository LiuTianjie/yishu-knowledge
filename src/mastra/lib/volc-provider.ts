import { createOpenAI } from "@ai-sdk/openai"
import OpenAI from "openai"

// 自定义 fetch：火山引擎 API 要求所有 messages 都有 content，
// 但 Mastra 多步工具调用时可能产生缺少 content 的 tool/assistant 消息。
// 在请求发出前统一修补。
const volcFetch: typeof globalThis.fetch = async (input, init) => {
  if (init?.body && typeof init.body === "string") {
    try {
      const payload = JSON.parse(init.body)
      if (Array.isArray(payload.messages)) {
        let patched = false
        for (const msg of payload.messages) {
          if (msg.role === "tool" && msg.content == null) {
            msg.content = '{"error":"tool execution failed"}'
            patched = true
          }
          if (msg.role === "assistant" && msg.content === undefined) {
            msg.content = ""
            patched = true
          }
        }
        if (patched) {
          init = { ...init, body: JSON.stringify(payload) }
        }
      }
    } catch {
      // not JSON, pass through
    }
  }
  return globalThis.fetch(input, init)
}

// AI SDK provider（用于 agent 的 model 参数）
export const volcEngine = createOpenAI({
  name: "volc-engine",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.VOLC_API_KEY!,
  fetch: volcFetch,
})

// OpenAI 兼容客户端（用于 tool 内部调用 embedding、vision 等）
export const volcClient = new OpenAI({
  apiKey: process.env.VOLC_API_KEY!,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
})
