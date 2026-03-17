import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { volcClient } from "../lib/volc-provider"

const VISION_MODEL = process.env.VOLC_VISION_MODEL || "doubao-seed-2-0-pro-260215"

// Request-scoped image: set by route.ts before stream, consumed once by execute
let pendingImageB64 = ""
export function setAnalyzeImage(b64: string) {
  pendingImageB64 = b64
}

const ANALYZE_PROMPT = `你是数学知识点提取专家。分析下面的内容，提取涉及的数学知识点。

输出纯 JSON（不要 markdown 代码块）：

如果是数学题目：
{
  "is_math": true,
  "questions": [
    {"text": "题目原文", "knowledge_points": ["知识点1", "知识点2", "知识点3"]},
    ...
  ]
}

要求：
- 每道题**必须**提取 3-5 个知识点，绝对不允许为空数组
- 知识点应为高中数学术语，例如：三角恒等变换、余弦定理、正弦定理、面积公式、二倍角公式、对数运算、向量点积、导数求极值、等差数列、椭圆方程等
- 既包含具体方法也包含所属领域
- 如果是多道题，每道题单独一个对象
- 每个知识点不超过8个字
- 如果有图片，直接从图片中识别题目内容

如果是普通对话/非数学内容：
{"is_math": false, "questions": []}`

// Fallback keywords for when LLM returns empty knowledge_points
const MATH_KEYWORDS = [
  "函数", "方程", "不等式", "三角", "向量", "数列", "导数", "积分",
  "概率", "统计", "几何", "圆锥曲线", "椭圆", "双曲线", "抛物线",
  "对数", "指数", "正弦", "余弦", "正切", "面积", "体积", "极值",
  "最值", "单调", "奇偶", "周期", "集合", "逻辑", "复数", "排列", "组合",
  "二项式", "等差", "等比", "极坐标", "参数方程", "恒等变换", "数列求和",
]

export const analyzeTool = createTool({
  id: "analyze-question",
  description:
    "分析用户输入：判断是否为数学题，拆分多道题目，提取每道题的核心知识点。",
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
    // Consume pending image (set by route.ts)
    const imageB64 = pendingImageB64
    pendingImageB64 = ""

    // Step 1: Analyze with vision model (supports both text and image)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [{ type: "text", text: `${ANALYZE_PROMPT}\n\n内容：${text}` }]
    if (imageB64) {
      userContent.unshift({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageB64}` },
      })
    }

    const resp = await volcClient.chat.completions.create({
      model: VISION_MODEL,
      messages: [{ role: "user", content: userContent }],
      temperature: 0,
      max_tokens: 800,
    })

    let raw = resp.choices[0].message.content?.trim() || "{}"
    raw = raw.replace(/^```json?\s*/, "").replace(/```\s*$/, "")

    let analysis: { is_math: boolean; questions: { text: string; knowledge_points: string[] }[] }
    try {
      const parsed = JSON.parse(raw)
      analysis = {
        is_math: Boolean(parsed.is_math),
        questions:
          parsed.questions?.length > 0
            ? parsed.questions
            : [{ text, knowledge_points: [] }],
      }
    } catch {
      analysis = { is_math: true, questions: [{ text, knowledge_points: [] }] }
    }

    // Fallback: if LLM returned no knowledge points, extract from text
    if (analysis.is_math) {
      let allKPs = analysis.questions.flatMap(q => q.knowledge_points)
      if (allKPs.length === 0) {
        const found = MATH_KEYWORDS.filter(kw => text.includes(kw))
        allKPs = found.length > 0
          ? found.slice(0, 5)
          : [text.replace(/[A-D]\.\s*\$[^$]*\$/g, "").slice(0, 100)]
        for (const q of analysis.questions) {
          if (q.knowledge_points.length === 0) q.knowledge_points = allKPs
        }
      }
    }

    return analysis
  },
})
