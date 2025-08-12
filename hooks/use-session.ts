"use client"

import { useState } from "react"
import type { PomodoroSession } from "@/lib/types"
import {
  apiCall,
  parseSession,
  createSessionInBackend,
  updateSessionStatus,
  updateSessionReflection,
  deleteSessionFromBackend,
} from "@/lib/api"
import { formatLocalDate, getBreakDuration } from "@/lib/utils/date"

export const useSession = (timeZone: string, currentDate: Date, user: { email: string; name: string } | null) => {
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [weeklySessionData, setWeeklySessionData] = useState<{ [key: string]: PomodoroSession[] }>({})
  const [monthlySessionData, setMonthlySessionData] = useState<{
    [key: string]: { session_count: number; total_focus_time: number }
  }>({})
  const [currentPhase, setCurrentPhase] = useState<"setup" | "focus" | "break">("setup")
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [breakStartedAt, setBreakStartedAt] = useState<Date | null>(null)
  const [sessionReflections, setSessionReflections] = useState<{ [sessionId: string]: string }>({})

  const fetchCurrentSession = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/current`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setCurrentSession(parseSession(data))
      } else {
        setCurrentSession(null)
      }
    } catch (err) {
      setCurrentSession(null)
      console.error("Error fetching current session:", err)
    }
  }

  const fetchDailySessionData = async () => {
    const dateStr = formatLocalDate(currentDate)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setSessions((data || []).map(parseSession))
      }
    } catch (err) {
      console.error("Error fetching daily session data:", err)
    }
  }

  const startSession = async (sessionData: { subject: string; goal: string; duration: number; tags: string[] }) => {
    const breakDuration = getBreakDuration(sessionData.duration)

    const newSession: PomodoroSession = {
      id: "",
      user_id: user?.email || "",
      subject: sessionData.subject,
      goal: sessionData.goal,
      duration: sessionData.duration,
      break_duration: breakDuration,
      tags: sessionData.tags,
      created_at: new Date(),
      updated_at: new Date(),
      status: "pending",
    }

    const createdSession = await createSessionInBackend(newSession)
    if (createdSession) {
      const convertedSession = {
        ...createdSession,
        started_at: createdSession.started_at ? new Date(createdSession.started_at) : undefined,
        created_at: new Date(createdSession.created_at),
        updated_at: createdSession.updated_at ? new Date(createdSession.updated_at) : new Date(),
      }
      setCurrentSession(convertedSession)
      setTimeLeft(convertedSession.duration * 60)
      setCurrentPhase("focus")
      setIsRunning(false)
    }
  }

  const toggleTimer = async () => {
    if (!currentSession) return

    const newRunningState = !isRunning

    if (newRunningState) {
      const now = new Date()
      const updatedSession = { ...currentSession, status: "started" as const, updated_at: now }

      if (currentSession.status === "paused" && currentSession.updated_at && currentSession.started_at) {
        const pauseDuration = now.getTime() - new Date(currentSession.updated_at).getTime()
        updatedSession.started_at = new Date(new Date(currentSession.started_at).getTime() + pauseDuration)
      } else if (currentSession.status === "pending") {
        updatedSession.started_at = now
      }

      await updateSessionStatus(currentSession.id, "started")
      setCurrentSession(updatedSession)
    } else {
      await updateSessionStatus(currentSession.id, "paused")
      setCurrentSession((prev) => (prev ? { ...prev, status: "paused" as const, updated_at: new Date() } : null))
    }

    setIsRunning(newRunningState)
  }

  const resetTimer = async () => {
    if (currentSession) {
      await updateSessionStatus(currentSession.id, "pending")
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              status: "pending",
              updated_at: new Date(),
            }
          : null,
      )
    }
    setIsRunning(false)
    if (currentSession) {
      if (currentPhase === "focus") {
        setTimeLeft(currentSession.duration * 60)
      } else if (currentPhase === "break") {
        setTimeLeft(currentSession.break_duration * 60)
      }
    }
  }

  const cancelCurrentTask = async () => {
    if (currentSession) {
      await deleteSessionFromBackend(currentSession.id)
    }

    setIsRunning(false)
    setCurrentPhase("setup")
    setCurrentSession(null)
    setTimeLeft(0)
  }

  const handleReflectionSubmit = async (sessionId: string) => {
    const reflection = sessionReflections[sessionId]
    if (!reflection?.trim()) return

    await updateSessionReflection(sessionId, reflection.trim())

    setSessionReflections((prev) => {
      const newReflections = { ...prev }
      delete newReflections[sessionId]
      return newReflections
    })
  }

  return {
    currentSession,
    setCurrentSession,
    sessions,
    setSessions,
    weeklySessionData,
    monthlySessionData,
    currentPhase,
    setCurrentPhase,
    timeLeft,
    setTimeLeft,
    isRunning,
    setIsRunning,
    breakStartedAt,
    setBreakStartedAt,
    sessionReflections,
    setSessionReflections,
    fetchCurrentSession,
    fetchDailySessionData,
    startSession,
    toggleTimer,
    resetTimer,
    cancelCurrentTask,
    handleReflectionSubmit,
  }
}
