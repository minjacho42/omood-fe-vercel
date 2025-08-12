"use client"

import type React from "react"

import { useEffect, useState, useRef, useMemo } from "react"
import {
  Plus,
  Search,
  Edit3,
  BookOpen,
  ShoppingCart,
  Lightbulb,
  Briefcase,
  Heart,
  Mic,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Clock,
  X,
  Camera,
  Pause,
  Trash2,
  Timer,
  CheckCircle,
  Target,
} from "lucide-react"
import { CircularTimer } from "@/components/circular-timer"
import { SessionProgressCircle } from "@/components/session-progress-circle"
import { Button } from "@/components/ui/button"
import { motion, useAnimation } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { Badge } from "@/components/ui/badge"

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
  created_at: Date
  updated_at: Date
  category?: string
  category_confidence?: number
  is_archived?: boolean
}

interface PomodoroSession {
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

// Helper function to convert Date object (UTC) to local date string
const convertUtcToLocalDate = (utcDate: Date, timeZone: string): string => {
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

interface SessionCardProps {
  session: PomodoroSession
  locale: string
  timeZone: string
  sessionReflections: { [sessionId: string]: string }
  setSessionReflections: React.Dispatch<React.SetStateAction<{ [sessionId: string]: string }>>
  handleReflectionSubmit: (sessionId: string) => Promise<void>
  deleteSessionFromBackend: (sessionId: string) => Promise<void>
}

interface CircularTimerProps {
  duration: number
  timeLeft: number
  isRunning: boolean
  isBreak: boolean
  onToggle: () => void
  onReset: () => void
  onCancel?: () => void
  sessionTitle?: string
  sessionGoal?: string
  sessionTags?: string[]
  sessionStartTime?: Date
  onStartSession: (sessionData: { subject: string; goal: string; duration: number; tags: string[] }) => Promise<void>
  onDurationChange?: (newDuration: number) => void
  currentSession?: {
    status: "pending" | "started" | "paused" | "completed" | "cancelled"
  }
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  locale,
  timeZone,
  sessionReflections,
  setSessionReflections,
  handleReflectionSubmit,
  deleteSessionFromBackend,
}) => {
  const [showSessionDetail, setShowSessionDetail] = useState(false)
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
      bgControls.start({ x: 0 })
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSessionDetail(true)
              }}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-all"
            >
              상세
            </button>
            <span className="text-xs text-white/60">{time}</span>
          </div>
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
      {/* Session Detail Modal */}
      {showSessionDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">📋 세션 정보</h2>
                <button
                  onClick={() => setShowSessionDetail(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Session Info */}
              <div className="space-y-4">
                {/* Title */}
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white/70 mb-1">주제</div>
                    <div className="text-lg font-bold text-white">{session.subject}</div>
                  </div>
                </div>

                {/* Goal */}
                {session.goal && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white/70 mb-1">목표</div>
                      <div className="text-white">{session.goal}</div>
                    </div>
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white/70 mb-1">설정 시간</div>
                    <div className="text-white">{session.duration}분</div>
                  </div>
                </div>

                {/* Start Time */}
                {session.started_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white/70 mb-1">시작 시간</div>
                      <div className="text-white">
                        {new Date(session.started_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {session.tags && session.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-white/70 mb-2">태그</div>
                    <div className="flex flex-wrap gap-2">
                      {session.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs bg-white/20 text-white">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Status */}
                <div className="mt-6 p-4 bg-white/10 border border-white/20 rounded-xl">
                  <div className="text-sm font-semibold text-white/70 mb-2">세션 상태</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">{getStatusText(session.status)}</span>
                    <span className="text-lg font-mono font-bold text-white">{session.duration}분</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6">
                <Button
                  onClick={() => setShowSessionDetail(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  확인
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemoSessionApp() {
  // App mode state
  const [appMode, setAppMode] = useState<AppMode>("session")

  const timerRef = useRef<HTMLDivElement | null>(null)

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

  const createSessionInBackend = async (session: PomodoroSession) => {
    try {
      // Explicitly exclude `id` and other client-side only fields if any
      const sessionPayload = {
        subject: session.subject,
        goal: session.goal,
        duration: session.duration,
        break_duration: session.break_duration,
        tags: session.tags,
        status: session.status,
        created_at: session.created_at,
        // user_id is handled by the backend based on the session/cookie
      }

      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      })

      if (res && res.ok) {
        const newSessionData = await res.json()
        console.log("Session created in backend")
        await fetchSessionData()
        return newSessionData // Return the created session data
      } else {
        console.error("Failed to create session in backend")
        return null
      }
    } catch (err) {
      console.error("Error creating session in backend:", err)
      return null
    }
  }

  const updateSessionStatus = async (sessionId: string, status: string) => {
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

      if (res && res.ok) {
        console.log(`Session status updated to ${status}`)
        // Refresh sessions from backend
        await fetchSessionData()
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
        // Refresh sessions from backend
        await fetchSessionData()
      } else {
        console.error("Failed to delete session from backend")
      }
    } catch (err) {
      console.error("Error deleting session from backend:", err)
    }
  }

  const updateSessionReflection = async (sessionId: string, reflection: string) => {
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

      if (res && res.ok) {
        console.log("Session reflection updated in backend")
        // Refresh sessions from backend
        await fetchSessionData()
      } else {
        console.error("Failed to update session reflection")
      }
    } catch (err) {
      console.error("Error updating session reflection:", err)
    }
  }

  const updateSessionDuration = async (sessionId: string, newDuration: number) => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: newDuration,
          break_duration: getBreakDuration(newDuration),
          updated_at: new Date().toISOString(),
        }),
      })

      if (res && res.ok) {
        console.log("Session duration updated")
        // 현재 세션 상태 업데이트
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                duration: newDuration,
                break_duration: getBreakDuration(newDuration),
                updated_at: new Date(),
              }
            : null,
        )
        // 새로운 duration으로 timeLeft 재설정
        setTimeLeft(newDuration * 60)
        await fetchSessionData()
      } else {
        console.error("Failed to update session duration")
      }
    } catch (err) {
      console.error("Error updating session duration:", err)
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

  // Timer logic for current session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        if (currentPhase === "focus" && currentSession?.status === "started" && currentSession.started_at) {
          const now = Date.now()
          const started = new Date(currentSession.started_at).getTime()
          const elapsed = Math.floor((now - started) / 1000)
          const newTimeLeft = Math.max(0, currentSession.duration * 60 - elapsed)
          setTimeLeft(newTimeLeft)
        } else if (currentPhase === "break" && currentSession && breakStartedAt) {
          const now = Date.now()
          const started = breakStartedAt.getTime()
          const elapsed = Math.floor((now - started) / 1000)
          const newTimeLeft = Math.max(0, currentSession.break_duration * 60 - elapsed)
          setTimeLeft(newTimeLeft)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, currentSession, currentPhase, breakStartedAt])

  useEffect(() => {
    if (timeLeft < 1 && isRunning && currentSession) {
      setIsRunning(false)
      if (currentPhase === "focus") {
        const completedSession = {
          ...currentSession,
          status: "completed" as const,
          updated_at: new Date(),
        }
        setCurrentSession(completedSession)
        updateSessionStatus(currentSession.id, "completed")
        fetchSessionData()
        setCurrentPhase("break")
        setTimeLeft(currentSession.break_duration * 60)
        setBreakStartedAt(new Date())
        setIsRunning(true)
      } else if (currentPhase === "break") {
        setCurrentPhase("setup")
        setCurrentSession(null)
        setTimeLeft(0)
      }
    }
  }, [timeLeft, isRunning, currentSession, currentPhase])

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

  useEffect(() => {
    if (appMode === "session" && ["focus", "setup"].includes(currentPhase)) {
      fetchCurrentSession()
    }
  }, [appMode, viewMode, currentDate, timeZone])

  useEffect(() => {
    if (appMode === "session" && ["focus", "setup"].includes(currentPhase)) {
      if (currentSession) {
        // 타이머 초기화/세팅
        if (["started", "paused"].includes(currentSession.status) && currentSession.started_at) {
          const now = Date.now()
          const started = new Date(currentSession.started_at).getTime()
          const updated = new Date(currentSession.updated_at).getTime()
          let elapsed = 0
          if (currentSession.status === "paused") {
            elapsed = Math.floor((updated - started) / 1000) // 초 단위
          } else if (currentSession.status === "started") {
            elapsed = Math.floor((now - started) / 1000) // 초 단위
          }
          const remaining = Math.max(0, currentSession.duration * 60 - elapsed)
          setTimeLeft(remaining)
          setIsRunning(currentSession.status === "started")
        } else {
          setTimeLeft(currentSession?.duration ? currentSession.duration * 60 : 0)
          setIsRunning(false)
        }
        setCurrentPhase("focus")
      } else {
        setTimeLeft(0)
        setIsRunning(false)
        setCurrentPhase("setup")
      }
    }
  }, [currentSession, viewMode, appMode])

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
    }
  }

  const fetchSessionData = async () => {
    // Session data is handled from backend
    try {
      if (viewMode === "daily") {
        await fetchDailySessionData()
      } else if (viewMode === "weekly") {
        await fetchWeeklySessionData()
      } else if (viewMode === "monthly") {
        await fetchMonthlySessionData()
      }
    } catch (err) {
      console.error("Error fetching data:", err)
    }
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

  // 2. fetch 함수 추가
  const fetchCurrentSession = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/current`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setCurrentSession(parseSession(data))
      } else {
        setCurrentSession(null) // 404 처리 시에도 null
      }
    } catch (err) {
      setCurrentSession(null)
      console.error("Error fetching current session:", err)
    }
  }

  // 1. 일간 세션 데이터
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

  // 2. 주간 세션 데이터
  const fetchWeeklySessionData = async () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
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
        // 날짜별 그룹핑
        const groupedSessions: { [key: string]: PomodoroSession[] } = {}
        parsedSessions.forEach((session: PomodoroSession) => {
          const localSessionDate = convertUtcToLocalDate(session.created_at, timeZone)
          if (!groupedSessions[localSessionDate]) {
            groupedSessions[localSessionDate] = []
          }
          groupedSessions[localSessionDate].push(session)
        })
        setWeeklySessionData(groupedSessions)
        setSessions(parsedSessions)
      }
    } catch (err) {
      console.error("Error fetching weekly session data:", err)
    }
  }

  // 3. 월간 세션 데이터
  const fetchMonthlySessionData = async () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
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
        // 날짜별 집계
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
        setMonthlySessionData(groupedData)
        setSessions(parsedSessions)
      }
    } catch (err) {
      console.error("Error fetching monthly session data:", err)
    }
  }

  function parseMemo(memo: any): Memo {
    return {
      ...memo,
      created_at: new Date(memo.created_at?.endsWith?.("Z") ? memo.created_at : memo.created_at + "Z"),
      updated_at: new Date(memo.updated_at?.endsWith?.("Z") ? memo.updated_at : memo.updated_at + "Z"),
    }
  }

  const fetchDailyData = async () => {
    const dateStr = formatLocalDate(currentDate)

    try {
      // Fetch daily memos using /memo/list endpoint
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`

      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setMemos((data || []).map(parseMemo))
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

        const parsedMemos = (memos || []).map(parseMemo)
        // Group memos by date using local timezone
        const groupedMemos: { [key: string]: Memo[] } = {}
        parsedMemos.forEach((memo: Memo) => {
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

        const parsedMemos = (memos || []).map(parseMemo)
        // Group memos by date and count using local timezone
        const groupedData: { [key: string]: { memo_count: number; has_summary: boolean } } = {}
        parsedMemos.forEach((memo: Memo) => {
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

    const formData = new FormData()
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

    const newSession: PomodoroSession = {
      id: "", // Will be set by backend
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
      // Start or Resume
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
      // Pause
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
      // delete session
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

    // Clear the reflection input
    setSessionReflections((prev) => {
      const newReflections = { ...prev }
      delete newReflections[sessionId]
      return newReflections
    })
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
      })
    } else if (viewMode === "weekly") {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const startDate = startOfWeek.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const endDate = endOfWeek.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      return `${startDate} - ${endDate}`
    } else if (viewMode === "monthly") {
      return currentDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
      })
    }

    return ""
  }

  const filteredMemos = useMemo(() => {
    let filtered = memos

    if (categoryFilter) {
      filtered = filtered.filter((memo) => memo.category === categoryFilter)
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter((memo) => memo.content.toLowerCase().includes(lowerCaseQuery))
    }

    return filtered
  }, [memos, categoryFilter, searchQuery])

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header
        className={`sticky top-0 z-40 w-full backdrop-blur-sm bg-zinc-900/80 border-b border-zinc-800 transition-all duration-200 ${
          isScrolled ? "h-16" : "h-20"
        }`}
      >
        <div className="container max-w-5xl mx-auto flex items-center justify-between h-full px-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-semibold">Memo App</h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={goToToday}>
              {formatDateHeader()}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigateDate("next")}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowUserMenu(!showUserMenu)}>
              <User className="w-5 h-5" />
            </Button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-zinc-800 ring-1 ring-zinc-700 focus:outline-none z-50">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white"
                    role="menuitem"
                  >
                    설정
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white"
                    role="menuitem"
                  >
                    계정
                  </a>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white"
                    role="menuitem"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto p-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-start gap-4 mb-6">
            <Button
              variant={appMode === "memo" ? "default" : "outline"}
              onClick={() => setAppMode("memo")}
              className="rounded-full"
            >
              메모
            </Button>
            <Button
              variant={appMode === "session" ? "default" : "outline"}
              onClick={() => setAppMode("session")}
              className="rounded-full"
            >
              세션
            </Button>
            <Button
              variant={viewMode === "daily" ? "default" : "outline"}
              onClick={() => setViewMode("daily")}
              className="rounded-full"
            >
              일간
            </Button>
            <Button
              variant={viewMode === "weekly" ? "default" : "outline"}
              onClick={() => setViewMode("weekly")}
              className="rounded-full"
            >
              주간
            </Button>
            <Button
              variant={viewMode === "monthly" ? "default" : "outline"}
              onClick={() => setViewMode("monthly")}
              className="rounded-full"
            >
              월간
            </Button>
          </div>

          {/* Memo Mode */}
          {appMode === "memo" && (
            <>
              {/* Search and Category Filter */}
              <div className="flex items-center justify-between mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="메모 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <Search className="absolute top-1/2 right-3 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                </div>

                <div className="relative ml-4">
                  <Button variant="outline" onClick={() => setShowCategorySelector(!showCategorySelector)}>
                    {categoryFilter ? categories[categoryFilter]?.name : "카테고리 선택"}
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                  {showCategorySelector && (
                    <div className="absolute top-12 right-0 w-48 rounded-md shadow-lg bg-zinc-800 ring-1 ring-zinc-700 focus:outline-none z-50">
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button
                          onClick={() => {
                            setCategoryFilter(null)
                            setShowCategorySelector(false)
                          }}
                          className="block px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white w-full text-left"
                          role="menuitem"
                        >
                          전체
                        </button>
                        {Object.entries(categories).map(([key, category]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setCategoryFilter(key)
                              setShowCategorySelector(false)
                            }}
                            className="block px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white w-full text-left"
                            role="menuitem"
                          >
                            {category.icon} {category.name}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setShowNewCategoryInput(true)
                            setShowCategorySelector(false)
                          }}
                          className="block px-4 py-2 text-sm text-white hover:bg-zinc-700 hover:text-white w-full text-left"
                          role="menuitem"
                        >
                          + 새 카테고리 추가
                        </button>
                        {showNewCategoryInput && (
                          <div className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="카테고리 이름"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="w-full px-3 py-2 rounded-md bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <div className="flex justify-end mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowNewCategoryInput(false)
                                  setNewCategoryName("")
                                  setShowCategorySelector(true)
                                }}
                              >
                                취소
                              </Button>
                              <Button size="sm" onClick={() => createNewCategory(newCategoryName)}>
                                저장
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Summary */}
              {viewMode === "daily" && dailySummary && (
                <div className="mb-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <h2 className="text-lg font-semibold mb-3">오늘의 요약</h2>
                  <MarkdownRenderer content={dailySummary.ai_comment} />
                  {dailySummary.category_summaries.map((summary) => (
                    <div key={summary.category} className="mb-4">
                      <h3 className="text-md font-semibold mb-2">
                        {categories[summary.category]?.name || summary.category}
                      </h3>
                      <MarkdownRenderer content={summary.summary} isCompact />
                    </div>
                  ))}
                </div>
              )}

              {/* Memo List */}
              {viewMode === "daily" && filteredMemos.length === 0 && (
                <div className="text-center text-zinc-500">메모가 없습니다.</div>
              )}
              {viewMode === "daily" &&
                filteredMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-700/20 transition-colors"
                    onClick={() => {
                      setSelectedMemo(memo)
                      setEditText(memo.content)
                      setEditTags(memo.tags)
                      setEditAttachments({
                        existing: memo.attachments,
                        newImages: [],
                        newAudios: [],
                      })
                      setEditSelectedCategory(memo.category || null)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {memo.category && categories[memo.category] && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: categories[memo.category].bgColor }}
                          >
                            {categories[memo.category].icon}
                          </div>
                        )}
                        <h3 className="text-md font-semibold">{memo.content.split("\n")[0]}</h3>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {memo.created_at.toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {memo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {memo.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-400 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {/* Weekly View */}
              {viewMode === "weekly" &&
                Object.entries(weeklyData).map(([date, memos]) => (
                  <div key={date} className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">{date}</h2>
                    {memos.map((memo) => (
                      <div
                        key={memo.id}
                        className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-700/20 transition-colors"
                        onClick={() => {
                          setSelectedMemo(memo)
                          setEditText(memo.content)
                          setEditTags(memo.tags)
                          setEditAttachments({
                            existing: memo.attachments,
                            newImages: [],
                            newAudios: [],
                          })
                          setEditSelectedCategory(memo.category || null)
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {memo.category && categories[memo.category] && (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: categories[memo.category].bgColor }}
                              >
                                {categories[memo.category].icon}
                              </div>
                            )}
                            <h3 className="text-md font-semibold">{memo.content.split("\n")[0]}</h3>
                          </div>
                          <span className="text-sm text-zinc-500">
                            {memo.created_at.toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {memo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {memo.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-400 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

              {/* Monthly View */}
              {viewMode === "monthly" && (
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({
                    length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
                  }).map((_, i) => {
                    const day = i + 1
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    const dateStr = formatLocalDate(date)
                    const data = monthlyData[dateStr]

                    return (
                      <div
                        key={dateStr}
                        className="p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700/20 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedDate(dateStr)
                          setCurrentDate(date)
                          setViewMode("daily")
                        }}
                      >
                        <div className="text-sm font-medium mb-1">{day}</div>
                        {data && (
                          <>
                            <div className="text-xs text-zinc-400">{data.memo_count} Memos</div>
                            {data.has_summary && <div className="text-xs text-purple-400">Summary</div>}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Session Mode */}
          {appMode === "session" && (
            <>
              {/* Session Timer */}
              <div className="mb-8">
                <CircularTimer
                  duration={currentSession?.duration || 25}
                  timeLeft={timeLeft}
                  isRunning={isRunning}
                  isBreak={currentPhase === "break"}
                  onToggle={toggleTimer}
                  onReset={resetTimer}
                  onCancel={cancelCurrentTask}
                  sessionTitle={currentSession?.subject}
                  sessionGoal={currentSession?.goal}
                  sessionTags={currentSession?.tags}
                  sessionStartTime={currentSession?.started_at}
                  onStartSession={startSession}
                  onDurationChange={updateSessionDuration}
                  currentSession={currentSession}
                />
              </div>

              {/* Session List */}
              {viewMode === "daily" && sessions.length === 0 && (
                <div className="text-center text-zinc-500">세션이 없습니다.</div>
              )}
              {viewMode === "daily" &&
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
                ))}

              {/* Weekly Session View */}
              {viewMode === "weekly" &&
                Object.entries(weeklySessionData).map(([date, sessions]) => (
                  <div key={date} className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">{date}</h2>
                    {sessions.map((session) => (
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
                    ))}
                  </div>
                ))}

              {/* Monthly Session View */}
              {viewMode === "monthly" && (
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({
                    length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
                  }).map((_, i) => {
                    const day = i + 1
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    const dateStr = formatLocalDate(date)
                    const data = monthlySessionData[dateStr]

                    return (
                      <div
                        key={dateStr}
                        className="p-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700/20 transition-colors cursor-pointer"
                        onClick={() => {
                          setCurrentDate(date)
                          setViewMode("daily")
                        }}
                      >
                        <div className="text-sm font-medium mb-1">{day}</div>
                        {data && (
                          <>
                            <div className="text-xs text-zinc-400">{data.session_count} Sessions</div>
                            <div className="text-xs text-purple-400">{data.total_focus_time}분</div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer - Input Area */}
      {appMode === "memo" && (
        <footer className="sticky bottom-0 z-40 w-full bg-zinc-900/80 border-t border-zinc-800">
          <div className="container max-w-5xl mx-auto p-4">
            {showInput ? (
              <div className="flex flex-col gap-3">
                <textarea
                  placeholder="메모를 입력하세요..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none transition-colors"
                />

                {/* Tags Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="태그 추가..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <Button onClick={addTag}>추가</Button>
                </div>

                {/* Display Tags */}
                <div className="flex flex-wrap gap-2">
                  {inputTags.map((tag, index) => (
                    <div
                      key={index}
                      className="px-3 py-1 rounded-full bg-zinc-700 text-zinc-400 font-medium flex items-center gap-1"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(index)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Attachments Preview */}
                <div className="flex items-center gap-4">
                  {inputAttachments.images.map((image, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(image) || "/placeholder.svg"}
                        alt={`Attachment ${index}`}
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeInputImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {inputAttachments.audios.map((audio, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-400" />
                      <audio src={URL.createObjectURL(audio)} controls />
                      <button
                        type="button"
                        onClick={() => removeInputAudio(index)}
                        className="w-6 h-6 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Attachment Options */}
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setShowImageOptions(!showImageOptions)}>
                    <Camera className="w-4 h-4 mr-2" />
                    사진
                  </Button>
                  <Button variant="secondary" onClick={isRecording ? stopRecording : startRecording}>
                    {isRecording ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        녹음 중지
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        녹음 시작
                      </>
                    )}
                  </Button>
                </div>

                {/* Image Options */}
                {showImageOptions && (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => addImages(e.target.files)}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                      앨범에서 선택
                    </Button>

                    <input
                      type="file"
                      accept="image/*"
                      capture="camera"
                      onChange={(e) => addImages(e.target.files)}
                      className="hidden"
                      ref={cameraInputRef}
                    />
                    <Button variant="ghost" onClick={() => cameraInputRef.current?.click()}>
                      카메라 촬영
                    </Button>
                  </div>
                )}

                {/* Submit and Cancel Buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={resetInputState}>
                    취소
                  </Button>
                  <Button onClick={handleSubmit}>저장</Button>
                </div>
              </div>
            ) : (
              <Button className="w-full rounded-full" onClick={() => setShowInput(true)}>
                <Plus className="w-4 h-4 mr-2" />새 메모 추가
              </Button>
            )}
          </div>
        </footer>
      )}

      {/* Detail Modal */}
      {selectedMemo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-zinc-800/80 border border-zinc-700 rounded-3xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">메모 상세</h2>
                <button onClick={resetDetailState} className="p-2 hover:bg-zinc-700 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Edit Mode */}
              {isEditing ? (
                <div className="flex flex-col gap-4">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none transition-colors"
                  />

                  {/* Edit Tags Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="태그 추가..."
                      value={editCurrentTag}
                      onChange={(e) => setEditCurrentTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addEditTag()
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <Button onClick={addEditTag}>추가</Button>
                  </div>

                  {/* Display Edit Tags */}
                  <div className="flex flex-wrap gap-2">
                    {editTags.map((tag, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 rounded-full bg-zinc-600 text-zinc-400 font-medium flex items-center gap-1"
                      >
                        {tag}
                        <button type="button" onClick={() => removeEditTag(index)}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Edit Category Selector */}
                  <div className="relative">
                    <Button variant="outline" onClick={() => setShowEditCategorySelector(!showEditCategorySelector)}>
                      {editSelectedCategory ? categories[editSelectedCategory]?.name : "카테고리 선택"}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                    {showEditCategorySelector && (
                      <div className="absolute top-12 right-0 w-48 rounded-md shadow-lg bg-zinc-700 ring-1 ring-zinc-600 focus:outline-none z-50">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <button
                            onClick={() => {
                              setEditSelectedCategory(null)
                              setShowEditCategorySelector(false)
                            }}
                            className="block px-4 py-2 text-sm text-white hover:bg-zinc-600 hover:text-white w-full text-left"
                            role="menuitem"
                          >
                            전체
                          </button>
                          {Object.entries(categories).map(([key, category]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setEditSelectedCategory(key)
                                setShowEditCategorySelector(false)
                              }}
                              className="block px-4 py-2 text-sm text-white hover:bg-zinc-600 hover:text-white w-full text-left"
                              role="menuitem"
                            >
                              {category.icon} {category.name}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setShowEditNewCategoryInput(true)
                              setShowEditCategorySelector(false)
                            }}
                            className="block px-4 py-2 text-sm text-white hover:bg-zinc-600 hover:text-white w-full text-left"
                            role="menuitem"
                          >
                            + 새 카테고리 추가
                          </button>
                          {showEditNewCategoryInput && (
                            <div className="px-4 py-2">
                              <input
                                type="text"
                                placeholder="카테고리 이름"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full px-3 py-2 rounded-md bg-zinc-600 border border-zinc-500 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                              />
                              <div className="flex justify-end mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowEditNewCategoryInput(false)
                                    setNewCategoryName("")
                                    setShowEditCategorySelector(true)
                                  }}
                                >
                                  취소
                                </Button>
                                <Button size="sm" onClick={() => createNewCategory(newCategoryName, true)}>
                                  저장
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Attachments Preview */}
                  <div className="flex items-start gap-4">
                    {editAttachments.existing.map((attachment) => (
                      <div key={attachment.id} className="relative w-24 h-24 rounded-lg overflow-hidden">
                        {attachment.type === "image" ? (
                          <img
                            src={attachment.url || "/placeholder.svg"}
                            alt={attachment.filename}
                            className="object-cover w-full h-full"
                            onClick={() =>
                              setImageModal({
                                isOpen: true,
                                imageUrl: attachment.url,
                              })
                            }
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-zinc-700">
                            <Mic className="w-8 h-8 text-purple-400" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(attachment.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-600 text-white flex items-center justify-center hover:bg-zinc-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {editAttachments.newImages.map((image, index) => (
                      <div key={`new-image-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(image) || "/placeholder.svg"}
                          alt={`New Attachment ${index}`}
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditAttachments((prev) => ({
                              ...prev,
                              newImages: prev.newImages.filter((_, i) => i !== index),
                            }))
                          }
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-600 text-white flex items-center justify-center hover:bg-zinc-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {editAttachments.newAudios.map((audio, index) => (
                      <div key={`new-audio-${index}`} className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-purple-400" />
                        <audio src={URL.createObjectURL(audio)} controls />
                        <button
                          type="button"
                          onClick={() =>
                            setEditAttachments((prev) => ({
                              ...prev,
                              newAudios: prev.newAudios.filter((_, i) => i !== index),
                            }))
                          }
                          className="w-6 h-6 rounded-full bg-zinc-600 text-white flex items-center justify-center hover:bg-zinc-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Edit Attachment Options */}
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setShowImageOptions(!showImageOptions)}>
                      <Camera className="w-4 h-4 mr-2" />
                      사진
                    </Button>
                    <Button variant="secondary" onClick={isRecording ? stopRecording : startRecording}>
                      {isRecording ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          녹음 중지
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          녹음 시작
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Edit Image Options */}
                  {showImageOptions && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => addEditImages(e.target.files)}
                        className="hidden"
                        ref={editFileInputRef}
                      />
                      <Button variant="ghost" onClick={() => editFileInputRef.current?.click()}>
                        앨범에서 선택
                      </Button>

                      <input
                        type="file"
                        accept="image/*"
                        capture="camera"
                        onChange={(e) => addEditImages(e.target.files)}
                        className="hidden"
                        ref={cameraInputRef}
                      />
                      <Button variant="ghost" onClick={() => cameraInputRef.current?.click()}>
                        카메라 촬영
                      </Button>
                    </div>
                  )}

                  {/* Edit Submit and Cancel Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={resetDetailState}>
                      취소
                    </Button>
                    <Button onClick={handleEdit}>저장</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Display Memo Content */}
                  <MarkdownRenderer content={selectedMemo.content} />

                  {/* Display Tags */}
                  {selectedMemo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedMemo.tags.map((tag, index) => (
                        <div key={index} className="px-3 py-1 rounded-full bg-zinc-700 text-zinc-400 font-medium">
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Display Category */}
                  {selectedMemo.category && categories[selectedMemo.category] && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: categories[selectedMemo.category].bgColor }}
                      >
                        {categories[selectedMemo.category].icon}
                      </div>
                      <span className="text-zinc-400">{categories[selectedMemo.category].name}</span>
                    </div>
                  )}

                  {/* Display Attachments */}
                  <div className="flex items-start gap-4">
                    {selectedMemo.attachments.map((attachment) => (
                      <div key={attachment.id} className="relative w-24 h-24 rounded-lg overflow-hidden">
                        {attachment.type === "image" ? (
                          <img
                            src={attachment.url || "/placeholder.svg"}
                            alt={attachment.filename}
                            className="object-cover w-full h-full"
                            onClick={() =>
                              setImageModal({
                                isOpen: true,
                                imageUrl: attachment.url,
                              })
                            }
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-zinc-700">
                            <Mic className="w-8 h-8 text-purple-400" />
                            <Button variant="ghost" onClick={() => playAudio(attachment.id, attachment.url)}>
                              {playingAudio === attachment.id ? "정지" : "재생"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Edit, Delete, and Close Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      수정
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(selectedMemo.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                    <Button onClick={resetDetailState}>닫기</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl}
        onClose={() => setImageModal({ isOpen: false, imageUrl: "" })}
      />
    </div>
  )
}

export default MemoSessionApp
