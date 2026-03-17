"use client"
import { VideoRef } from "@/types"

interface MergedVideoRef {
  bvid: string
  title: string
  cover?: string
  clips: { start_str: string; url: string; start: number }[]
}

export function groupRefs(refs: VideoRef[]): MergedVideoRef[] {
  const map = new Map<string, MergedVideoRef>()
  for (const ref of refs) {
    if (!map.has(ref.bvid)) {
      map.set(ref.bvid, { bvid: ref.bvid, title: ref.title, cover: ref.cover, clips: [] })
    }
    const startSec = parseInt(new URL(ref.url).searchParams.get("t") || "0")
    map.get(ref.bvid)!.clips.push({ start_str: ref.start_str, url: ref.url, start: startSec })
  }
  return Array.from(map.values())
}

export default function VideoCard({ merged }: { merged: MergedVideoRef }) {
  const firstClip = merged.clips[0]
  const embedUrl = `//player.bilibili.com/player.html?bvid=${merged.bvid}&t=${firstClip.start}&autoplay=0&high_quality=1`

  return (
    <div className="w-52 shrink-0 rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm">
      {/* 嵌入视频 */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          scrolling="no"
          frameBorder="0"
        />
      </div>

      {/* 标题 + 时间点 */}
      <div className="p-2">
        <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-snug mb-1.5">{merged.title}</p>
        <div className="flex flex-wrap gap-1">
          {merged.clips.map((clip) => (
            <a
              key={clip.url}
              href={clip.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-mono hover:bg-blue-500 hover:text-white transition-colors"
            >
              {clip.start_str} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
