"use client"
import type { Thread } from "@/types"

interface SidebarProps {
  threads: Thread[]
  activeId: string
  open: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function Sidebar({
  threads,
  activeId,
  open,
  onSelect,
  onCreate,
  onDelete,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 h-full shrink-0
          flex flex-col bg-[#F9FAFB] md:bg-[#F9FAFB]/50 border-r border-gray-200/60
          transition-transform duration-300 ease-out
          w-64 max-w-[80vw] overflow-x-hidden
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-64 md:opacity-100"}
        `}
      >
        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200/80 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            开启新对话
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1 hide-scrollbar">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`
                group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all
                ${
                  t.id === activeId
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200/60 font-medium"
                    : "text-gray-600 hover:bg-gray-100/80 border border-transparent"
                }
              `}
              onClick={() => {
                onSelect(t.id)
                onClose()
              }}
            >
              <svg
                className={`w-4 h-4 shrink-0 transition-colors ${t.id === activeId ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="flex-1 truncate">{t.title || "新对话"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(t.id)
                }}
                className={`p-1 rounded-md transition-all ${t.id === activeId ? 'opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
