'use client'

import type React from "react"
import { PomodoroSession, ViewMode } from "@/types/index"
import { BarChart3, Grid3X3, Timer } from "lucide-react"

interface SessionSummaryProps {
  viewMode: ViewMode
  sessions: PomodoroSession[]
  currentDate: Date
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ viewMode, sessions, currentDate }) => {
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getTodayStats = () => {
    const today = formatLocalDate(currentDate)
    const todaySessions = sessions.filter((session) => formatLocalDate(new Date(session.created_at)) === today)
    const completedSessions = todaySessions.filter((s) => s.status === "completed" || s.status === "reviewed")

    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: todaySessions.length,
    }
  }

  const getWeeklyStats = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const weekSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.created_at)
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek
    })
    const completedSessions = weekSessions.filter((s) => s.status === "completed" || s.status === "reviewed")

    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: weekSessions.length,
    }
  }

  const getMonthlyStats = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const monthSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.created_at)
      return sessionDate >= firstDay && sessionDate <= lastDay
    })
    const completedSessions = monthSessions.filter((s) => s.status === "completed" || s.status === "reviewed")

    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: monthSessions.length,
    }
  }

  const renderSessionDailySummary = () => {
    const todayStats = getTodayStats()

    if (todayStats.totalSessions === 0) {
      return (
        <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-slate-500 flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">오늘의 세션</h3>
              <p className="text-white/60 text-sm">세션이 없습니다</p>
            </div>
          </div>
          <div className="text-center py-8">
            <p className="text-white/70 text-lg mb-2">아직 진행된 세션이 없어요</p>
            <p className="text-white/50 text-sm">새로운 포모도로 세션을 시작해보세요</p>
          </div>
        </div>
      )
    }

    return (
      <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">오늘의 세션 통계</h3>
            <p className="text-white/60 text-sm">{todayStats.totalSessions}개의 세션</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{todayStats.totalFocusTime}분</div>
            <div className="text-white/60 text-sm">총 집중 시간</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{todayStats.sessionsCompleted}개</div>
            <div className="text-white/60 text-sm">완료된 세션</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">
              {todayStats.totalSessions - todayStats.sessionsCompleted}개
            </div>
            <div className="text-white/60 text-sm">진행중/중단</div>
          </div>
        </div>
      </div>
    )
  }

  const renderSessionWeeklySummary = () => {
    const weeklyStats = getWeeklyStats()

    return (
      <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">이번 주 세션 통계</h3>
            <p className="text-white/60 text-sm">{weeklyStats.totalSessions}개의 세션</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{weeklyStats.totalFocusTime}분</div>
            <div className="text-white/60 text-sm">총 집중 시간</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{weeklyStats.sessionsCompleted}개</div>
            <div className="text-white/60 text-sm">완료된 세션</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{Math.round(weeklyStats.totalFocusTime / 7)}분</div>
            <div className="text-white/60 text-sm">일평균 집중</div>
          </div>
        </div>
      </div>
    )
  }

  const renderSessionMonthlySummary = () => {
    const monthlyStats = getMonthlyStats()
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const dailyAverage = Math.round(monthlyStats.totalFocusTime / daysInMonth)

    return (
      <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">이번 달 세션 통계</h3>
            <p className="text-white/60 text-sm">{monthlyStats.totalSessions}개의 세션</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{monthlyStats.totalFocusTime}분</div>
            <div className="text-white/60 text-sm">총 집중 시간</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{monthlyStats.sessionsCompleted}개</div>
            <div className="text-white/60 text-sm">완료된 세션</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-white mb-1">{dailyAverage}분</div>
            <div className="text-white/60 text-sm">일평균 집중</div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'daily') {
    return renderSessionDailySummary()
  }
  if (viewMode === 'weekly') {
    return renderSessionWeeklySummary()
  }
  if (viewMode === 'monthly') {
    return renderSessionMonthlySummary()
  }
  return null
}
