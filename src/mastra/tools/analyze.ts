import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { volcClient } from "../lib/volc-provider"

const CHAT_MODEL = process.env.VOLC_CHAT_MODEL || "doubao-1-5-pro-32k-250115"

export const analyzeTool = createTool({
  id: "analyze-question",
  description:
    "分析用户输入：判断是否为数学题，拆分多道题目，提取每道题的核心知识点。对于所有用户的题目输入都应首先调用此工具。",
  inputSchema: z.object({
    text: z.string().describe("用户输入的题目文本"),
  }),
  outputSchema: z.object({
    is_math: z.boolean().describe("是否为数学题"),
    questions: z.array(
      z.object({
        text: z.string().describe("题目原文"),
        knowledge_points: z.array(z.string()).describe("知识点列表"),
      })
    ),
  }),
  execute: async ({ text }) => {
    const resp = await volcClient.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "user",
          content: `分析下面的内容，输出 JSON（不要 markdown 代码块）：

如果是数学题目：
{
  "is_math": true,
  "questions": [
    {"text": "题目原文", "knowledge_points": ["知识点1", "知识点2", "知识点3"]},
    ...
  ]
}

如果是多道题，每道题单独一个对象。知识点用3-5个简短词组（每个不超过8字）。

如果是普通对话/非数学内容：
{"is_math": false, "questions": []}

内容：${text}`,
        },
      ],
      temperature: 0,
      max_tokens: 800,
    })

    let raw = resp.choices[0].message.content?.trim() || "{}"
    raw = raw.replace(/^```json?\s*/, "").replace(/```\s*$/, "")

    try {
      const result = JSON.parse(raw)
      return {
        is_math: Boolean(result.is_math),
        questions:
          result.questions?.length > 0
            ? result.questions
            : [{ text, knowledge_points: [] }],
      }
    } catch {
      return { is_math: true, questions: [{ text, knowledge_points: [] }] }
    }
  },
})
