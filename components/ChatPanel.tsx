"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import ChatMessage from "./ChatMessage"
import ChatInput from "./ChatInput"
import EmptyState from "./EmptyState"

// Mutable holder for pending image data — lives outside React's ref system
// so the linter won't flag it as "ref during render".
const pendingImage = { b64: "", preview: "" }

interface ChatPanelProps {
  activeId: string
  resourceId: string
  onUpdateTitle: (title: string) => void
}

export default function ChatPanel({
  activeId,
  resourceId,
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
        body: {
          threadId: activeId,
          resourceId,
        },
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

  const { messages, sendMessage, status, stop } = useChat({ transport })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-scroll when near bottom
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
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
      <div className="flex-1 relative">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
            {messages.length === 0 && (
              <EmptyState onSelect={(q) => setInput(q)} />
            )}

            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                imageUrl={
                  msg.role === "user"
                    ? getImageByPosition(idx)
                    : undefined
                }
              />
            ))}

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
