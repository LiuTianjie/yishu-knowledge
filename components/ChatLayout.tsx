"use client"
import { useState } from "react"
import { useThreads } from "@/hooks/use-threads"
import { getThreadAffinityKey, hasExternalApiBase } from "@/lib/api-url"
import Sidebar from "./Sidebar"
import ChatPanel from "./ChatPanel"

export default function ChatLayout() {
  const {
    threads,
    activeId,
    activeThread,
    loading,
    setActiveId,
    createThread,
    deleteThread,
    updateTitle,
  } = useThreads()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const affinityKey = getThreadAffinityKey(activeId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-gray-500 px-4 py-3 rounded-2xl bg-white border border-gray-200/70 shadow-sm">
          <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm font-medium">正在加载对话…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex bg-[#F8FAFC] overflow-hidden h-[100dvh] w-full max-w-full">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-72 h-72 bg-blue-200/30 blur-3xl rounded-full" />
        <div className="absolute top-1/4 -right-16 w-64 h-64 bg-indigo-200/20 blur-3xl rounded-full" />
      </div>

      <Sidebar
        threads={threads}
        activeId={activeId}
        open={sidebarOpen}
        onSelect={setActiveId}
        onCreate={() => {
          createThread()
          setSidebarOpen(false)
        }}
        onDelete={deleteThread}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full z-10 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-4 py-2.5 flex items-center gap-3 shrink-0 z-20 sticky top-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-9 h-9 md:hidden flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-blue-500/20">
            数
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-800 truncate">
              {activeThread?.title || "一数知识问答"}
            </h1>
            {hasExternalApiBase && affinityKey && (
              <p className="text-[11px] text-blue-500 truncate mt-0.5">
                后端直连 · 会话亲和键 {affinityKey.slice(0, 12)}
              </p>
            )}
          </div>

          {/* New chat shortcut on mobile */}
          <button
            onClick={() => createThread()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </header>

        {activeId && (
          <ChatPanel
            key={activeId}
            activeId={activeId}
            onUpdateTitle={updateTitle}
          />
        )}
      </div>
    </div>
  )
}
