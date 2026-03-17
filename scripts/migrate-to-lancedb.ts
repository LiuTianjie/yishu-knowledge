/**
 * 将 chunks.jsonl 的数据迁移到 LanceDB
 * 运行方式: npx tsx scripts/migrate-to-lancedb.ts
 */
import fs from "fs"
import path from "path"
import * as lancedb from "@lancedb/lancedb"
import OpenAI from "openai"
import { config } from "dotenv"

config({ path: path.resolve(__dirname, "../.env.local") })

const CHUNKS_FILE = path.resolve(__dirname, "../data/chunks.jsonl")
const LANCEDB_DIR = path.resolve(__dirname, "../data/lancedb")
const TABLE_NAME = "yishu"
const BATCH_SIZE = 100

const VOLC_API_KEY = process.env.VOLC_API_KEY || ""
const VOLC_EMBEDDING_MODEL = process.env.VOLC_EMBEDDING_MODEL || "doubao-embedding-text-240715"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

function getEmbedClient(): { client: OpenAI; model: string } {
  if (VOLC_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: VOLC_API_KEY,
        baseURL: "https://ark.cn-beijing.volces.com/api/v3",
      }),
      model: VOLC_EMBEDDING_MODEL,
    }
  }
  return {
    client: new OpenAI({ apiKey: OPENAI_API_KEY }),
    model: "text-embedding-3-small",
  }
}

async function embedTexts(client: OpenAI, model: string, texts: string[]): Promise<number[][]> {
  const resp = await client.embeddings.create({ input: texts, model })
  return resp.data.map((item) => item.embedding)
}

interface Chunk {
  bvid: string
  title: string
  start: number
  end: number
  start_str: string
  text: string
  url: string
}

async function main() {
  // 读取 chunks
  const lines = fs.readFileSync(CHUNKS_FILE, "utf-8").split("\n").filter((l) => l.trim())
  const chunks: Chunk[] = lines.map((l) => JSON.parse(l))
  console.log(`共 ${chunks.length} 个块`)

  // 初始化 LanceDB
  fs.mkdirSync(LANCEDB_DIR, { recursive: true })
  const db = await lancedb.connect(LANCEDB_DIR)

  // 检查是否已有表
  const tableNames = await db.tableNames()
  if (tableNames.includes(TABLE_NAME)) {
    console.log(`表 ${TABLE_NAME} 已存在，将删除重建`)
    await db.dropTable(TABLE_NAME)
  }

  const { client, model } = getEmbedClient()
  console.log(`使用 embedding 模型: ${model}`)

  const allRows: Record<string, unknown>[] = []

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map((c) => c.text)

    const embeddings = await embedTexts(client, model, texts)

    for (let j = 0; j < batch.length; j++) {
      const c = batch[j]
      allRows.push({
        id: String(i + j),
        text: c.text,
        bvid: c.bvid,
        title: c.title,
        start: c.start,
        start_str: c.start_str,
        url: c.url,
        vector: embeddings[j],
      })
    }

    console.log(`  已处理 ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`)
  }

  // 写入 LanceDB
  console.log("写入 LanceDB...")
  await db.createTable(TABLE_NAME, allRows)

  // 验证
  const table = await db.openTable(TABLE_NAME)
  const count = await table.countRows()
  console.log(`迁移完成，共 ${count} 条记录`)
}

main().catch((err) => {
  console.error("迁移失败:", err)
  process.exit(1)
})
