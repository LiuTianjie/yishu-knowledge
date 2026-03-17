import { tool } from "ai";
import { z } from "zod";
import { searchVectorsBatch } from "@/lib/vector-store";
import { getCoversCache } from "@/lib/covers";

const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_CACHE_MAX_SIZE = 500;
const queryCache = new Map<
  string,
  { ts: number; hits: Awaited<ReturnType<typeof searchVectorsBatch>>[number] }
>();

function normalizeQuery(kps: string[]): string {
  return kps
    .map((k) => k.trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

function pruneQueryCache(now: number) {
  for (const [key, value] of queryCache) {
    if (now - value.ts >= QUERY_CACHE_TTL_MS) {
      queryCache.delete(key);
    }
  }

  if (queryCache.size <= QUERY_CACHE_MAX_SIZE) return;

  const sorted = Array.from(queryCache.entries()).sort(
    (a, b) => a[1].ts - b[1].ts,
  );
  const removeCount = queryCache.size - QUERY_CACHE_MAX_SIZE;
  for (let i = 0; i < removeCount; i++) {
    queryCache.delete(sorted[i][0]);
  }
}

export const retrieveTool = tool({
  description:
    "按题目分别检索视频知识库。每道题传入其序号和知识点，返回按题目分组的检索结果。",
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          question_index: z.number().describe("题目序号，从1开始"),
          knowledge_points: z.array(z.string()).describe("该题的知识点列表"),
        }),
      )
      .describe("每道题的序号和知识点"),
  }),
  execute: async ({ questions }) => {
    if (!questions || questions.length === 0) {
      return { results: [] };
    }

    const covers = getCoversCache();
    const now = Date.now();
    pruneQueryCache(now);
    const localCache = new Map<
      string,
      Awaited<ReturnType<typeof searchVectorsBatch>>[number]
    >();

    const misses = new Map<string, string[]>();
    for (const q of questions) {
      if (!q.knowledge_points || q.knowledge_points.length === 0) continue;
      const queryKey = normalizeQuery(q.knowledge_points);
      if (localCache.has(queryKey)) continue;

      const cached = queryCache.get(queryKey);
      if (cached && now - cached.ts < QUERY_CACHE_TTL_MS) {
        localCache.set(queryKey, cached.hits);
        continue;
      }
      if (!misses.has(queryKey)) {
        misses.set(queryKey, q.knowledge_points);
      }
    }

    if (misses.size > 0) {
      const missEntries = Array.from(misses.entries());
      const missQueryKeys = missEntries.map(([key]) => key);
      const missQueryGroups = missEntries.map(([, kps]) => kps);
      const batchedHits = await searchVectorsBatch(missQueryGroups);

      missQueryKeys.forEach((key, idx) => {
        const hits = batchedHits[idx] || [];
        localCache.set(key, hits);
        queryCache.set(key, { ts: now, hits });
      });
    }

    const results = await Promise.all(
      questions.map(async (q) => {
        if (!q.knowledge_points || q.knowledge_points.length === 0) {
          return {
            question_index: q.question_index,
            knowledge_points: q.knowledge_points,
            hits: [],
          };
        }
        try {
          const queryKey = normalizeQuery(q.knowledge_points);
          const rawHits = localCache.get(queryKey) || [];

          const hits = rawHits.map(({ text: _text, ...rest }) => ({
            ...rest,
            cover: covers[rest.bvid] || "",
          }));
          return {
            question_index: q.question_index,
            knowledge_points: q.knowledge_points,
            hits,
          };
        } catch (e) {
          console.error(
            `retrieveTool error for question ${q.question_index}:`,
            e,
          );
          return {
            question_index: q.question_index,
            knowledge_points: q.knowledge_points,
            hits: [],
          };
        }
      }),
    );

    return { results };
  },
});
