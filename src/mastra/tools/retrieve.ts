import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { searchVectors } from "../lib/vector-store"
import { getCoversCache } from "../lib/covers"

export const retrieveTool = createTool({
  id: "retrieve-knowledge",
  description:
    "根据知识点列表从一数视频知识库中检索相关内容片段。返回匹配的视频字幕片段及其来源信息，用于辅助解答数学题。",
  inputSchema: z.object({
    knowledge_points: z.array(z.string()).describe("知识点关键词列表"),
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        text: z.string().describe("视频字幕片段"),
        score: z.number().describe("相似度分数"),
        bvid: z.string().describe("B站视频BV号"),
        title: z.string().describe("视频标题"),
        start_str: z.string().describe("时间点"),
        url: z.string().describe("视频链接"),
        cover: z.string().optional().describe("视频封面URL"),
      })
    ),
  }),
  execute: async ({ knowledge_points }) => {
    if (!knowledge_points || knowledge_points.length === 0) {
      return { hits: [] }
    }

    try {
      const rawHits = await searchVectors(knowledge_points)
      const covers = getCoversCache()

      const hits = rawHits.map((h) => ({
        ...h,
        cover: covers[h.bvid] || "",
      }))

      return { hits }
    } catch (e) {
      console.error("retrieveTool error:", e)
      return { hits: [] }
    }
  },
  // 给模型的精简版本，去掉冗长的字幕原文
  toModelOutput: (output) => {
    if (!output || !output.hits) return output
    return {
      hits: output.hits.map((h) => {
        const { text: _text, ...rest } = h
        return rest
      }),
    }
  },
})
