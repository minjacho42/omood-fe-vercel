"use client"

import type React from "react"

import { useEffect, useState, useRef, useMemo } from "react"
import { Plus, Search, Edit3, BookOpen, ShoppingCart, Lightbulb, Briefcase, Heart, Mic, Calendar, Settings, LogOut, User, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sparkles, BarChart3, Grid3X3, Clock, X, Camera, Pause, Play, Trash2, ZoomIn, Timer, CheckCircle, Coffee, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'
import AuthGuard from "@/components/auth-guard"
import CategoryManagement from "@/components/category-management"
import { CircularTimer } from "@/components/circular-timer"
import { SessionProgressCircle } from "@/components/session-progress-circle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

// UUID 생성 함수
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface MemoAttachment {
  id: string
  type: "image" | "audio"
  url: string
  filename: string
}

interface Memo {
  id: string
  user_id: string
  content: string
  attachments: MemoAttachment[]
  tags: string[]
  created_at: string
  updated_at: string
  category?: string
  category_confidence?: number
  is_archived?: boolean
}

interface PomodoroSession {
  id: string
  subject: string
  goal: string
  duration: number
  breakDuration: number
  tags: string[]
  startTime: Date
  endTime?: Date
  reflection?: {
    summary: string
    blockers: string
    insights: string
    nextGoal: string
  }
  completed: boolean
  status?: 'created' | 'started' | 'paused' | 'resumed' | 'cancelled' | 'completed'
}

interface DailySummary {
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

interface CategoryConfig {
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description?: string
}

interface CustomCategory {
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

const CATEGORIES: Record<string, CategoryConfig> = {
  idea: { name: "아이디어", icon: <Lightbulb className="w-4 h-4" />, color: "#F59E0B", bgColor: "bg-amber-500/20" },
  study: { name: "공부", icon: <BookOpen className="w-4 h-4" />, color: "#3B82F6", bgColor: "bg-blue-500/20" },
  shopping: {
    name: "쇼핑",
    icon: <ShoppingCart className="w-4 h-4" />,
    color: "#10B981",
    bgColor: "bg-emerald-500/20",
  },
  work: { name: "업무", icon: <Briefcase className="w-4 h-4" />, color: "#8B5CF6", bgColor: "bg-violet-500/20" },
  personal: { name: "개인", icon: <Heart className="w-4 h-4" />, color: "#EC4899", bgColor: "bg-pink-500/20" },
  quote: { name: "인용구", icon: <BookOpen className="w-4 h-4" />, color: "#6B7280", bgColor: "bg-gray-500/20" },
  uncategorized: {
    name: "분류중",
    icon: <Clock className="w-4 h-4" />,
    color: "#9CA3AF",
    bgColor: "bg-gray-400/20",
  },
}

type ViewMode = "daily" | "weekly" | "monthly"
type AppMode = "memo" | "session"

// Helper function to convert Date to local YYYY-MM-DD string
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to convert UTC datetime string to local date string
const convertUtcToLocalDate = (utcDatetime: string, timeZone: string): string => {
  const utcDate = utcDatetime.endsWith("Z") ? new Date(utcDatetime) : new Date(utcDatetime + "Z")
  const localDate = new Date(utcDate.toLocaleString("en-US", { timeZone }))
  return formatLocalDate(localDate)
}

const getBreakDuration = (focusMinutes: number): number => {
  if (focusMinutes <= 25) return 5
  if (focusMinutes <= 45) return 10
  return 15
}

// Simple markdown renderer component
const MarkdownRenderer: React.FC<{ content: string; isCompact?: boolean }> = ({ content, isCompact = false }) => {
  const renderMarkdown = (text: string) => {
    // Split by lines to preserve line breaks
    const lines = text.split("\n")

    return lines.map((line, index) => {
      // Handle headers
      if (line.startsWith("### ")) {
        return (
          <h3 key={index} className={`font-semibold text-white mb-2 ${isCompact ? "text-base" : "text-lg"}`}>
            {line.slice(4)}
          </h3>
        )
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className={`font-semibold text-white mb-2 mt-4 ${isCompact ? "text-lg" : "text-xl"}`}>
            {line.slice(3)}
          </h2>
        )
      }
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className={`font-bold text-white mb-3 mt-4 ${isCompact ? "text-xl" : "text-2xl"}`}>
            {line.slice(2)}
          </h1>
        )
      }

      // Handle bold text
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')

      // Handle italic text
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em class="italic text-white/90">$1</em>')

      // Handle inline code
      processedLine = processedLine.replace(
        /`(.*?)`/g,
        '<code class="bg-white/20 px-1 py-0.5 rounded text-sm font-mono text-white">$1</code>',
      )

      // Handle links
      processedLine = processedLine.replace(
        /\[([^\]]+)\]$$([^)]+)$$/g,
        '<a href="$2" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>',
      )

      // Handle bullet points
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-white/70 mt-1">•</span>
            <span
              className={`text-white leading-relaxed flex-1 ${isCompact ? "text-sm" : "text-base"}`}
              dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }}
            />
          </div>
        )
      }

      // Handle numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s(.*)/)
      if (numberedMatch) {
        return (
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-white/70 mt-1">{numberedMatch[1]}.</span>
            <span
              className={`text-white leading-relaxed flex-1 ${isCompact ? "text-sm" : "text-base"}`}
              dangerouslySetInnerHTML={{ __html: numberedMatch[2] }}
            />
          </div>
        )
      }

      // Handle empty lines
      if (line.trim() === "") {
        return <br key={index} />
      }

      // Regular paragraph
      return (
        <p
          key={index}
          className={`text-white leading-relaxed mb-2 ${isCompact ? "text-sm" : "text-base"}`}
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      )
    })
  }

  return <div className="space-y-1">{renderMarkdown(content)}</div>
}

// Image modal component
const ImageModal: React.FC<{
  isOpen: boolean
  imageUrl: string
  onClose: () => void
}> = ({ isOpen, imageUrl, onClose }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div className="relative max-w-[66vw] max-h-[66vh] p-4">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={imageUrl || "/placeholder.svg"}
          alt="Full size"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

function MemoSessionApp() {
  // App mode state
  const [appMode, setAppMode] = useState<AppMode>("memo")

  // Preview expansion state for memo cards
  const [expandedPreviews, setExpandedPreviews] = useState<string[]>([])
  const toggleExpand = (id: string) => {
    setExpandedPreviews((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const [memos, setMemos] = useState<Memo[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [timeZone, setTimeZone] = useState<string>("")
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)

  // View mode and date navigation
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Input states
  const [showInput, setShowInput] = useState(false)
  const [inputText, setInputText] = useState("")
  const [inputTags, setInputTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [inputAttachments, setInputAttachments] = useState<{
    images: File[]
    audios: Blob[]
  }>({ images: [], audios: [] })
  const [isRecording, setIsRecording] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)

  // Detail states
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [editCurrentTag, setEditCurrentTag] = useState("")
  const [editAttachments, setEditAttachments] = useState<{
    existing: MemoAttachment[]
    newImages: File[]
    newAudios: Blob[]
  }>({ existing: [], newImages: [], newAudios: [] })

  // Image modal state
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean
    imageUrl: string
  }>({ isOpen: false, imageUrl: "" })

  // Category management states
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showColorCustomization, setShowColorCustomization] = useState(false)

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  // UI states
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [inlineSearchActive, setInlineSearchActive] = useState(false)

  // Weekly/Monthly data
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: Memo[] }>({})
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: { memo_count: number; has_summary: boolean } }>({})

  // Session weekly/monthly data
  const [weeklySessionData, setWeeklySessionData] = useState<{ [key: string]: PomodoroSession[] }>({})
  const [monthlySessionData, setMonthlySessionData] = useState<{ [key: string]: { session_count: number; total_focus_time: number } }>({})

  // Browser locale for date formatting
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US"

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Categories states
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>(CATEGORIES)

  // 카테고리 선택 상태
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editSelectedCategory, setEditSelectedCategory] = useState<string | null>(null)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showEditCategorySelector, setShowEditCategorySelector] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [showEditNewCategoryInput, setShowEditNewCategoryInput] = useState(false)

  // Pomodoro session states
  const [currentPhase, setCurrentPhase] = useState<"setup" | "focus" | "reflection" | "break">("setup")
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  
  // Reflection form states
  const [summary, setSummary] = useState("")
  const [blockers, setBlockers] = useState("")
  const [insights, setInsights] = useState("")
  const [nextGoal, setNextGoal] = useState("")

  // Incomplete reflection modal states
  const [showIncompleteReflectionModal, setShowIncompleteReflectionModal] = useState(false)
  const [incompleteSession, setIncompleteSession] = useState<PomodoroSession | null>(null)

  // Common API call function with 401 handling
  const apiCall = async (url: string, options: RequestInit = {}) => {
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

  const fetchUser = async () => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`)
      if (res && res.ok) {
        const userData = await res.json()
        setUser(userData)
      }
    } catch (err) {
      console.error("Error fetching user:", err)
    }
  }

  const handleLogout = async () => {
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

  const fetchCustomCategories = async () => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`)
      if (res && res.ok) {
        const data = await res.json()
        setCustomCategories(data.categories)

        // Update categories state with custom categories
        const updatedCategories = { ...CATEGORIES }
        data.categories.forEach((cat: CustomCategory) => {
          updatedCategories[cat.key] = {
            name: cat.name,
            icon: getCategoryIcon(cat.icon),
            color: cat.color,
            bgColor: `bg-[${cat.color}]/20`,
            description: cat.description,
          }
        })
        setCategories(updatedCategories)
      }
    } catch (err) {
      console.error("Error fetching custom categories:", err)
    }
  }

  const getCategoryIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      lightbulb: <Lightbulb className="w-4 h-4" />,
      book: <BookOpen className="w-4 h-4" />,
      "shopping-cart": <ShoppingCart className="w-4 h-4" />,
      briefcase: <Briefcase className="w-4 h-4" />,
      heart: <Heart className="w-4 h-4" />,
      clock: <Clock className="w-4 h-4" />,
    }
    return iconMap[iconName] || <BookOpen className="w-4 h-4" />
  }

  // Session lifecycle management functions
  const fetchSessionsFromBackend = async () => {
    try {
      const dateStr = formatLocalDate(currentDate)
      const res = await apiCall(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`
      )
      if (res && res.ok) {
        const data = await res.json()
        const backendSessions = data.sessions || []
        
        // Convert backend sessions to frontend format
        const convertedSessions = backendSessions.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
        }))
        
        // Check for incomplete reflections
        const incompleteReflections = convertedSessions.filter((session: PomodoroSession) => 
          session.completed && !session.reflection
        )
        
        if (incompleteReflections.length > 0) {
          setIncompleteSession(incompleteReflections[0])
          setShowIncompleteReflectionModal(true)
        }
        
        // Merge with local sessions
        const localSessions = JSON.parse(localStorage.getItem("pomodoro-sessions") || "[]")
        const mergedSessions = [...convertedSessions, ...localSessions.filter((local: PomodoroSession) => 
          !convertedSessions.find((backend: PomodoroSession) => backend.id === local.id)
        )]
        
        setSessions(mergedSessions)
      }
    } catch (err) {
      console.error("Error fetching sessions from backend:", err)
    }
  }

  const createSessionInBackend = async (session: PomodoroSession) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          subject: session.subject,
          goal: session.goal,
          duration: session.duration,
          breakDuration: session.breakDuration,
          tags: session.tags,
          startTime: session.startTime.toISOString(),
          completed: session.completed
        }),
      })

      if (res && res.ok) {
        console.log("Session created in backend")
      } else {
        console.error("Failed to create session in backend")
      }
    } catch (err) {
      console.error("Error creating session in backend:", err)
    }
  }

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          timestamp: new Date().toISOString()
        }),
      })

      if (res && res.ok) {
        console.log(`Session status updated to ${status}`)
      } else {
        console.error("Failed to update session status")
      }
    } catch (err) {
      console.error("Error updating session status:", err)
    }
  }

  const deleteSessionFromBackend = async (sessionId: string) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
        method: "DELETE",
      })

      if (res && res.ok) {
        console.log("Session deleted from backend")
      } else {
        console.error("Failed to delete session from backend")
      }
    } catch (err) {
      console.error("Error deleting session from backend:", err)
    }
  }

  const updateSessionWithReflection = async (session: PomodoroSession) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endTime: session.endTime?.toISOString(),
          reflection: session.reflection,
          completed: session.completed
        }),
      })

      if (res && res.ok) {
        console.log("Session reflection updated in backend")
      } else {
        console.error("Failed to update session reflection")
      }
    } catch (err) {
      console.error("Error updating session reflection:", err)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchCustomCategories()
  }, [])

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimeZone(tz)
  }, [])

  useEffect(() => {
    if (!timeZone) return
    if (appMode === "memo") {
      fetchData()
    } else if (appMode === "session") {
      fetchSessionData()
    }
  }, [timeZone, viewMode, currentDate, categoryFilter, appMode])

  // Load session data from localStorage and backend
  useEffect(() => {
    const savedSessions = localStorage.getItem("pomodoro-sessions")
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions))
    }
    
    // Fetch from backend when timezone is available
    if (timeZone && appMode === "session") {
      fetchSessionsFromBackend()
    }
  }, [timeZone, appMode])

  // Save session data to localStorage
  useEffect(() => {
    localStorage.setItem("pomodoro-sessions", JSON.stringify(sessions))
  }, [sessions])

  // Update session view data when sessions change
  useEffect(() => {
    if (appMode === "session") {
      updateSessionViewData()
    }
  }, [sessions, currentDate, viewMode, appMode])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      if (currentPhase === "focus") {
        // Update session status to completed
        if (currentSession) {
          updateSessionStatus(currentSession.id, "completed")
        }
        setCurrentPhase("reflection")
      } else if (currentPhase === "break") {
        setCurrentPhase("setup")
        resetSession()
      }
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, currentPhase, currentSession])

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY
          if (scrollTop > 120 && !isScrolled) {
            setIsScrolled(true)
            window.scrollTo({ top: 120, behavior: "smooth" })
          } else if (scrollTop < 60 && isScrolled) {
            setIsScrolled(false)
            window.scrollTo({ top: 60, behavior: "smooth" })
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isScrolled])

  const fetchData = async () => {
    try {
      if (viewMode === "daily") {
        await fetchDailyData()
      } else if (viewMode === "weekly") {
        await fetchWeeklyData()
      } else if (viewMode === "monthly") {
        await fetchMonthlyData()
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      generateMockData()
    }
  }

  const fetchSessionData = async () => {
    // Session data is handled locally and from backend
    updateSessionViewData()
    if (timeZone) {
      await fetchSessionsFromBackend()
    }
  }

  const updateSessionViewData = () => {
    if (viewMode === "weekly") {
      updateWeeklySessionData()
    } else if (viewMode === "monthly") {
      updateMonthlySessionData()
    }
  }

  const updateWeeklySessionData = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const groupedSessions: { [key: string]: PomodoroSession[] } = {}
    sessions.forEach((session) => {
      const sessionDate = new Date(session.startTime)
      if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
        const dateStr = formatLocalDate(sessionDate)
        if (!groupedSessions[dateStr]) {
          groupedSessions[dateStr] = []
        }
        groupedSessions[dateStr].push(session)
      }
    })

    setWeeklySessionData(groupedSessions)
  }

  const updateMonthlySessionData = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const groupedData: { [key: string]: { session_count: number; total_focus_time: number } } = {}
    sessions.forEach((session) => {
      const sessionDate = new Date(session.startTime)
      if (sessionDate >= firstDay && sessionDate <= lastDay) {
        const dateStr = formatLocalDate(sessionDate)
        if (!groupedData[dateStr]) {
          groupedData[dateStr] = { session_count: 0, total_focus_time: 0 }
        }
        groupedData[dateStr].session_count++
        if (session.completed) {
          groupedData[dateStr].total_focus_time += session.duration
        }
      }
    })

    setMonthlySessionData(groupedData)
  }

  const fetchDailyData = async () => {
    const dateStr = formatLocalDate(currentDate)

    try {
      // Fetch daily memos using /memo/list endpoint
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`

      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setMemos(data || [])
      }

      // Fetch daily summary (if available)
      await fetchDailySummary(dateStr)
    } catch (err) {
      console.error("Error fetching daily data:", err)
    }
  }

  const fetchWeeklyData = async () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startDateStr = formatLocalDate(startOfWeek)
    const endDateStr = formatLocalDate(endOfWeek)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`

      const res = await apiCall(url)
      if (res && res.ok) {
        const memos = await res.json()

        // Group memos by date using local timezone
        const groupedMemos: { [key: string]: Memo[] } = {}
        memos.forEach((memo: Memo) => {
          const localMemoDate = convertUtcToLocalDate(memo.created_at, timeZone)
          if (!groupedMemos[localMemoDate]) {
            groupedMemos[localMemoDate] = []
          }
          groupedMemos[localMemoDate].push(memo)
        })

        setWeeklyData(groupedMemos)
      }
    } catch (err) {
      console.error("Error fetching weekly data:", err)
    }
  }

  const fetchMonthlyData = async () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDateStr = formatLocalDate(firstDay)
    const endDateStr = formatLocalDate(lastDay)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`

      const res = await apiCall(url)
      if (res && res.ok) {
        const memos = await res.json()

        // Group memos by date and count using local timezone
        const groupedData: { [key: string]: { memo_count: number; has_summary: boolean } } = {}
        memos.forEach((memo: Memo) => {
          const localMemoDate = convertUtcToLocalDate(memo.created_at, timeZone)
          if (!groupedData[localMemoDate]) {
            groupedData[localMemoDate] = { memo_count: 0, has_summary: false }
          }
          groupedData[localMemoDate].memo_count++
        })

        setMonthlyData(groupedData)
      }
    } catch (err) {
      console.error("Error fetching monthly data:", err)
    }
  }

  const fetchDailySummary = async (date: string) => {
    try {
      const res = await apiCall(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/summary/daily?date=${date}&tz=${encodeURIComponent(timeZone)}`,
      )
      if (res && res.ok) {
        const data = await res.json()
        setDailySummary(data.summary)
      } else {
        setDailySummary(null)
      }
    } catch (err) {
      console.error("Error fetching daily summary:", err)
      setDailySummary(null)
    }
  }

  const generateMockData = () => {
    // Mock data generation for development
    const mockMemos: Memo[] = [
      {
        id: "1",
        user_id: "user1",
        content:
          "React 18의 새로운 Concurrent Features에 대해 공부했다.\n\n## 주요 특징\n- **Suspense**: 데이터 로딩 상태 관리\n- **Concurrent Rendering**: 우선순위 기반 렌더링\n- `useTransition` 훅으로 상태 업데이트 최적화\n\n정말 흥미로운 기능들이다!",
        attachments: [],
        tags: ["react", "study"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: "study",
        category_confidence: 0.95,
      },
    ]
    setMemos(mockMemos)

    // Mock daily summary for today
    if (viewMode === "daily" && currentDate.toDateString() === new Date().toDateString()) {
      const mockSummary: DailySummary = {
        date: formatLocalDate(currentDate),
        ai_comment: "오늘은 주로 학습과 아이디어 정리에 집중하신 하루였네요. 특히 React 관련 내용이 많았습니다.",
        category_summaries: [
          {
            category: "study",
            summary: "React 18의 Concurrent Features에 대해 학습",
            memo_count: 1,
          },
        ],
        total_memos: 1,
        created_at: new Date().toISOString(),
      }
      setDailySummary(mockSummary)
    }
  }

  const createNewCategory = async (name: string, isForEdit = false) => {
    if (!name.trim()) return

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
        const newCategory = await res.json()
        await fetchCustomCategories()

        if (isForEdit) {
          setEditSelectedCategory(newCategory.key)
          setShowEditNewCategoryInput(false)
          setShowEditCategorySelector(false)
        } else {
          setSelectedCategory(newCategory.key)
          setShowNewCategoryInput(false)
          setShowCategorySelector(false)
        }
        setNewCategoryName("")
      }
    } catch (err) {
      console.error("Failed to create category:", err)
    }
  }

  const handleSubmit = async () => {
    if (!inputText.trim()) return

    const allTags = currentTag.trim() ? [...inputTags, currentTag.trim()] : inputTags
    const memoId = generateUUID()

    const formData = new FormData()
    formData.append("id", memoId)
    formData.append("content", inputText)
    formData.append("tags", allTags.join(","))

    // 선택된 카테고리 추가
    if (selectedCategory) {
      formData.append("category", selectedCategory)
    }

    // Add image attachments with proper naming convention
    inputAttachments.images.forEach((file, index) => {
      formData.append(`image_${index}`, file, file.name)
    })

    // Add audio attachments with proper naming convention
    inputAttachments.audios.forEach((blob, index) => {
      const file = new File([blob], `audio_${index}.wav`, { type: "audio/wav" })
      formData.append(`audio_${index}`, file)
    })

    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo`, {
        method: "POST",
        body: formData,
      })

      if (res && res.ok) {
        resetInputState()
        fetchData()
      } else if (res) {
        console.error("Failed to create memo:", await res.text())
      }
    } catch (err) {
      console.error("Submit failed:", err)
    }
  }

  const handleEdit = async () => {
    if (!selectedMemo) return

    const allEditTags = editCurrentTag.trim() ? [...editTags, editCurrentTag.trim()] : editTags

    const formData = new FormData()
    formData.append("content", editText)
    formData.append("tags", allEditTags.join(","))

    // 선택된 카테고리 추가
    if (editSelectedCategory !== null) {
      formData.append("category", editSelectedCategory)
    }

    editAttachments.newImages.forEach((file, index) => {
      formData.append(`new_image_${index}`, file)
    })

    editAttachments.newAudios.forEach((blob, index) => {
      const file = new File([blob], `new_audio_${index}.wav`, { type: "audio/wav" })
      formData.append(`new_audio_${index}`, file)
    })

    formData.append("keep_attachments", editAttachments.existing.map((att) => att.id).join(","))

    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${selectedMemo.id}`, {
        method: "PUT",
        body: formData,
      })

      if (res && res.ok) {
        resetDetailState()
        fetchData()
      }
    } catch (err) {
      console.error("Edit failed:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${id}`, {
        method: "DELETE",
      })
      if (res) {
        resetDetailState()
        fetchData()
      }
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  // Pomodoro session functions with backend integration
  const startSession = async (sessionData: { subject: string; goal: string; duration: number; tags: string[] }) => {
    const breakDuration = getBreakDuration(sessionData.duration)
    const sessionId = generateUUID()
    
    const newSession: PomodoroSession = {
      id: sessionId,
      subject: sessionData.subject,
      goal: sessionData.goal,
      duration: sessionData.duration,
      breakDuration,
      tags: sessionData.tags,
      startTime: new Date(),
      completed: false,
      status: 'created'
    }
    
    setCurrentSession(newSession)
    setTimeLeft(sessionData.duration * 60)
    setCurrentPhase("focus")
    setIsRunning(false)

    // Create session in backend
    await createSessionInBackend(newSession)
  }

  const toggleTimer = async () => {
    const newRunningState = !isRunning
    setIsRunning(newRunningState)
    
    if (currentSession) {
      if (newRunningState) {
        // Starting or resuming
        const status = currentSession.status === 'created' ? 'started' : 'resumed'
        await updateSessionStatus(currentSession.id, status)
        setCurrentSession(prev => prev ? { ...prev, status: status as any } : null)
      } else {
        // Pausing
        await updateSessionStatus(currentSession.id, 'paused')
        setCurrentSession(prev => prev ? { ...prev, status: 'paused' } : null)
      }
    }
  }

  const resetTimer = () => {
    setIsRunning(false)
    if (currentSession) {
      if (currentPhase === "focus") {
        setTimeLeft(currentSession.duration * 60)
      } else if (currentPhase === "break") {
        setTimeLeft(currentSession.breakDuration * 60)
      }
    }
  }

  const completeReflection = async () => {
    if (!currentSession) return
    
    const completedSession: PomodoroSession = {
      ...currentSession,
      endTime: new Date(),
      reflection: {
        summary,
        blockers,
        insights,
        nextGoal
      },
      completed: true,
      status: 'completed'
    }
    
    setSessions(prev => [...prev, completedSession])
    
    // Update session in backend with reflection
    await updateSessionWithReflection(completedSession)
    
    // Start break
    setTimeLeft(currentSession.breakDuration * 60)
    setCurrentPhase("break")
    setIsRunning(true)
    
    // Clear reflection form
    setSummary("")
    setBlockers("")
    setInsights("")
    setNextGoal("")
  }

  const resetSession = () => {
    setCurrentSession(null)
    setTimeLeft(0)
  }

  const cancelCurrentTask = async () => {
    if (currentSession) {
      // Delete session from backend
      await deleteSessionFromBackend(currentSession.id)
    }
    
    setIsRunning(false)
    setCurrentPhase("setup")
    resetSession()
  }

  const handleIncompleteReflectionSubmit = async () => {
    if (!incompleteSession) return
    
    const updatedSession: PomodoroSession = {
      ...incompleteSession,
      reflection: {
        summary,
        blockers,
        insights,
        nextGoal
      }
    }
    
    // Update session in backend with reflection
    await updateSessionWithReflection(updatedSession)
    
    // Update local sessions
    setSessions(prev => prev.map(session => 
      session.id === updatedSession.id ? updatedSession : session
    ))
    
    // Clear form and close modal
    setSummary("")
    setBlockers("")
    setInsights("")
    setNextGoal("")
    setShowIncompleteReflectionModal(false)
    setIncompleteSession(null)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        if (isEditing && selectedMemo) {
          setEditAttachments((prev) => ({
            ...prev,
            newAudios: [...prev.newAudios, blob],
          }))
        } else {
          setInputAttachments((prev) => ({
            ...prev,
            audios: [...prev.audios, blob],
          }))
        }
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Recording failed:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const addImages = (files: FileList | null) => {
    if (!files) return

    const validImages = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) return false
      if (file.size > 10 * 1024 * 1024) return false
      return true
    })

    if (isEditing && selectedMemo) {
      setEditAttachments((prev) => ({
        ...prev,
        newImages: [...prev.newImages, ...validImages],
      }))
    } else {
      setInputAttachments((prev) => ({
        ...prev,
        images: [...prev.images, ...validImages],
      }))
    }
    setShowImageOptions(false)
  }

  const addEditImages = (files: FileList | null) => {
    if (!files) return

    const validImages = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) return false
      if (file.size > 10 * 1024 * 1024) return false
      return true
    })

    setEditAttachments((prev) => ({
      ...prev,
      newImages: [...prev.newImages, ...validImages],
    }))
    setShowImageOptions(false)
  }

  const removeInputImage = (index: number) => {
    setInputAttachments((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const removeInputAudio = (index: number) => {
    setInputAttachments((prev) => ({
      ...prev,
      audios: prev.audios.filter((_, i) => i !== index),
    }))
  }

  const removeExistingAttachment = (attachmentId: string) => {
    setEditAttachments((prev) => ({
      ...prev,
      existing: prev.existing.filter((att) => att.id !== attachmentId),
    }))
  }

  const playAudio = (audioId: string, url: string) => {
    if (playingAudio === audioId) {
      audioRefs.current[audioId]?.pause()
      setPlayingAudio(null)
    } else {
      Object.values(audioRefs.current).forEach((audio) => audio.pause())

      if (!audioRefs.current[audioId]) {
        audioRefs.current[audioId] = new Audio(url)
        audioRefs.current[audioId].onended = () => setPlayingAudio(null)
      }
      audioRefs.current[audioId].play()
      setPlayingAudio(audioId)
    }
  }

  const resetInputState = () => {
    setShowInput(false)
    setInputText("")
    setInputTags([])
    setCurrentTag("")
    setInputAttachments({ images: [], audios: [] })
    setShowImageOptions(false)
    setSelectedCategory(null)
    setShowCategorySelector(false)
    setNewCategoryName("")
    setShowNewCategoryInput(false)
  }

  const resetDetailState = () => {
    setSelectedMemo(null)
    setIsEditing(false)
    setEditText("")
    setEditTags([])
    setEditCurrentTag("")
    setEditAttachments({ existing: [], newImages: [], newAudios: [] })
    setEditSelectedCategory(null)
    setShowEditCategorySelector(false)
    setShowEditNewCategoryInput(false)
  }

  const addTag = () => {
    if (currentTag.trim() && !inputTags.includes(currentTag.trim())) {
      setInputTags([...inputTags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const removeTag = (index: number) => {
    setInputTags(inputTags.filter((_, i) => i !== index))
  }

  const addEditTag = () => {
    if (editCurrentTag.trim() && !editTags.includes(editCurrentTag.trim())) {
      setEditTags([...editTags, editCurrentTag.trim()])
      setEditCurrentTag("")
    }
  }

  const removeEditTag = (index: number) => {
    setEditTags(editTags.filter((_, i) => i !== index))
  }

  // Navigation functions
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)

    if (viewMode === "daily") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    } else if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    } else if (viewMode === "monthly") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
    }

    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDateHeader = () => {
    if (viewMode === "daily") {
      return currentDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    } else if (viewMode === "weekly") {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      return `${startOfWeek.toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`
    } else {
      return currentDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
      })
    }
  }

  const memoCategories = useMemo(() => {
    const cats = memos.map((m) => m.category).filter(Boolean)
    return Array.from(new Set(cats))
  }, [memos])

  const filteredMemos = memos.filter((memo) => {
    if (categoryFilter && memo.category !== categoryFilter) {
      return false
    }
    if (searchQuery) {
      return (
        memo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memo.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    return true
  })

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

  // Session statistics functions
  const getTodayStats = () => {
    const today = formatLocalDate(currentDate)
    const todaySessions = sessions.filter(session => 
      formatLocalDate(new Date(session.startTime)) === today
    )
    const completedSessions = todaySessions.filter(s => s.completed)
    
    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: todaySessions.length,
      sessions: todaySessions
    }
  }

  const getWeeklyStats = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime)
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek
    })
    const completedSessions = weekSessions.filter(s => s.completed)
    
    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: weekSessions.length,
      sessions: weekSessions
    }
  }

  const getMonthlyStats = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const monthSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime)
      return sessionDate >= firstDay && sessionDate <= lastDay
    })
    const completedSessions = monthSessions.filter(s => s.completed)
    
    return {
      totalFocusTime: completedSessions.reduce((acc, session) => acc + session.duration, 0),
      sessionsCompleted: completedSessions.length,
      totalSessions: monthSessions.length,
      sessions: monthSessions
    }
  }

  const renderDailySummary = () => {
    // Case 1: No memos for the day
    if (memos.length === 0) {
      return (
        <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2
