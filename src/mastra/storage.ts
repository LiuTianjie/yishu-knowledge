import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { LibSQLStore } from "@mastra/libsql"
import { Memory } from "@mastra/memory"

const mastraDataDir = join(process.cwd(), "data")
mkdirSync(mastraDataDir, { recursive: true })

export const storage = new LibSQLStore({
  id: "mastra-storage",
  url: `file:${join(mastraDataDir, "mastra.db")}`,
})

export const memory = new Memory({
  storage,
  options: { lastMessages: 20 },
})
