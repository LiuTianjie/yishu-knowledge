import { Mastra } from "@mastra/core"
import { yishuAgent } from "./agents/yishu-agent"
import { storage } from "./storage"

export { storage }

export const mastra = new Mastra({
  agents: { yishuAgent },
  storage,
})
