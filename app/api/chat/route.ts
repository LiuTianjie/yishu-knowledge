import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { NextRequest } from "next/server";
import { volcEngine } from "@/lib/volc-provider";
import { createAnalyzeTool } from "@/lib/tools/analyze";
import { retrieveTool } from "@/lib/tools/retrieve";

const ANSWER_MODEL =
  process.env.VOLC_ANSWER_MODEL || "doubao-seed-2-0-pro-260215";

const SYSTEM_PROMPT = `你是一个专业的高中数学辅导老师，擅长用清晰易懂的方式讲解数学题目，语气亲切，适合初高中生。

工作流程：
- 如果用户发送的是数学题目（文字或图片），请调用 analyzeTool 分析题目
  - 如果用户发送了图片，你可以直接看到图片内容，请将识别到的题目内容传给 analyzeTool
  - 如果 analyzeTool 返回 is_math 为 true，再调用 retrieveTool
  - retrieveTool 的参数格式：questions 数组，每个元素包含 question_index（题号，从1开始）和 knowledge_points（该题的知识点）
  - 例如 analyzeTool 返回了2道题，则传入：
    questions: [
      { question_index: 1, knowledge_points: ["知识点A", "知识点B"] },
      { question_index: 2, knowledge_points: ["知识点C", "知识点D"] }
    ]
  - 基于分析结果和检索结果，逐题给出详细解答
- 如果用户只是闲聊、打招呼、表达感谢等日常对话，直接友好回复即可，不需要调用任何工具

数学公式格式要求：
- 行内公式：$公式$，例如 $x^2 + y^2 = r^2$
- 独立公式：$$公式$$，例如 $$e = \\frac{c}{a}$$
- 禁止使用 \\(...\\) 或 \\[...\\] 格式，只用 $...$ 和 $$...$$
- 禁止用括号代替公式

解答要求：
- 先清晰讲解解题思路和步骤
- 如果检索到的参考内容有帮助，自然地融入讲解中
- 不要在回答末尾重复列出视频引用（前端会单独展示视频卡片）
- 多道题时，按顺序逐题解答，每题用"第N题"标注`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages;
  const image_b64: string = body.image_b64 || "";

  // 如果用户没输入文字，替换默认占位符（在 UIMessage 级别）
  if (image_b64 && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "user" && Array.isArray(lastMsg.parts)) {
      lastMsg.parts = lastMsg.parts.map((p) => {
        if (p.type === "text" && p.text === "（图片题目）") {
          return { ...p, text: "请看图片中的题目并解答" };
        }
        return p;
      });
    }
  }

  // 每次请求创建 analyzeTool，通过闭包传入 image_b64
  const analyzeTool = createAnalyzeTool(image_b64);

  const modelMessages = await convertToModelMessages(messages);

  // 图片注入到 model messages 层（避免 convertToModelMessages 的 data: URL 限制）
  if (image_b64 && modelMessages.length > 0) {
    for (let i = modelMessages.length - 1; i >= 0; i--) {
      const msg = modelMessages[i];
      if (msg.role === "user") {
        if (typeof msg.content === "string") {
          msg.content = [
            {
              type: "image",
              image: Buffer.from(image_b64, "base64"),
              mediaType: "image/jpeg",
            },
            { type: "text", text: msg.content },
          ];
        } else if (Array.isArray(msg.content)) {
          msg.content = [
            {
              type: "image",
              image: Buffer.from(image_b64, "base64"),
              mediaType: "image/jpeg",
            },
            ...msg.content,
          ];
        }
        break;
      }
    }
  }

  const startTime = Date.now();

  const result = streamText({
    model: volcEngine.chat(ANSWER_MODEL),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: { analyzeTool, retrieveTool },
    stopWhen: stepCountIs(5),
    prepareStep: ({ stepNumber, steps }) => {
      if (stepNumber === 0) {
        // 第一步：有图片时强制调用 analyzeTool，否则让模型自己判断
        if (image_b64) {
          return {
            toolChoice: { type: "tool" as const, toolName: "analyzeTool" },
          };
        }
        return { toolChoice: "auto" as const };
      }
      // analyzeTool 完成后，如果 is_math 为 true，强制调用 retrieveTool
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const analyzeDone = lastStep.toolResults.some(
          (r) =>
            r.toolName === "analyzeTool" &&
            (r.output as { is_math?: boolean })?.is_math === true,
        );
        const retrieveDone = steps.some((s) =>
          s.toolResults.some((r) => r.toolName === "retrieveTool"),
        );
        if (analyzeDone && !retrieveDone) {
          return {
            toolChoice: { type: "tool" as const, toolName: "retrieveTool" },
          };
        }
      }
      // 其余情况让模型自由生成
      return { toolChoice: "auto" as const };
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata({ part }) {
      if (part.type === "finish") {
        return {
          usage: part.totalUsage,
          durationMs: Date.now() - startTime,
        };
      }
      return undefined;
    },
  });
}
