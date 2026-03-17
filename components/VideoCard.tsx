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
  const clipPreview = merged.clips.slice(0, 4)
  const extraCount = Math.max(merged.clips.length - clipPreview.length, 0)

  return (
    <div className="w-[232px] h-[190px] shrink-0 rounded-[16px] border border-[#DDE7FB] bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-[#C9D9FB] transition-all group/card flex flex-col">
      {/* Embedded video */}
      <div className="relative w-full h-[100px] bg-[#F3F7FF] shrink-0">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          scrolling="no"
          frameBorder="0"
        />
      </div>

      {/* Title + timestamps */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        <p className="h-11 text-[13px] text-gray-800 font-semibold line-clamp-2 leading-snug mb-2.5 group-hover/card:text-[#2B6EF6] transition-colors">
          {merged.title}
        </p>
        <div className="mt-auto flex items-center gap-1.5 overflow-x-auto hide-scrollbar whitespace-nowrap">
          {clipPreview.map((clip) => (
            <a
              key={clip.url}
              href={clip.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] bg-[#EDF3FF] text-[#355EB0] px-2 py-1 rounded-md font-mono font-semibold hover:bg-[#2B6EF6] hover:text-white transition-colors"
            >
              {clip.start_str} ↗
            </a>
          ))}
          {extraCount > 0 && (
            <span className="text-[11px] text-gray-400 px-1.5">+{extraCount}</span>
          )}
        </div>
      </div>
    </div>
  )
}
