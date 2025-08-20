'use client'

import type React from "react"
import { Memo, CategoryConfig } from "@/types/index"

interface MemoCardProps {
  memo: Memo
  categories: Record<string, CategoryConfig>
  locale: string
  timeZone: string
  onSelectMemo: (memo: Memo) => void
  expandedPreviews: string[]
}

// Helper function to truncate content at first line break
const truncateAtLineBreak = (content: string, maxLength = 100) => {
  const firstLineBreak = content.indexOf("\n")
  if (firstLineBreak !== -1 && firstLineBreak < maxLength) {
    return { text: content.substring(0, firstLineBreak), truncated: true }
  }
  if (content.length > maxLength) {
    return { text: content.substring(0, maxLength), truncated: true }
  }
  return { text: content, truncated: false }
}

export const MemoCard: React.FC<MemoCardProps> = ({ memo, categories, locale, timeZone, onSelectMemo, expandedPreviews }) => {
  const category = memo.category ? categories[memo.category] : null
  const utcCreated = memo.created_at
  const time = utcCreated.toLocaleString(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const { text: previewText, truncated } = truncateAtLineBreak(memo.content)
  const isExpanded = expandedPreviews.includes(memo.id)
  const preview = isExpanded || !truncated ? memo.content : previewText

  return (
    <div
      key={memo.id}
      className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 cursor-pointer hover:bg-white/15 transition-all duration-200"
      onClick={() => onSelectMemo(memo)}
    >
      {/* Header with category and time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {category ? (
            <>
              <div
                className={`w-8 h-8 rounded-full ${category.bgColor} flex items-center justify-center flex-shrink-0`}
                style={{ color: category.color }}
              >
                {category.icon}
              </div>
              <div>
                <span className="text-sm font-medium text-white/90">{category.name}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                {/* Default Icon */}
              </div>
              <div>
                <span className="text-sm font-medium text-white/90">Uncategorized</span>
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-white/60">{time}</span>
      </div>

      {/* Content preview */}
      <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
          {preview}
          {truncated && !isExpanded && <span className="text-white/50">...</span>}
      </div>


      {/* Attachments and tags */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {memo.attachments.some(att => att.type === 'image') && (
            <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/80">Image</span>
          )}
          {memo.attachments.some(att => att.type === 'audio') && (
            <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white/80">Audio</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {memo.tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-white/15 text-white/80 font-medium">
              {tag}
            </span>
          ))}
          {memo.tags.length > 2 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/60">
              +{memo.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
