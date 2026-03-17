"use client"
import { useImageUpload } from "@/hooks/use-image-upload"

interface ChatInputProps {
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  onSend: (text: string, imageB64: string, imagePreview: string) => void
  onStop: () => void
}

export default function ChatInput({
  input,
  setInput,
  isLoading,
  onSend,
  onStop,
}: ChatInputProps) {
  const { imageFile, imagePreview, fileInputRef, handleSelect, handlePaste, prepareB64, clear } =
    useImageUpload()

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !imageFile) return
    if (isLoading) return

    let b64 = ""
    const preview = imagePreview
    if (imageFile) {
      b64 = await prepareB64()
      clear()
    }
    setInput("")
    onSend(text, b64, preview)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm shrink-0 z-10">
      <div className="max-w-3xl mx-auto w-full px-4 py-3">
        {/* Image preview chip */}
        {imagePreview && (
          <div className="relative inline-block mb-2">
            <img
              src={imagePreview}
              alt="题目"
              className="h-20 rounded-xl border border-gray-200 shadow-sm"
            />
            <button
              onClick={clear}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-900 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shrink-0"
            title="上传题目图片"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleSelect(e.target.files[0])}
          />

          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入题目，或粘贴图片 (Enter 发送)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 max-h-32 overflow-y-auto transition-shadow bg-white"
            style={{ minHeight: "40px" }}
          />

          {/* Send / Stop button */}
          <button
            type="button"
            onClick={isLoading ? onStop : handleSend}
            disabled={!isLoading && !input.trim() && !imageFile}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all shrink-0 ${
              isLoading
                ? "bg-red-400 hover:bg-red-500"
                : "bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
            title={isLoading ? "停止" : "发送"}
          >
            {isLoading ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
