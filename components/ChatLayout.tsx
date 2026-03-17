"use client"
import { useState } from "react"
import { useThreads } from "@/hooks/use-threads"
import Sidebar from "./Sidebar"
import ChatPanel from "./ChatPanel"

export default function ChatLayout() {
  const {
    threads,
    activeId,
    activeThread,
    loading,
    resourceId,
    setActiveId,
    createThread,
    deleteThread,
    updateTitle,
  } = useThreads()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">加载中…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex bg-gray-50 overflow-hidden h-dvh">
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
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            数
          </div>

          <h1 className="flex-1 text-sm font-semibold text-gray-800 truncate min-w-0">
            {activeThread?.title || "一数知识问答"}
          </h1>

          {/* New chat shortcut on mobile */}
          <button
            onClick={() => createThread()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </header>

        {activeId && (
          <ChatPanel
            key={activeId}
            activeId={activeId}
            resourceId={resourceId}
            onUpdateTitle={updateTitle}
          />
        )}
      </div>
    </div>
  )
}
