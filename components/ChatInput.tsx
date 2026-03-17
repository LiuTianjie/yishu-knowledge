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
    <div className="bg-white border-t border-gray-100 shrink-0 z-10 pb-safe overflow-x-hidden">
      <div className="max-w-3xl mx-auto w-full px-4 py-3 md:py-4 max-w-full">
        {/* Image preview chip */}
        {imagePreview && (
          <div className="relative inline-block mb-3 ml-2">
            <img
              src={imagePreview}
              alt="题目"
              className="h-20 rounded-xl border border-gray-200 shadow-sm object-cover"
            />
            <button
              onClick={clear}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full text-sm flex items-center justify-center hover:bg-gray-900 transition-colors shadow-md border-2 border-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-[var(--surface-soft)] rounded-[24px] p-1.5 md:p-2 border border-[var(--line-soft)] shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-[color:var(--brand)]/20 focus-within:border-[var(--line-strong)] transition-all">
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center rounded-[18px] text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-white transition-colors shrink-0"
            title="上传题目图片"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            placeholder="输入题目，或粘贴图片..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] focus:outline-none max-h-32 overflow-y-auto leading-relaxed placeholder:text-gray-400"
            style={{ minHeight: "44px" }}
          />

          {/* Send / Stop button */}
          <button
            type="button"
            onClick={isLoading ? onStop : handleSend}
            disabled={!isLoading && !input.trim() && !imageFile}
            className={`w-10 h-10 flex items-center justify-center rounded-[18px] text-white transition-all shrink-0 shadow-sm ${
              isLoading
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[var(--brand)] hover:brightness-95 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
            }`}
            title={isLoading ? "停止" : "发送"}
          >
            {isLoading ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
