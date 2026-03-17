"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Session } from "@/types"
import ChatMessage from "@/components/ChatMessage"

const STORAGE_KEY = "yishu_sessions"

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

function ChatPanel({
  activeId,
  onUpdateTitle,
}: {
  activeId: string
  onUpdateTitle: (title: string) => void
}) {
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [titleUpdated, setTitleUpdated] = useState(false)
  const pendingImageRef = useRef<string>("")
  // 按用户消息发送顺序存图片 data URL
  const userImagesRef = useRef<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          threadId: activeId,
          resourceId: "default-user",
        },
        prepareSendMessagesRequest: ({ body, messages, id, trigger, messageId }) => {
          const fullBody: Record<string, unknown> = {
            ...(body || {}),
            id,
            messages,
            trigger,
            messageId,
          }
          if (pendingImageRef.current) {
            fullBody.image_b64 = pendingImageRef.current
            pendingImageRef.current = ""
          }
          return { body: fullBody }
        },
      }),
    [activeId]
  )

  const { messages, sendMessage, status, stop } = useChat({ transport })

  const isLoading = status === "submitted" || status === "streaming"

  // 滚动跟随
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleImageSelect = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) handleImageSelect(file)
      }
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !imageFile) return
    if (isLoading) return

    if (!titleUpdated && text) {
      onUpdateTitle(text.slice(0, 20))
      setTitleUpdated(true)
    }

    setInput("")

    if (imageFile) {
      const buf = await imageFile.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ""
      bytes.forEach((b) => (binary += String.fromCharCode(b)))
      pendingImageRef.current = btoa(binary)
      // 记录这条用户消息带的图片预览
      userImagesRef.current.push(imagePreview)
      clearImage()
      sendMessage({ text: text || "（图片题目）" })
    } else {
      // 没有图片，占位空字符串
      userImagesRef.current.push("")
      sendMessage({ text })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 计算每条用户消息对应的图片
  const getImageForUserMsg = (msgIndex: number): string => {
    // msgIndex 是在 messages 数组中的索引
    // 计算这是第几条用户消息
    let userCount = 0
    for (let i = 0; i <= msgIndex; i++) {
      if (messages[i]?.role === "user") userCount++
    }
    return userImagesRef.current[userCount - 1] || ""
  }

  return (
    <>
      <div className="flex-1 relative">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="text-5xl">📐</div>
                <h2 className="text-lg font-semibold text-gray-700">有数学题不会？问我吧</h2>
                <p className="text-sm text-gray-400 max-w-sm">
                  可以直接输入题目，也可以粘贴或上传题目图片。
                  <br />
                  我会结合一数的视频讲解来帮你解答。
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {["二次函数最值怎么求？", "等差数列求和公式推导", "三角函数图像变换规律"].map(
                    (q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        {q}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                imageUrl={msg.role === "user" ? getImageForUserMsg(idx) : undefined}
              />
            ))}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 shrink-0 z-10">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img src={imagePreview} alt="题目" className="h-20 rounded-lg border border-gray-200" />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-800"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shrink-0"
              title="上传题目图片"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
            />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="输入题目，或粘贴图片（Enter 发送，Shift+Enter 换行）"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 max-h-32 overflow-y-auto"
              style={{ minHeight: "36px" }}
            />

            <button
              type="button"
              onClick={isLoading ? stop : handleSend}
              disabled={!isLoading && !input.trim() && !imageFile}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-white transition-colors shrink-0 ${
                isLoading
                  ? "bg-red-400 hover:bg-red-500"
                  : "bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
              title={isLoading ? "停止" : "发送"}
            >
              {isLoading ? "■" : "↑"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeSession = sessions.find((s) => s.id === activeId)

  useEffect(() => {
    const saved = loadSessions()
    if (saved.length > 0) {
      setSessions(saved)
      setActiveId(saved[0].id)
    } else {
      const first: Session = { id: genId(), title: "新对话", createdAt: Date.now() }
      setSessions([first])
      saveSessions([first])
      setActiveId(first.id)
    }
  }, [])

  const createSession = () => {
    const s: Session = { id: genId(), title: "新对话", createdAt: Date.now() }
    const updated = [s, ...sessions]
    setSessions(updated)
    saveSessions(updated)
    setActiveId(s.id)
  }

  const deleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id)
    setSessions(updated)
    saveSessions(updated)
    if (activeId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0].id)
      } else {
        const s: Session = { id: genId(), title: "新对话", createdAt: Date.now() }
        setSessions([s])
        saveSessions([s])
        setActiveId(s.id)
      }
    }
  }

  const handleUpdateTitle = (title: string) => {
    if (activeSession?.title !== "新对话") return
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === activeId ? { ...s, title } : s))
      saveSessions(updated)
      return updated
    })
  }

  return (
    <div className="flex bg-gray-50 overflow-hidden" style={{ height: "100dvh" }}>
      <aside
        className={`${sidebarOpen ? "w-60" : "w-0"} transition-all duration-200 overflow-hidden bg-white border-r border-gray-100 flex flex-col shrink-0 h-full`}
      >
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={createSession}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors ${
                s.id === activeId ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActiveId(s.id)}
            >
              <span className="flex-1 truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(s.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">一数知识问答</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-sm"
          >
            ☰
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
            数
          </div>
          <h1 className="flex-1 text-sm font-semibold text-gray-800 truncate min-w-0">
            {activeSession?.title || "一数知识问答"}
          </h1>
        </header>

        {activeId && (
          <ChatPanel
            key={activeId}
            activeId={activeId}
            onUpdateTitle={handleUpdateTitle}
          />
        )}
      </div>
    </div>
  )
}
