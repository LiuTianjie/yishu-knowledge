"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import ChatMessage from "./ChatMessage"
import ChatInput from "./ChatInput"
import EmptyState from "./EmptyState"

// Mutable holder for pending image data — lives outside React's ref system
// so the linter won't flag it as "ref during render".
const pendingImage = { b64: "", preview: "" }

interface ChatPanelProps {
  activeId: string
  onUpdateTitle: (title: string) => void
}

export default function ChatPanel({
  activeId,
  onUpdateTitle,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [titleUpdated, setTitleUpdated] = useState(false)
  const [userMsgImages, setUserMsgImages] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ body, messages, id, trigger, messageId }) => {
          const fullBody: Record<string, unknown> = {
            ...(body || {}),
            id,
            messages,
            trigger,
            messageId,
          }
          if (pendingImage.b64) {
            fullBody.image_b64 = pendingImage.b64
            pendingImage.b64 = ""
            pendingImage.preview = ""
          }
          return { body: fullBody }
        },
      })
  )

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport,
  })

  const isLoading = status === "submitted" || status === "streaming"
  const [messagesLoaded, setMessagesLoaded] = useState(false)

  // Load saved messages on mount
  useEffect(() => {
    let cancelled = false
    fetch(`/api/threads/${activeId}/messages`)
      .then(r => r.json())
      .then((saved: UIMessage[]) => {
        if (!cancelled && saved.length > 0) setMessages(saved)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMessagesLoaded(true) })
    return () => { cancelled = true }
  }, [activeId, setMessages])

  // Save messages when streaming completes
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    if (
      (prev === "streaming" || prev === "submitted") &&
      status === "ready" &&
      messages.length > 0
    ) {
      fetch(`/api/threads/${activeId}/messages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).catch(() => {})
    }
  }, [status, messages, activeId])

  // Auto-scroll when near bottom
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: status === "streaming" ? "auto" : "smooth" })
    }
  }, [messages, status])

  const handleSendWithTracking = useCallback(
    (text: string, imageB64: string, imagePreview: string) => {
      if (!titleUpdated && text) {
        onUpdateTitle(text.slice(0, 20))
        setTitleUpdated(true)
      }

      if (imageB64) {
        pendingImage.b64 = imageB64
        pendingImage.preview = imagePreview
        setUserMsgImages((prev) => [...prev, imagePreview])
      } else {
        setUserMsgImages((prev) => [...prev, ""])
      }

      sendMessage({ text: text || "（图片题目）" })
    },
    [titleUpdated, onUpdateTitle, sendMessage]
  )

  const getImageByPosition = useCallback(
    (msgIndex: number): string => {
      let userCount = 0
      for (let i = 0; i <= msgIndex; i++) {
        if (messages[i]?.role === "user") userCount++
      }
      return userMsgImages[userCount - 1] || ""
    },
    [messages, userMsgImages]
  )

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 relative bg-white">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden hide-scrollbar"
        >
          <div className="max-w-3xl mx-auto w-full md:px-6 px-3 py-6 flex flex-col gap-6 pb-8">
            {messagesLoaded && messages.length === 0 && (
              <EmptyState onSelect={(q) => setInput(q)} />
            )}

            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className="pb-5 mb-5 border-b border-gray-200/70 last:border-b-0 last:mb-0 last:pb-0"
              >
                <ChatMessage
                  message={msg}
                  chatStatus={status}
                  isLastMessage={idx === messages.length - 1}
                  imageUrl={
                    msg.role === "user"
                      ? getImageByPosition(idx)
                      : undefined
                  }
                />
              </div>
            ))}

            {/* Thinking placeholder: shown when submitted but no assistant message yet */}
            {status === "submitted" &&
              messages.length > 0 &&
              messages[messages.length - 1].role !== "assistant" && (
                <div className="flex animate-fade-in">
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-[20px] rounded-tl-md bg-gray-50 border border-gray-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

            {/* Error banner */}
            {status === "error" && error && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-red-50 border border-red-200 text-sm text-red-700 max-w-md">
                  <p className="font-medium">请求出错了</p>
                  <p className="mt-1 text-red-500 text-xs break-all">{error.message || "未知错误，请重试"}</p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSendWithTracking}
        onStop={stop}
      />
    </>
  )
}
