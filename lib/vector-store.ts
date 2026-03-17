import * as lancedb from "@lancedb/lancedb";
import path from "path";
import { volcClient } from "./volc-provider";

const DB_PATH = path.resolve(process.cwd(), "data/lancedb");
const TABLE_NAME = "yishu";
const SIMILARITY_THRESHOLD = 0.55;
const EMBEDDING_MODEL =
  process.env.VOLC_EMBEDDING_MODEL || "doubao-embedding-text-240715";

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;

async function getTable(): Promise<lancedb.Table | null> {
  if (!table) {
    try {
      db = await lancedb.connect(DB_PATH);
      table = await db.openTable(TABLE_NAME);
    } catch (e) {
      console.error(`LanceDB: failed to open table '${TABLE_NAME}':`, e);
      return null;
    }
  }
  return table;
}

export interface SearchHit {
  text: string;
  score: number;
  bvid: string;
  title: string;
  start_str: string;
  url: string;
}

function mapRowsToHits(rows: Array<Record<string, unknown>>): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const row of rows) {
    const distance = typeof row._distance === "number" ? row._distance : 0;
    const score = 1 - distance;
    if (score >= SIMILARITY_THRESHOLD) {
      hits.push({
        text: String(row.text ?? ""),
        score: Math.round(score * 1000) / 1000,
        bvid: String(row.bvid ?? ""),
        title: String(row.title ?? ""),
        start_str: String(row.start_str ?? ""),
        url: String(row.url ?? ""),
      });
    }
  }
  return hits;
}

export async function searchVectors(
  knowledgePoints: string[],
  topK: number = 4,
): Promise<SearchHit[]> {
  const query = knowledgePoints.join(" ");

  const resp = await volcClient.embeddings.create({
    input: [query],
    model: EMBEDDING_MODEL,
  });
  const queryVec = resp.data[0].embedding;

  const tbl = await getTable();
  if (!tbl) return [];
  const results = await tbl
    .query()
    .nearestTo(queryVec)
    .distanceType("cosine")
    .limit(topK)
    .toArray();

  return mapRowsToHits(results as Array<Record<string, unknown>>);
}

export async function searchVectorsBatch(
  queryGroups: string[][],
  topK: number = 4,
): Promise<SearchHit[][]> {
  if (queryGroups.length === 0) return [];

  const queries = queryGroups.map((kps) => kps.join(" "));
  const resp = await volcClient.embeddings.create({
    input: queries,
    model: EMBEDDING_MODEL,
  });

  const vectors = resp.data.map((d) => d.embedding);
  const tbl = await getTable();
  if (!tbl) return queryGroups.map(() => []);

  const results = await Promise.all(
    vectors.map(async (vec) => {
      const rows = await tbl
        .query()
        .nearestTo(vec)
        .distanceType("cosine")
        .limit(topK)
        .toArray();
      return mapRowsToHits(rows as Array<Record<string, unknown>>);
    }),
  );

  return results;
}
