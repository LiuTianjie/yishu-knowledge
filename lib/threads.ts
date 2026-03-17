import { createClient } from "@libsql/client";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const db = createClient({
  url: `file:${join(dataDir, "mastra.db")}`,
});

// 复用 Mastra 已创建的 mastra_threads 表，但如果是全新环境则自动建表
const ensureTable = db.execute(`
  CREATE TABLE IF NOT EXISTS mastra_threads (
    id TEXT PRIMARY KEY NOT NULL,
    resourceId TEXT NOT NULL,
    title TEXT NOT NULL,
    metadata TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

const ensureMessagesTable = db.execute(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    threadId TEXT PRIMARY KEY NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    updatedAt TEXT NOT NULL
  )
`);

export interface Thread {
  id: string;
  title: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

const RESOURCE_ID = "default-user";

export async function listThreads(): Promise<Thread[]> {
  await ensureTable;
  const result = await db.execute({
    sql: "SELECT id, title, resourceId, createdAt, updatedAt, metadata FROM mastra_threads WHERE resourceId = ? ORDER BY createdAt DESC",
    args: [RESOURCE_ID],
  });
  return result.rows.map(rowToThread);
}

export async function createThread(title: string): Promise<Thread> {
  await ensureTable;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: "INSERT INTO mastra_threads (id, resourceId, title, metadata, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, RESOURCE_ID, title, "{}", now, now],
  });
  return {
    id,
    title,
    resourceId: RESOURCE_ID,
    createdAt: now,
    updatedAt: now,
    metadata: {},
  };
}

export async function updateThread(id: string, title: string): Promise<Thread> {
  await ensureTable;
  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE mastra_threads SET title = ?, updatedAt = ? WHERE id = ?",
    args: [title, now, id],
  });
  const result = await db.execute({
    sql: "SELECT id, title, resourceId, createdAt, updatedAt, metadata FROM mastra_threads WHERE id = ?",
    args: [id],
  });
  return rowToThread(result.rows[0]);
}

export async function deleteThread(id: string): Promise<void> {
  await ensureTable;
  await ensureMessagesTable;
  await db.execute({
    sql: "DELETE FROM mastra_threads WHERE id = ?",
    args: [id],
  });
  await db.execute({
    sql: "DELETE FROM chat_messages WHERE threadId = ?",
    args: [id],
  });
}

function rowToThread(row: Record<string, unknown>): Thread {
  // libsql returns rows as objects with Value types
  const r = row as Record<string, string | null>;
  let metadata: Record<string, unknown> = {};
  if (r.metadata) {
    try {
      metadata = JSON.parse(r.metadata);
    } catch {
      /* ignore */
    }
  }
  return {
    id: r.id!,
    title: r.title!,
    resourceId: r.resourceId!,
    createdAt: r.createdAt!,
    updatedAt: r.updatedAt!,
    metadata,
  };
}

export async function getMessages(threadId: string): Promise<unknown[]> {
  await ensureMessagesTable;
  const result = await db.execute({
    sql: "SELECT messages FROM chat_messages WHERE threadId = ?",
    args: [threadId],
  });
  if (result.rows.length === 0) return [];
  try {
    return JSON.parse(result.rows[0].messages as string);
  } catch {
    return [];
  }
}

export async function saveMessages(
  threadId: string,
  messages: unknown[],
): Promise<void> {
  await ensureMessagesTable;
  const now = new Date().toISOString();
  const json = JSON.stringify(messages);
  await db.execute({
    sql: `INSERT INTO chat_messages (threadId, messages, updatedAt) VALUES (?, ?, ?)
          ON CONFLICT(threadId) DO UPDATE SET messages = excluded.messages, updatedAt = excluded.updatedAt`,
    args: [threadId, json, now],
  });
}
