"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import {
  Plus,
  Search,
  Edit3,
  Calendar,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  BarChart3,
  Grid3X3,
  X,
  Trash2,
  Timer,
  CheckCircle,
  ChevronRight,
} from "lucide-react"
import { SessionProgressCircle } from "@/components/session-progress-circle"
import { Button } from "@/components/ui/button"
import { motion, useAnimation } from "framer-motion"
import { useDrag } from "@use-gesture/react"

import type {
  Memo,
  PomodoroSession,
  DailySummary,
  CategoryConfig,
  CustomCategory,
  ViewMode,
  AppMode,
  MemoAttachment,
} from "@/lib/types"
import { CATEGORIES } from "@/lib/constants"
import { fetchUser, handleLogout } from "@/lib/api"
import { useMemo as useMemoHook } from "@/hooks/use-memo"
import { useSession } from "@/hooks/use-session"

interface SessionCardProps {
  session: PomodoroSession
  locale: string
  timeZone: string
  sessionReflections: { [sessionId: string]: string }
  setSessionReflections: React.Dispatch<React.SetStateAction<{ [sessionId: string]: string }>>
  handleReflectionSubmit: (sessionId: string) => Promise<void>
  deleteSessionFromBackend: (sessionId: string) => Promise<void>
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
  const [appMode, setAppMode] = useState<AppMode>("session")
  const timerRef = useRef<HTMLDivElement | null>(null)

  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [timeZone, setTimeZone] = useState<string>("")
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const memoHook = useMemoHook(timeZone, currentDate)
  const sessionHook = useSession(timeZone, currentDate, user)

  // Preview expansion state for memo cards
  const [expandedPreviews, setExpandedPreviews] = useState<string[]>([])
  const toggleExpand = (id: string) => {
    setExpandedPreviews((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const [memos, setMemos] = useState<Memo[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)

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
  const [monthlySessionData, setMonthlySessionData] = useState<{
    [key: string]: { session_count: number; total_focus_time: number }
  }>({})

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
  const [currentPhase, setCurrentPhase] = useState<"setup" | "focus" | "break">("setup")
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [showSessionTimer, setShowSessionTimer] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [breakStartedAt, setBreakStartedAt] = useState<Date | null>(null)

  // Session reflection states
  const [sessionReflections, setSessionReflections] = useState<{ [sessionId: string]: string }>({})

  const SessionCard: React.FC<SessionCardProps> = ({
    session,
    locale,
    timeZone,
    sessionReflections,
    setSessionReflections,
    handleReflectionSubmit,
    deleteSessionFromBackend,
  }) => {
    const controls = useAnimation()
    const bgControls = useAnimation()

    const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      const trigger = vx > 0.2 // If velocity is high, trigger action
      const isSwipingLeft = xDir < 0

      if (!down && trigger && isSwipingLeft) {
        controls.start({ x: -80 })
        bgControls.start({ opacity: 1 })
      } else if (!down) {
        controls.start({ x: 0 })
        bgControls.start({ opacity: 0 })
      }
    })

    const handleDeleteClick = async (e: React.MouseEvent) => {
      e.stopPropagation()
      await deleteSessionFromBackend(session.id)
    }

    const utcCreated =
      typeof session.created_at === "string"
        ? new Date(session.created_at.endsWith("Z") ? session.created_at : session.created_at + "Z")
        : session.created_at
    const time = utcCreated.toLocaleString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
          return "bg-green-400"
        case "started":
          return "bg-blue-400"
        case "paused":
          return "bg-yellow-400"
        case "cancelled":
          return "bg-red-400"
        case "reviewed":
          return "bg-purple-400"
        default:
          return "bg-gray-400"
      }
    }

    const getStatusText = (status: string) => {
      switch (status) {
        case "completed":
          return "완료"
        case "started":
          return "진행중"
        case "paused":
          return "일시정지"
        case "cancelled":
          return "취소됨"
        case "pending":
          return "대기중"
        case "reviewed":
          return "회고완료"
        default:
          return status
      }
    }

    return (
      <div key={session.id} className="relative overflow-hidden rounded-2xl">
        <motion.div
          animate={bgControls}
          initial={{ opacity: 0 }}
          className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center"
        >
          <Button onClick={handleDeleteClick} className="bg-transparent hover:bg-red-600 p-4 rounded-full">
            <Trash2 className="w-6 h-6 text-white" />
          </Button>
        </motion.div>
        <motion.div
          {...bind()}
          animate={controls}
          drag="x"
          dragConstraints={{ left: -200, right: 0 }}
          dragElastic={0.2}
          className="relative z-10 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-all duration-200"
        >
          {/* Header with timer icon and time */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Timer className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-white/90">포모도로 세션</span>
              </div>
            </div>
            <span className="text-xs text-white/60">{time}</span>
          </div>

          {/* Session content */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2">{session.subject}</h3>
            {session.goal && <p className="text-white/80 text-sm mb-3">{session.goal}</p>}

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <SessionProgressCircle duration={session.duration} size={32} />
                <span className="text-white/70 text-sm">{session.duration}분</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                <span className="text-white/70 text-sm">{getStatusText(session.status)}</span>
              </div>
            </div>

            {session.reflection && (
              <div className="text-sm text-white/70 bg-white/5 rounded-lg p-3 mb-3">
                <p>
                  <strong>회고:</strong> {session.reflection}
                </p>
              </div>
            )}

            {/* Reflection input for completed sessions without reflection */}
            {session.status === "completed" && !session.reflection && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">회고 작성</span>
                </div>
                <textarea
                  placeholder="이 세션에서 무엇을 완료했나요? 어떤 점이 좋았고 개선할 점은 무엇인가요?"
                  value={sessionReflections[session.id] || ""}
                  onChange={(e) =>
                    setSessionReflections((prev) => ({
                      ...prev,
                      [session.id]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none mb-2"
                />
                <button
                  onClick={() => handleReflectionSubmit(session.id)}
                  disabled={!sessionReflections[session.id]?.trim()}
                  className="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-all"
                >
                  회고 저장
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          {session.tags && session.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {session.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-white/15 text-white/80 font-medium">
                  {tag}
                </span>
              ))}
              {session.tags.length > 3 && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/60">
                  +{session.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // Added missing function definitions
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

  useEffect(() => {
    const initializeApp = async () => {
      const userData = await fetchUser()
      if (userData) {
        setUser(userData)
      }
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
    initializeApp()
  }, [])

  useEffect(() => {
    if (!timeZone) return

    if (appMode === "memo") {
      if (viewMode === "daily") {
        memoHook.fetchDailyData()
      } else if (viewMode === "weekly") {
        memoHook.fetchWeeklyData()
      } else if (viewMode === "monthly") {
        memoHook.fetchMonthlyData()
      }
      memoHook.fetchCustomCategories()
    } else if (appMode === "session") {
      sessionHook.fetchDailySessionData()
      sessionHook.fetchCurrentSession()
    }
  }, [timeZone, currentDate, viewMode, appMode])

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

  // For sticky search bar position
  const headerHeight = isScrolled ? 48 : 64
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overscroll-none">
      <div className="max-w-md mx-auto relative min-h-screen overscroll-none">
        {/* Header */}
        <div
          className={`sticky top-0 z-20  backdrop-blur-2xl bg-white/20 border border-white/20 shadow-lg transition-all duration-300 rounded-b-3xl ${
            isScrolled ? "p-2" : "p-4"
          }`}
          style={{ ["--header-height" as any]: `${headerHeight}px` }}
        >
          <div className="flex items-center justify-between mb-4">
            <img
              src="/omood.svg"
              alt="Omood logo"
              className={`transition-all duration-300 ${isScrolled ? "h-6" : "h-8"}`}
            />
            <div className="flex items-center gap-2">
              {/* App Mode Toggle */}
              <div className="flex rounded-lg bg-white/10 p-1">
                <button
                  onClick={() => setAppMode("memo")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    appMode === "memo" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setAppMode("session")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    appMode === "session" ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Timer className="w-3 h-3" />
                </button>
              </div>

              {appMode === "memo" && (
                <>
                  <button
                    onClick={() => setShowInput(true)}
                    className={`rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all ${
                      isScrolled ? "w-8 h-8" : "w-10 h-10"
                    }`}
                  >
                    <Plus className={`${isScrolled ? "w-4 h-4" : "w-5 h-5"}`} />
                  </button>

                  <button
                    onClick={() => {
                      const next = !inlineSearchActive
                      setInlineSearchActive(next)
                      if (!next) setSearchQuery("")
                    }}
                    className={`rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all ${
                      isScrolled ? "w-8 h-8" : "w-10 h-10"
                    }`}
                  >
                    <Search className={`${isScrolled ? "w-4 h-4" : "w-5 h-5"}`} />
                  </button>

                  {inlineSearchActive && (
                    <div className="flex items-center transition-all duration-300 max-w-xs opacity-100">
                      <input
                        type="text"
                        placeholder="Search memos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-2 py-1 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </>
              )}

              {appMode === "session" && (
                <button
                  onClick={() => setShowSessionTimer((prev) => !prev)}
                  className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <Timer className="w-5 h-5 text-purple-400" />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all ${
                    isScrolled ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <User className={`${isScrolled ? "w-4 h-4" : "w-5 h-5"}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-xl">
                    {user && (
                      <div className="mb-4 pb-4 border-b border-white/20">
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-white/60 text-sm">{user.email}</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowCategoryManagement(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:bg-white/10 transition-all mb-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>카테고리 관리</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:bg-white/10 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation - 공통으로 사용 */}
          <>
            {/* View Mode Navigation */}
            <div className="mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === "daily" ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  일간
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === "weekly" ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  주간
                </button>
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === "monthly" ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  월간
                </button>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateDate("prev")}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="text-white font-semibold text-lg">{formatDateHeader()}</h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => goToToday()}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-all"
                >
                  오늘
                </button>
                <button
                  onClick={() => navigateDate("next")}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        </div>

        {/* Main Content */}
        <div className="p-4 pt-0">
          {showSessionTimer && (
            <div className="mb-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">포모도로 타이머</h3>
              {/* Timer display and controls */}
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-white">
                  {/* {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} */}
                </div>
                <p className="text-white/70 text-sm">
                  {currentPhase === "focus" ? "집중 시간" : currentPhase === "break" ? "휴식 시간" : "준비"}
                </p>
              </div>

              {/* Session setup form */}
              {currentPhase === "setup" && <div>{/* <SessionSetupForm startSession={startSession} /> */}</div>}

              {/* Timer controls */}
              {currentPhase !== "setup" && (
                <div className="flex items-center justify-center gap-4">
                  {/* <button
                    onClick={toggleTimer}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all"
                  >
                    {isRunning ? "일시정지" : "시작"}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-all"
                  >
                    재설정
                  </button>
                  <button
                    onClick={cancelCurrentTask}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                  >
                    취소
                  </button> */}
                </div>
              )}
            </div>
          )}

          {/* Daily View */}
          {viewMode === "daily" && (
            <>
              {appMode === "memo" ? (
                <>
                  {/* {renderDailySummary()} */}
                  {/* <MemoInput
                    showInput={showInput}
                    inputText={inputText}
                    inputTags={inputTags}
                    currentTag={currentTag}
                    inputAttachments={inputAttachments}
                    isRecording={isRecording}
                    showImageOptions={showImageOptions}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    showCategorySelector={showCategorySelector}
                    newCategoryName={newCategoryName}
                    showNewCategoryInput={showNewCategoryInput}
                    handleSubmit={handleSubmit}
                    resetInputState={resetInputState}
                    setInputText={setInputText}
                    setInputTags={setInputTags}
                    setCurrentTag={setCurrentTag}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    fileInputRef={fileInputRef}
                    cameraInputRef={cameraInputRef}
                    setShowImageOptions={setShowImageOptions}
                    addImages={addImages}
                    removeInputImage={removeInputImage}
                    removeInputAudio={removeInputAudio}
                    setCategories={setCategories}
                    setSelectedCategory={setSelectedCategory}
                    setShowCategorySelector={setShowCategorySelector}
                    setNewCategoryName={setNewCategoryName}
                    setShowNewCategoryInput={setShowNewCategoryInput}
                    addTag={addTag}
                    removeTag={removeTag}
                    createNewCategory={createNewCategory}
                  /> */}

                  {/* <MemoDetail
                    selectedMemo={selectedMemo}
                    isEditing={isEditing}
                    editText={editText}
                    editTags={editTags}
                    editCurrentTag={editCurrentTag}
                    editAttachments={editAttachments}
                    categories={categories}
                    editSelectedCategory={editSelectedCategory}
                    showEditCategorySelector={showEditCategorySelector}
                    showEditNewCategoryInput={showEditNewCategoryInput}
                    resetDetailState={resetDetailState}
                    setIsEditing={setIsEditing}
                    setEditText={setEditText}
                    setEditTags={setEditTags}
                    setEditCurrentTag={setEditCurrentTag}
                    setEditAttachments={setEditAttachments}
                    setEditSelectedCategory={setEditSelectedCategory}
                    setShowEditCategorySelector={setShowEditCategorySelector}
                    setShowEditNewCategoryInput={setShowEditNewCategoryInput}
                    editFileInputRef={editFileInputRef}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    removeExistingAttachment={removeExistingAttachment}
                    addEditImages={addEditImages}
                    addEditTag={addEditTag}
                    removeEditTag={removeEditTag}
                    createNewCategory={createNewCategory}
                    playAudio={playAudio}
                    audioRefs={audioRefs}
                    playingAudio={playingAudio}
                    imageModal={imageModal}
                    setImageModal={setImageModal}
                  /> */}

                  {/* <div className="space-y-4">
                    {filteredMemos.length > 0 ? (
                      filteredMemos.map((memo) => renderMemoCard(memo))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white/70 text-lg mb-2">메모가 없습니다</p>
                        <p className="text-white/50 text-sm">새로운 메모를 작성해서 하루를 기록해보세요</p>
                      </div>
                    )}
                  </div> */}
                </>
              ) : (
                <>
                  {/* {renderSessionDailySummary()} */}
                  <div className="space-y-4">
                    {/* {sessions.length > 0 ? (
                      sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          locale={locale}
                          timeZone={timeZone}
                          sessionReflections={sessionReflections}
                          setSessionReflections={setSessionReflections}
                          handleReflectionSubmit={handleReflectionSubmit}
                          deleteSessionFromBackend={deleteSessionFromBackend}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white/70 text-lg mb-2">세션이 없습니다</p>
                        <p className="text-white/50 text-sm">새로운 포모도로 세션을 시작해보세요</p>
                      </div>
                    )} */}
                  </div>
                </>
              )}
            </>
          )}

          {/* Weekly View */}
          {/* {viewMode === "weekly" && renderWeeklyView()} */}

          {/* Monthly View */}
          {/* {viewMode === "monthly" && renderMonthlyView()} */}
        </div>

        {/* Category Management Modal */}
        {/* <CategoryManagement
          showCategoryManagement={showCategoryManagement}
          setShowCategoryManagement={setShowCategoryManagement}
          categories={categories}
          setCategories={setCategories}
          customCategories={customCategories}
          setCustomCategories={setCustomCategories}
          fetchCustomCategories={fetchCustomCategories}
          showColorCustomization={showColorCustomization}
          setShowColorCustomization={setShowColorCustomization}
        /> */}

        {/* Image Modal */}
        {/* <ImageModal
          isOpen={imageModal.isOpen}
          imageUrl={imageModal.imageUrl}
          onClose={() => setImageModal({ isOpen: false, imageUrl: "" })}
        /> */}
      </div>
    </div>
  )
}

export default MemoSessionApp
