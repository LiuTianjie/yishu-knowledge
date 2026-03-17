import { createOpenAI } from "@ai-sdk/openai"
import OpenAI from "openai"

// AI SDK provider（用于 agent 的 model 参数）
export const volcEngine = createOpenAI({
  name: "volc-engine",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.VOLC_API_KEY!,
})

// OpenAI 兼容客户端（用于 tool 内部调用 embedding、vision 等）
export const volcClient = new OpenAI({
  apiKey: process.env.VOLC_API_KEY!,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
})
