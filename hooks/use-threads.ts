"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type { Thread } from "@/types"

const RESOURCE_ID = "default-user"

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const activeThread = threads.find((t) => t.id === activeId)

  // Load threads on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    fetch("/api/threads")
      .then((r) => r.json())
      .then((data: Thread[]) => {
        if (data.length > 0) {
          setThreads(data)
          setActiveId(data[0].id)
        } else {
          // No threads → auto-create one
          return fetch("/api/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "新对话" }),
          })
            .then((r) => r.json())
            .then((t: Thread) => {
              setThreads([t])
              setActiveId(t.id)
            })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const createThread = useCallback(async () => {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新对话" }),
    })
    const t: Thread = await res.json()
    setThreads((prev) => [t, ...prev])
    setActiveId(t.id)
    return t
  }, [])

  const deleteThread = useCallback(
    async (id: string) => {
      await fetch(`/api/threads/${id}`, { method: "DELETE" })
      setThreads((prev) => {
        const updated = prev.filter((t) => t.id !== id)
        if (activeId === id) {
          if (updated.length > 0) {
            setActiveId(updated[0].id)
          } else {
            // Create a new thread if all deleted
            fetch("/api/threads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "新对话" }),
            })
              .then((r) => r.json())
              .then((t: Thread) => {
                setThreads([t])
                setActiveId(t.id)
              })
          }
        }
        return updated
      })
    },
    [activeId]
  )

  const updateTitle = useCallback(
    async (title: string) => {
      if (!activeId) return
      // Optimistic update
      setThreads((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, title } : t))
      )
      await fetch(`/api/threads/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    },
    [activeId]
  )

  return {
    threads,
    activeId,
    activeThread,
    loading,
    resourceId: RESOURCE_ID,
    setActiveId,
    createThread,
    deleteThread,
    updateTitle,
  }
}
