
import {
  CustomCategory,
  PomodoroSession,
  Memo,
  DailySummary,
} from "@/types/index"

// Common API call function with 401 handling
export const apiCall = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    })

    if (response.status === 401) {
      // 401 Unauthorized - redirect to login
      console.log("401 Unauthorized - redirecting to login")
      window.location.href = "/login"
      return null
    }

    return response
  } catch (error) {
    console.error("API call failed:", error)
    throw error
  }
}

export const fetchUser = async () => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`)
    if (res && res.ok) {
      return await res.json()
    }
    return null
  } catch (err) {
    console.error("Error fetching user:", err)
    return null
  }
}

export const handleLogout = async () => {
  try {
    await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
      method: "POST",
    })
    window.location.href = "/login"
  } catch (err) {
    console.error("Logout failed:", err)
    window.location.href = "/login"
  }
}

export const fetchCustomCategories = async (): Promise<CustomCategory[]> => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`)
    if (res && res.ok) {
      const data = await res.json()
      return data.categories
    }
    return []
  } catch (err) {
    console.error("Error fetching custom categories:", err)
    return []
  }
}

export const createSessionInBackend = async (session: Omit<PomodoroSession, "id" | "user_id" | "updated_at">) => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    })

    if (res && res.ok) {
      return await res.json()
    } else {
      console.error("Failed to create session in backend")
      return null
    }
  } catch (err) {
    console.error("Error creating session in backend:", err)
    return null
  }
}

export const updateSessionStatus = async (sessionId: string, status: string) => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    })

    if (!res || !res.ok) {
      console.error("Failed to update session status")
    }
    return res
  } catch (err) {
    console.error("Error updating session status:", err)
  }
}

export const deleteSessionFromBackend = async (sessionId: string) => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
      method: "DELETE",
    })

    if (!res || !res.ok) {
      console.error("Failed to delete session from backend")
    }
  } catch (err) {
    console.error("Error deleting session from backend:", err)
  }
}

export const updateSessionReflection = async (sessionId: string, reflection: string) => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflection: reflection,
        status: "reviewed",
        updated_at: new Date().toISOString(),
      }),
    })

    if (!res || !res.ok) {
      console.error("Failed to update session reflection")
    }
  } catch (err) {
    console.error("Error updating session reflection:", err)
  }
}

export const updateSessionDuration = async (sessionId: string, newDuration: number, breakDuration: number) => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: newDuration,
        break_duration: breakDuration,
        updated_at: new Date().toISOString(),
      }),
    })

    if (!res || !res.ok) {
      console.error("Failed to update session duration")
    }
  } catch (err) {
    console.error("Error updating session duration:", err)
  }
}


export const fetchCurrentSession = async (): Promise<PomodoroSession | null> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/current`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        return parseSession(data)
      }
      return null
    } catch (err) {
      console.error("Error fetching current session:", err)
      return null
    }
}

export const fetchDailySessionData = async (date: Date, timeZone: string): Promise<PomodoroSession[]> => {
    const dateStr = formatLocalDate(date)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        return (data || []).map(parseSession)
      }
      return []
    } catch (err) {
      console.error("Error fetching daily session data:", err)
      return []
    }
}

export const fetchWeeklySessionData = async (date: Date, timeZone: string): Promise<{ [key: string]: PomodoroSession[] }> => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startDateStr = formatLocalDate(startOfWeek)
    const endDateStr = formatLocalDate(endOfWeek)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const sessions = await res.json()
        const parsedSessions = (sessions || []).map(parseSession)
        // Group by date
        const groupedSessions: { [key: string]: PomodoroSession[] } = {}
        parsedSessions.forEach((session: PomodoroSession) => {
          const localSessionDate = convertUtcToLocalDate(session.created_at, timeZone)
          if (!groupedSessions[localSessionDate]) {
            groupedSessions[localSessionDate] = []
          }
          groupedSessions[localSessionDate].push(session)
        })
        return groupedSessions
      }
      return {}
    } catch (err) {
      console.error("Error fetching weekly session data:", err)
      return {}
    }
}

export const fetchMonthlySessionData = async (date: Date, timeZone: string): Promise<{ [key: string]: { session_count: number; total_focus_time: number } }> => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDateStr = formatLocalDate(firstDay)
    const endDateStr = formatLocalDate(lastDay)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const sessions = await res.json()
        const parsedSessions = (sessions || []).map(parseSession)
        // Aggregate by date
        const groupedData: { [key: string]: { session_count: number; total_focus_time: number } } = {}
        parsedSessions.forEach((session: PomodoroSession) => {
          const localSessionDate = convertUtcToLocalDate(session.created_at, timeZone)
          if (!groupedData[localSessionDate]) {
            groupedData[localSessionDate] = { session_count: 0, total_focus_time: 0 }
          }
          groupedData[localSessionDate].session_count++
          if (session.status === "completed") {
            groupedData[localSessionDate].total_focus_time += session.duration
          }
        })
        return groupedData
      }
      return {}
    } catch (err) {
      console.error("Error fetching monthly session data:", err)
      return {}
    }
}

export const fetchDailyMemos = async (date: Date, timeZone: string): Promise<Memo[]> => {
    const dateStr = formatLocalDate(date)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        return (data || []).map(parseMemo)
      }
      return []
    } catch (err) {
      console.error("Error fetching daily memos:", err)
      return []
    }
}

export const fetchWeeklyMemos = async (date: Date, timeZone: string): Promise<{ [key: string]: Memo[] }> => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startDateStr = formatLocalDate(startOfWeek)
    const endDateStr = formatLocalDate(endOfWeek)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const memos = await res.json()
        const parsedMemos = (memos || []).map(parseMemo)
        // Group memos by date
        const groupedMemos: { [key: string]: Memo[] } = {}
        parsedMemos.forEach((memo: Memo) => {
          const localMemoDate = convertUtcToLocalDate(memo.created_at, timeZone)
          if (!groupedMemos[localMemoDate]) {
            groupedMemos[localMemoDate] = []
          }
          groupedMemos[localMemoDate].push(memo)
        })
        return groupedMemos
      }
      return {}
    } catch (err) {
      console.error("Error fetching weekly memos:", err)
      return {}
    }
}

export const fetchMonthlyMemos = async (date: Date, timeZone: string): Promise<{ [key: string]: { memo_count: number; has_summary: boolean } }> => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDateStr = formatLocalDate(firstDay)
    const endDateStr = formatLocalDate(lastDay)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const memos = await res.json()
        const parsedMemos = (memos || []).map(parseMemo)
        // Group memos by date and count
        const groupedData: { [key: string]: { memo_count: number; has_summary: boolean } } = {}
        parsedMemos.forEach((memo: Memo) => {
          const localMemoDate = convertUtcToLocalDate(memo.created_at, timeZone)
          if (!groupedData[localMemoDate]) {
            groupedData[localMemoDate] = { memo_count: 0, has_summary: false }
          }
          groupedData[localMemoDate].memo_count++
        })
        return groupedData
      }
      return {}
    } catch (err) {
      console.error("Error fetching monthly memos:", err)
      return {}
    }
}

export const fetchDailySummary = async (date: string, timeZone: string): Promise<DailySummary | null> => {
    try {
      const res = await apiCall(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/summary/daily?date=${date}&tz=${encodeURIComponent(timeZone)}`,
      )
      if (res && res.ok) {
        const data = await res.json()
        return data.summary
      }
      return null
    } catch (err) {
      console.error("Error fetching daily summary:", err)
      return null
    }
}

export const createNewCategory = async (name: string): Promise<CustomCategory | null> => {
    if (!name.trim()) return null

    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: name.toLowerCase().replace(/\s+/g, "_"),
          name: name.trim(),
          description: `사용자 정의 카테고리: ${name.trim()}`,
          icon: "lightbulb",
          color: "#F59E0B",
        }),
      })

      if (res && res.ok) {
        return await res.json()
      }
      return null
    } catch (err) {
      console.error("Failed to create category:", err)
      return null
    }
}

export const createMemo = async (formData: FormData) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo`, {
        method: "POST",
        body: formData,
      })

      if (!res || !res.ok) {
          console.error("Failed to create memo:", await res?.text())
      }
      return res
    } catch (err) {
      console.error("Submit failed:", err)
    }
}

export const updateMemo = async (memoId: string, formData: FormData) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${memoId}`, {
        method: "PUT",
        body: formData,
      })
      if (!res || !res.ok) {
          console.error("Failed to update memo")
      }
      return res
    } catch (err) {
      console.error("Edit failed:", err)
    }
}

export const deleteMemo = async (memoId: string) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${memoId}`, {
        method: "DELETE",
      })
      if (!res || !res.ok) {
          console.error("Failed to delete memo")
      }
      return res
    } catch (err) {
      console.error("Delete failed:", err)
    }
}

// Helper functions that were in page.tsx
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const convertUtcToLocalDate = (utcDate: Date, timeZone: string): string => {
  const localDate = new Date(utcDate.toLocaleString("en-US", { timeZone }))
  return formatLocalDate(localDate)
}

function parseSession(session: any): PomodoroSession {
    return {
      ...session,
      started_at: session.started_at
        ? new Date(session.started_at?.endsWith?.("Z") ? session.started_at : session.started_at + "Z")
        : undefined,
      created_at: new Date(session.created_at?.endsWith?.("Z") ? session.created_at : session.created_at + "Z"),
      updated_at: session.updated_at
        ? new Date(session.updated_at?.endsWith?.("Z") ? session.updated_at : session.updated_at + "Z")
        : undefined,
    }
}

function parseMemo(memo: any): Memo {
    return {
      ...memo,
      created_at: new Date(memo.created_at?.endsWith?.("Z") ? memo.created_at : memo.created_at + "Z"),
      updated_at: new Date(memo.updated_at?.endsWith?.("Z") ? memo.updated_at : memo.updated_at + "Z"),
    }
}
