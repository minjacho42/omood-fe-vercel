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
  Edit,
  Play,
  Pause,
  Square,
  BookOpen,
} from "lucide-react"
import { SessionProgressCircle } from "@/components/session-progress-circle"
import { Button } from "@/components/ui/button"

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
import { DraggableTimer } from "@/components/draggable-timer"

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
    const [showDetail, setShowDetail] = useState(false)

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

    if (showDetail) {
      return (
        <SessionDetailView
          session={session}
          onClose={() => setShowDetail(false)}
          onDelete={deleteSessionFromBackend}
          onUpdate={sessionHook.updateSession}
          sessionReflections={sessionReflections}
          setSessionReflections={setSessionReflections}
          handleReflectionSubmit={handleReflectionSubmit}
          locale={locale}
          timeZone={timeZone}
        />
      )
    }

    return (
      <div
        key={session.id}
        className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer"
        onClick={() => setShowDetail(true)}
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
                onClick={(e) => {
                  e.stopPropagation()
                  handleReflectionSubmit(session.id)
                }}
                disabled={!sessionReflections[session.id]?.trim()}
                className="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-all"
              >
                회고 저장
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const SessionDetailView: React.FC<{
    session: PomodoroSession
    onClose: () => void
    onDelete: (id: string) => void
    onUpdate: (id: string, updates: Partial<PomodoroSession>) => void
    sessionReflections: Record<string, string>
    setSessionReflections: React.Dispatch<React.SetStateAction<Record<string, string>>>
    handleReflectionSubmit: (id: string) => void
    locale: string
    timeZone: string
  }> = ({
    session,
    onClose,
    onDelete,
    onUpdate,
    sessionReflections,
    setSessionReflections,
    handleReflectionSubmit,
    locale,
    timeZone,
  }) => {
    const [editMode, setEditMode] = useState(false)
    const [editData, setEditData] = useState({
      subject: session.subject || "",
      goal: session.goal || "",
      tags: session.tags || "",
      duration: session.duration || 25,
    })

    const canEdit = session.status === "pending" || session.status === "reviewed" || session.status === "completed"
    const canEditDuration = session.status === "pending"

    const handleSave = async () => {
      await onUpdate(session.id, editData)
      setEditMode(false)
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

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">세션 상세</h2>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  onClick={() => setEditMode(!editMode)}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/30"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={() => onDelete(session.id)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={onClose}
                className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-400/30"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-white/60">{time}</div>

            {editMode ? (
              <>
                <div>
                  <label className="block text-white/80 text-sm mb-2">주제</label>
                  <input
                    type="text"
                    value={editData.subject}
                    onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                    placeholder="세션 주제를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">목표</label>
                  <textarea
                    value={editData.goal}
                    onChange={(e) => setEditData({ ...editData, goal: e.target.value })}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none"
                    rows={3}
                    placeholder="이 세션에서 달성하고 싶은 목표를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">태그</label>
                  <input
                    type="text"
                    value={editData.tags}
                    onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                    placeholder="태그를 입력하세요 (쉼표로 구분)"
                  />
                </div>

                {canEditDuration && (
                  <div>
                    <label className="block text-white/80 text-sm mb-2">시간 (분)</label>
                    <input
                      type="number"
                      value={editData.duration}
                      onChange={(e) => setEditData({ ...editData, duration: Number.parseInt(e.target.value) || 25 })}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                      min="1"
                      max="120"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                    저장
                  </Button>
                  <Button
                    onClick={() => setEditMode(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    취소
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">{session.subject}</h3>
                  {session.goal && <p className="text-white/80 mb-4">{session.goal}</p>}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SessionProgressCircle duration={session.duration} size={40} />
                    <span className="text-white/70">{session.duration}분</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full bg-${session.status === "completed" ? "green" : session.status === "started" ? "blue" : "gray"}-400`}
                    />
                    <span className="text-white/70">{session.status}</span>
                  </div>
                </div>

                {session.tags && (
                  <div className="flex flex-wrap gap-2">
                    {session.tags.split(",").map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {session.reflection && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">회고</h4>
                    <p className="text-white/80">{session.reflection}</p>
                  </div>
                )}

                {session.status === "completed" && !session.reflection && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium">회고 작성</span>
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
                      rows={4}
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none mb-3"
                    />
                    <Button
                      onClick={() => handleReflectionSubmit(session.id)}
                      disabled={!sessionReflections[session.id]?.trim()}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white"
                    >
                      회고 저장
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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

  // Session setup states
  const [showSessionSetup, setShowSessionSetup] = useState(false)
  const [sessionSetup, setSessionSetup] = useState({
    subject: "",
    goal: "",
    tags: "",
    duration: 25,
  })

  const handleCreateSession = async () => {
    await sessionHook.createSession(sessionSetup)
    setShowSessionSetup(false)
    setSessionSetup({ subject: "", goal: "", tags: "", duration: 25 })
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

              {/* Replace timer setup with subject setup button and modify session creation flow */}
              {appMode === "session" && (
                <div className="relative">
                  {sessionHook.currentSession ? (
                    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md border border-white/20 rounded-3xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                            <Timer className="w-5 h-5 text-purple-300" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{sessionHook.currentSession.subject}</h3>
                            <p className="text-white/70 text-sm">{sessionHook.currentSession.goal}</p>
                          </div>
                        </div>
                        {sessionHook.currentSession.status === "pending" && (
                          <Button
                            onClick={() => setShowSessionSetup(true)}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/30"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-center mb-6">
                        <DraggableTimer
                          ref={timerRef}
                          duration={sessionHook.currentSession.duration}
                          onDurationChange={(newDuration) => {
                            if (sessionHook.currentSession?.status === "pending") {
                              sessionHook.updateSession(sessionHook.currentSession.id, { duration: newDuration })
                            }
                          }}
                          isRunning={sessionHook.currentSession.status === "started"}
                          isPaused={sessionHook.currentSession.status === "paused"}
                          onComplete={() => sessionHook.completeSession(sessionHook.currentSession!.id)}
                          disabled={sessionHook.currentSession.status !== "pending"}
                        />
                      </div>

                      <div className="flex gap-3">
                        {sessionHook.currentSession.status === "pending" && (
                          <Button
                            onClick={() => sessionHook.startSession(sessionHook.currentSession!.id)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 rounded-2xl"
                          >
                            <Play className="w-5 h-5 mr-2" />
                            시작
                          </Button>
                        )}

                        {sessionHook.currentSession.status === "started" && (
                          <>
                            <Button
                              onClick={() => sessionHook.pauseSession(sessionHook.currentSession!.id)}
                              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 rounded-2xl"
                            >
                              <Pause className="w-5 h-5 mr-2" />
                              일시정지
                            </Button>
                            <Button
                              onClick={() => sessionHook.cancelSession(sessionHook.currentSession!.id)}
                              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-3 rounded-2xl"
                            >
                              <Square className="w-5 h-5 mr-2" />
                              취소
                            </Button>
                          </>
                        )}

                        {sessionHook.currentSession.status === "paused" && (
                          <>
                            <Button
                              onClick={() => sessionHook.resumeSession(sessionHook.currentSession!.id)}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 rounded-2xl"
                            >
                              <Play className="w-5 h-5 mr-2" />
                              재개
                            </Button>
                            <Button
                              onClick={() => sessionHook.cancelSession(sessionHook.currentSession!.id)}
                              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-3 rounded-2xl"
                            >
                              <Square className="w-5 h-5 mr-2" />
                              취소
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mb-6">
                      <Button
                        onClick={() => setShowSessionSetup(true)}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-4 px-8 rounded-2xl"
                      >
                        <BookOpen className="w-5 h-5 mr-2" />새 세션 만들기
                      </Button>
                    </div>
                  )}

                  {/* Session Setup Modal */}
                  {showSessionSetup && (
                    <div
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                      onClick={() => setShowSessionSetup(false)}
                    >
                      <div
                        className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-md w-full relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-bold text-white">새 세션 설정</h2>
                          <Button
                            onClick={() => setShowSessionSetup(false)}
                            className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-400/30"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-white/80 text-sm mb-2">주제 *</label>
                            <input
                              type="text"
                              value={sessionSetup.subject}
                              onChange={(e) => setSessionSetup({ ...sessionSetup, subject: e.target.value })}
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                              placeholder="무엇에 집중하시겠습니까?"
                            />
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm mb-2">목표</label>
                            <textarea
                              value={sessionSetup.goal}
                              onChange={(e) => setSessionSetup({ ...sessionSetup, goal: e.target.value })}
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none"
                              rows={3}
                              placeholder="이 세션에서 달성하고 싶은 목표를 입력하세요"
                            />
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm mb-2">태그</label>
                            <input
                              type="text"
                              value={sessionSetup.tags}
                              onChange={(e) => setSessionSetup({ ...sessionSetup, tags: e.target.value })}
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                              placeholder="태그를 입력하세요 (쉼표로 구분)"
                            />
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm mb-2">시간 (분)</label>
                            <input
                              type="number"
                              value={sessionSetup.duration}
                              onChange={(e) =>
                                setSessionSetup({ ...sessionSetup, duration: Number.parseInt(e.target.value) || 25 })
                              }
                              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
                              min="1"
                              max="120"
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <Button
                              onClick={handleCreateSession}
                              disabled={!sessionSetup.subject.trim()}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl"
                            >
                              세션 생성
                            </Button>
                            <Button
                              onClick={() => setShowSessionSetup(false)}
                              className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-400/30 font-medium py-3 rounded-xl"
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <div className="space-y-4">
                    {memoHook.filteredMemos.length > 0 ? (
                      memoHook.filteredMemos.map((memo) => (
                        <div key={memo.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                              <span className="text-white/80 text-sm">
                                {new Date(memo.created_at).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <p className="text-white text-base leading-relaxed mb-3">{memo.content}</p>
                          {memo.tags && memo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {memo.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-white/20 text-white/80 text-xs rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white/70 text-lg mb-2">메모가 없습니다</p>
                        <p className="text-white/50 text-sm">새로운 메모를 작성해서 하루를 기록해보세요</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    {sessionHook.sessions.length > 0 ? (
                      sessionHook.sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          locale={locale}
                          timeZone={timeZone}
                          sessionReflections={sessionReflections}
                          setSessionReflections={setSessionReflections}
                          handleReflectionSubmit={sessionHook.submitReflection}
                          deleteSessionFromBackend={sessionHook.deleteSession}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white/70 text-lg mb-2">세션이 없습니다</p>
                        <p className="text-white/50 text-sm">새로운 포모도로 세션을 시작해보세요</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Weekly View */}
          {viewMode === "weekly" && (
            <div className="space-y-4">
              {appMode === "memo" ? (
                <div className="grid gap-4">
                  {Object.entries(memoHook.weeklyData).map(([date, dayMemos]) => (
                    <div key={date} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <h3 className="text-white font-medium mb-3">
                        {new Date(date).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}
                      </h3>
                      <div className="space-y-2">
                        {dayMemos.map((memo) => (
                          <div key={memo.id} className="bg-white/5 rounded-lg p-3">
                            <p className="text-white/90 text-sm">{memo.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(sessionHook.weeklySessionData).map(([date, daySessions]) => (
                    <div key={date} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <h3 className="text-white font-medium mb-3">
                        {new Date(date).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}
                      </h3>
                      <div className="space-y-2">
                        {daySessions.map((session) => (
                          <div key={session.id} className="bg-white/5 rounded-lg p-3">
                            <p className="text-white/90 text-sm">{session.task_description}</p>
                            <span className="text-white/60 text-xs">{session.focus_duration}분</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly View */}
          {viewMode === "monthly" && (
            <div className="grid grid-cols-7 gap-2">
              {appMode === "memo" ? (
                <>
                  {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - 6)
                    const dateStr = date.toISOString().split("T")[0]
                    const dayData = memoHook.monthlyData[dateStr]

                    return (
                      <div
                        key={i}
                        className={`aspect-square p-2 rounded-lg text-center ${
                          date.getMonth() === currentDate.getMonth()
                            ? "bg-white/10 text-white"
                            : "bg-white/5 text-white/50"
                        }`}
                      >
                        <div className="text-xs mb-1">{date.getDate()}</div>
                        {dayData && <div className="w-2 h-2 bg-blue-400 rounded-full mx-auto"></div>}
                      </div>
                    )
                  })}
                </>
              ) : (
                <>
                  {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - 6)
                    const dateStr = date.toISOString().split("T")[0]
                    const dayData = sessionHook.monthlySessionData[dateStr]

                    return (
                      <div
                        key={i}
                        className={`aspect-square p-2 rounded-lg text-center ${
                          date.getMonth() === currentDate.getMonth()
                            ? "bg-white/10 text-white"
                            : "bg-white/5 text-white/50"
                        }`}
                      >
                        <div className="text-xs mb-1">{date.getDate()}</div>
                        {dayData && <div className="w-2 h-2 bg-green-400 rounded-full mx-auto"></div>}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
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
