# 一数知识问答系统（架构文档）

本项目是一个以高中数学问答为核心的 AI 应用，支持：

- 文本/图片题目输入
- 工具链分析与知识点检索
- 按题分组的视频知识点关联展示
- 线程化会话持久化

技术栈：Next.js App Router + AI SDK v6 + VolcEngine(OpenAI 兼容) + LanceDB + libSQL。

---

## 1. 架构总览

系统由四层组成：

1. 表现层（UI）
- 聊天布局、消息渲染、步骤状态、知识点与视频卡片。

2. 接入层（API Route）
- Chat API 负责模型编排与工具调用。
- Threads API 负责会话线程与消息持久化。

3. 领域层（Tools）
- analyzeTool：数学题识别、多题拆分、知识点提取。
- retrieveTool：按题检索视频片段（支持缓存与批量 embedding）。

4. 数据层（Storage + Vector）
- libSQL：线程与消息持久化。
- LanceDB：向量召回。
- covers.json：视频封面缓存。

---

## 2. 目录与职责（严格映射当前代码）

### 2.1 页面与 API

- `app/page.tsx`：应用入口页面。
- `app/api/chat/route.ts`：AI 问答主链路。
- `app/api/threads/route.ts`：线程列表与创建。
- `app/api/threads/[id]/route.ts`：线程更新与删除。
- `app/api/threads/[id]/messages/route.ts`：消息读取与保存。

### 2.2 前端组件

- `components/ChatLayout.tsx`：整体布局（侧栏 + 主面板）。
- `components/Sidebar.tsx`：线程导航。
- `components/ChatPanel.tsx`：会话容器、滚动控制、消息加载与保存。
- `components/ChatMessage.tsx`：单条消息渲染（文本、步骤、知识点、视频）。
- `components/ToolStatus.tsx`：步骤状态条（分析/检索/回答）。
- `components/MarkdownContent.tsx`：Markdown + KaTeX 渲染。
- `components/VideoCard.tsx`：视频卡片渲染。
- `components/ChatInput.tsx`：输入框与图片上传。
- `components/EmptyState.tsx`：空状态引导。

### 2.3 业务与数据

- `lib/volc-provider.ts`：VolcEngine Provider 与 OpenAI 兼容 client。
- `lib/tools/analyze.ts`：题目分析工具。
- `lib/tools/retrieve.ts`：知识点检索工具。
- `lib/vector-store.ts`：LanceDB 查询与 embedding。
- `lib/threads.ts`：线程/消息持久化（libSQL）。
- `lib/covers.ts`：封面缓存读取。

### 2.4 脚本

- `scripts/migrate-to-lancedb.ts`：将 `data/chunks.jsonl` 迁移为 LanceDB 向量表。

---

## 3. 端到端时序

### 3.1 聊天请求主链路

入口：`POST /api/chat`

1. 前端提交消息（可含 `image_b64`）。
2. API 层转换 `UIMessage -> ModelMessage`，并在服务端注入图片 Buffer。
3. 启动 `streamText`，挂载工具：`analyzeTool`、`retrieveTool`。
4. `prepareStep` 编排：
- 第一步：图片场景强制 `analyzeTool`，文本场景 `auto`。
- 若 `analyzeTool.is_math === true` 且未检索，强制 `retrieveTool`。
- 其余步骤由模型自由生成。
5. 流式返回 UIMessage；结束时追加 `usage` 与 `durationMs` 元数据。

### 3.2 分析工具链路（analyzeTool）

1. 构造 prompt + 文本内容；有图时附 `image_url`。
2. 路由模型：
- 图片题：`VOLC_VISION_MODEL`
- 文本题：`VOLC_ANALYZE_TEXT_MODEL`（或回退到答题模型）
3. 使用低温、限制 `max_tokens` 产出结构化 JSON。
4. 超时降级与关键词回填，保证输出结构稳定。

### 3.3 检索工具链路（retrieveTool）

1. 按题处理 `questions[]`。
2. 规范化知识点作为 query key。
3. 两级缓存：
- 请求内缓存（localCache）
- 进程级短期缓存（TTL + 上限淘汰）
4. 对 miss 的 query 走 `searchVectorsBatch` 批量 embedding。
5. LanceDB 余弦检索，过滤阈值后返回 hits。
6. 合并封面信息返回前端。

---

## 4. 数据存储架构

### 4.1 线程与消息（libSQL）

文件：`data/mastra.db`

表：

- `mastra_threads`
	- `id` / `resourceId` / `title` / `metadata` / `createdAt` / `updatedAt`
- `chat_messages`
	- `threadId` / `messages` / `updatedAt`

说明：启动时会自动 `CREATE TABLE IF NOT EXISTS`，无需手动建表。

### 4.2 向量检索（LanceDB）

目录：`data/lancedb`

表：`yishu`

核心字段：

- `text`
- `bvid`
- `title`
- `start_str`
- `url`
- `vector`

---

## 5. 性能设计（当前实现）

### 已实现

1. 前端流式减压
- streaming 期间消息轻渲染，降低 Markdown/KaTeX 重算成本。
- `ChatMessage` 与 `MarkdownContent` 做 memo 优化。

2. 后端检索优化
- 批量 embedding（`searchVectorsBatch`）。
- 缓存 TTL + 最大容量淘汰。

3. 分析工具降时延
- 文本/图片分模型。
- 降低分析 token 上限。
- analyze 超时降级。

### 仍建议继续

1. 在 `app/api/chat/route.ts` 增加分段耗时埋点（analyze/retrieve/answer first token）。
2. 会话窗口裁剪（长会话减少上下文 token）。
3. 对高频 query 引入持久化缓存（Redis/SQLite 预计算）。

---

## 6. 环境变量

最小必需：

- `VOLC_API_KEY`

可选：

- `VOLC_ANSWER_MODEL`
- `VOLC_VISION_MODEL`
- `VOLC_ANALYZE_TEXT_MODEL`
- `VOLC_EMBEDDING_MODEL`
- `ANALYZE_TIMEOUT_MS`

---

## 7. 本地运行

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
pnpm start
```

---

## 8. 部署到阿里云函数计算（FC）

仓库根目录已提供可直接使用的 Serverless Devs 模板：`s.yaml`。

### 8.1 前置条件

1. 安装并配置 Serverless Devs（`s`）及阿里云凭证（`access: default`）。
2. 已开通函数计算 FC 3.0。

### 8.2 一键部署

```bash
export VOLC_API_KEY=你的真实密钥
s deploy
```

模板遵循 FC 规范，已包含：

- `runtime: nodejs20`
- HTTP Trigger（匿名访问）
- `pre-deploy` 自动执行 `pnpm install` + `pnpm build`
- 函数入口：`handler: server.handler`

### 8.3 需要你修改的配置

编辑 `s.yaml` 中以下字段：

- `vars.region`：部署地域（如 `cn-hangzhou`）
- `vars.service.name` / `functionName`：服务与函数名称
- 其他模型相关环境变量可按需在 `environmentVariables` 中继续追加

---

## 9. 数据迁移（向量库）

当 `data/chunks.jsonl` 更新后，执行：

```bash
npx tsx scripts/migrate-to-lancedb.ts
```

作用：重建 `data/lancedb/yishu` 表并写入最新向量。

---

## 10. 关键设计约束

1. 工具链是“可跳过但可强制”的：
- 图片题强制 analyze。
- 仅当 `is_math=true` 时强制 retrieve。

2. 回答与知识点展示解耦：
- 模型正文不重复贴视频列表。
- 前端按题渲染“相关知识点”卡片。

3. 存储与 UI 解耦：
- 线程 API 仅提供 CRUD。
- UI 自行管理当前会话状态与标题更新。

---

## 11. 版本与依赖基线

- Next.js 16.1.6
- React 19.2.3
- AI SDK 6.x
- LanceDB 0.26.x
- Tailwind CSS 4.x

以上为当前代码基线，后续升级请同步更新本 README 的“架构总览”和“性能设计”章节。
