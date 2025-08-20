'use client'

import type React from "react"
import { DailySummary, Memo, CategoryConfig } from "@/types/index"
import { Clock, Edit3, Sparkles } from "lucide-react"

interface DailySummaryProps {
  memos: Memo[]
  dailySummary: DailySummary | null
  categories: Record<string, CategoryConfig>
}

export const DailySummaryComponent: React.FC<DailySummaryProps> = ({ memos, dailySummary, categories }) => {
  // Case 1: No memos for the day
  if (memos.length === 0) {
    return (
      <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-slate-500 flex items-center justify-center">
            <Edit3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">오늘의 메모</h3>
            <p className="text-white/60 text-sm">메모가 없습니다</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-white/70 text-lg mb-2">아직 작성된 메모가 없어요</p>
          <p className="text-white/50 text-sm">새로운 메모를 작성해서 하루를 기록해보세요</p>
        </div>
      </div>
    )
  }

  // Case 2: Memos exist but no daily summary
  if (!dailySummary) {
    return (
      <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">오늘의 메모</h3>
            <p className="text-white/60 text-sm">{memos.length}개의 메모</p>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-white/70 text-base mb-2">일일 요약이 아직 생성되지 않았습니다</p>
          <p className="text-white/50 text-sm">요약은 자동으로 생성되며, 잠시 후 확인하실 수 있습니다</p>
        </div>
      </div>
    )
  }

  // Case 3: Both memos and daily summary exist
  return (
    <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">오늘의 메모 요약</h3>
          <p className="text-white/60 text-sm">{dailySummary.total_memos}개의 메모</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-white/90 leading-relaxed">{dailySummary.ai_comment}</p>
      </div>

      {dailySummary.category_summaries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-white/80 font-medium text-sm">카테고리별 요약</h4>
          {dailySummary.category_summaries.map((catSummary, index) => {
            const category = categories[catSummary.category]
            return (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <div
                  className={`w-8 h-8 rounded-full ${category.bgColor} flex items-center justify-center flex-shrink-0`}
                  style={{ color: category.color }}
                >
                  {category.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{category.name}</span>
                    <span className="text-white/60 text-xs">{catSummary.memo_count}개</span>
                  </div>
                  <p className="text-white/80 text-sm">{catSummary.summary}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
