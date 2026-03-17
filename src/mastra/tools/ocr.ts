import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { volcClient } from "../lib/volc-provider"

const VISION_MODEL = process.env.VOLC_VISION_MODEL || "doubao-seed-2-0-pro-260215"

export const ocrTool = createTool({
  id: "ocr-image",
  description: "识别图片中的数学题目文字。当用户上传了题目图片时调用此工具，将图片内容转录为文字。",
  inputSchema: z.object({
    image_b64: z.string().describe("Base64编码的图片数据"),
  }),
  outputSchema: z.object({
    text: z.string().describe("识别出的题目文字"),
  }),
  execute: async ({ image_b64 }) => {
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
    return { text: resp.choices[0].message.content?.trim() || "" }
  },
})
