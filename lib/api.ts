import type { Memo, PomodoroSession } from "./types"

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
  } catch (err) {
    console.error("Error fetching user:", err)
  }
  return null
}

export const handleLogout = async () => {
  try {
    await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
      method: "POST",
    })
    window.location.href = "/login"
  } catch (err) {
    console.error("Logout failed:", err)
  }
}

// Memo API functions
export const parseMemo = (memo: any): Memo => {
  return {
    ...memo,
    created_at: new Date(memo.created_at?.endsWith?.("Z") ? memo.created_at : memo.created_at + "Z"),
    updated_at: new Date(memo.updated_at?.endsWith?.("Z") ? memo.updated_at : memo.updated_at + "Z"),
  }
}

// Session API functions
export const parseSession = (session: any): PomodoroSession => {
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

export const createSessionInBackend = async (session: Omit<PomodoroSession, "id">): Promise<PomodoroSession | null> => {
  try {
    const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: session.subject,
        goal: session.goal,
        duration: session.duration,
        break_duration: session.break_duration,
        tags: session.tags,
      }),
    })

    if (res && res.ok) {
      return parseSession(await res.json())
    }
  } catch (err) {
    console.error("Error creating session:", err)
  }
  return null
}

export const updateSessionStatus = async (sessionId: string, status: string) => {
  try {
    await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  } catch (err) {
    console.error("Error updating session status:", err)
  }
}

export const updateSessionReflection = async (sessionId: string, reflection: string) => {
  try {
    await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}/reflection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection }),
    })
  } catch (err) {
    console.error("Error updating session reflection:", err)
  }
}

export const deleteSessionFromBackend = async (sessionId: string) => {
  try {
    await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
      method: "DELETE",
    })
  } catch (err) {
    console.error("Error deleting session:", err)
  }
}
