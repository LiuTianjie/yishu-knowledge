import * as lancedb from "@lancedb/lancedb"
import path from "path"
import { volcClient } from "./volc-provider"

const DB_PATH = path.resolve(process.cwd(), "data/lancedb")
const TABLE_NAME = "yishu"
const SIMILARITY_THRESHOLD = 0.55
const EMBEDDING_MODEL = process.env.VOLC_EMBEDDING_MODEL || "doubao-embedding-text-240715"

let db: lancedb.Connection | null = null
let table: lancedb.Table | null = null

async function getTable(): Promise<lancedb.Table | null> {
  if (!table) {
    try {
      db = await lancedb.connect(DB_PATH)
      table = await db.openTable(TABLE_NAME)
    } catch (e) {
      console.error(`LanceDB: failed to open table '${TABLE_NAME}':`, e)
      return null
    }
  }
  return table
}

export interface SearchHit {
  text: string
  score: number
  bvid: string
  title: string
  start_str: string
  url: string
}

export async function searchVectors(
  knowledgePoints: string[],
  topK: number = 4
): Promise<SearchHit[]> {
  const query = knowledgePoints.join(" ")

  // 获取 embedding
  const resp = await volcClient.embeddings.create({
    input: [query],
    model: EMBEDDING_MODEL,
  })
  const queryVec = resp.data[0].embedding

  const tbl = await getTable()
  if (!tbl) return []
  const results = await tbl
    .query()
    .nearestTo(queryVec)
    .distanceType("cosine")
    .limit(topK)
    .toArray()

  const hits: SearchHit[] = []
  for (const row of results) {
    // LanceDB 返回 _distance（L2）或 cosine distance，需要转换
    const score = 1 - (row._distance ?? 0)
    if (score >= SIMILARITY_THRESHOLD) {
      hits.push({
        text: row.text,
        score: Math.round(score * 1000) / 1000,
        bvid: row.bvid,
        title: row.title,
        start_str: row.start_str,
        url: row.url,
      })
    }
  }
  return hits
}
