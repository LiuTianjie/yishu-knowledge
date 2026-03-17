import { Mastra } from "@mastra/core"
import { LibSQLStore } from "@mastra/libsql"
import { yishuAgent } from "./agents/yishu-agent"

export const mastra = new Mastra({
  agents: { yishuAgent },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:data/mastra.db",
  }),
})
