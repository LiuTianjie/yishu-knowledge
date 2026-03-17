"use client"
import { useState, useRef, useCallback } from "react"

export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const pendingB64 = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelect = useCallback((file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) handleSelect(file)
        }
      }
    },
    [handleSelect]
  )

  const prepareB64 = useCallback(async (): Promise<string> => {
    if (!imageFile) return ""
    const buf = await imageFile.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ""
    bytes.forEach((b) => (binary += String.fromCharCode(b)))
    return btoa(binary)
  }, [imageFile])

  const clear = useCallback(() => {
    setImageFile(null)
    setImagePreview("")
    pendingB64.current = ""
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  return {
    imageFile,
    imagePreview,
    pendingB64,
    fileInputRef,
    handleSelect,
    handlePaste,
    prepareB64,
    clear,
  }
}
