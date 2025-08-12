import type React from "react"
export interface MemoAttachment {
  id: string
  type: "image" | "audio"
  url: string
  filename: string
}

export interface Memo {
  id: string
  user_id: string
  content: string
  attachments: MemoAttachment[]
  tags: string[]
  created_at: Date
  updated_at: Date
  category?: string
  category_confidence?: number
  is_archived?: boolean
}

export interface PomodoroSession {
  id: string
  user_id: string
  subject: string
  goal?: string
  duration: number
  break_duration: number
  tags?: string[]
  started_at?: Date
  created_at: Date
  updated_at: Date
  status: "pending" | "started" | "paused" | "completed" | "cancelled" | "reviewed"
  reflection?: string
}

export interface DailySummary {
  date: string
  ai_comment: string
  category_summaries: {
    category: string
    summary: string
    memo_count: number
  }[]
  total_memos: number
  created_at: string
}

export interface CategoryConfig {
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description?: string
}

export interface CustomCategory {
  id: string
  key: string
  name: string
  description: string
  icon: string
  color: string
  user_id: string
  created_at: string
  updated_at: string
}

export type ViewMode = "daily" | "weekly" | "monthly"
export type AppMode = "memo" | "session"
