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
import { motion, useAnimation } from "framer-motion"
import { useDrag } from "@use-gesture/react"

// UUID 생성 함수
// const generateUUID = (): string => {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//     const r = Math.random() * 16 | 0
//     const v = c == 'x' ? r : (r & 0x3 | 0x8)
//     return v.toString(16)
//   })
// }

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
  status: 'pending' | 'started' | 'paused' | 'completed' | 'cancelled'
  completed: boolean
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
  session: PomodoroSession;
  locale: string;
  timeZone: string;
  sessionReflections: { [sessionId: string]: string };
  setSessionReflections: React.Dispatch<React.SetStateAction<{ [sessionId: string]: string }>>;
  handleReflectionSubmit: (sessionId: string) => Promise<void>;
  deleteSessionFromBackend: (sessionId: string) => Promise<void>;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  locale,
  timeZone,
  sessionReflections,
  setSessionReflections,
  handleReflectionSubmit,
  deleteSessionFromBackend
}) => {
    const controls = useAnimation();
    const bgControls = useAnimation();

    const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      const trigger = vx > 0.2; // If velocity is high, trigger action
      const isSwipingLeft = xDir < 0;

      if (!down && trigger && isSwipingLeft) {
        controls.start({ x: -80 });
        bgControls.start({ opacity: 1 });
      } else if (!down) {
        controls.start({ x: 0 });
        bgControls.start({ opacity: 0 });
      }
    });

    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteSessionFromBackend(session.id);
    };

    const utcCreated = typeof session.created_at === "string" ? new Date(session.created_at.endsWith("Z") ? session.created_at : session.created_at + "Z") : session.created_at
    const time = utcCreated.toLocaleString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-400'
        case 'started': return 'bg-blue-400'
        case 'paused': return 'bg-yellow-400'
        case 'cancelled': return 'bg-red-400'
        default: return 'bg-gray-400'
      }
    }

    const getStatusText = (status: string) => {
      switch (status) {
        case 'completed': return '완료'
        case 'started': return '진행중'
        case 'paused': return '일시정지'
        case 'cancelled': return '취소됨'
        case 'pending': return '대기중'
        default: return status
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
                    <SessionProgressCircle duration={session.duration} size={32}/>
                    <span className="text-white/70 text-sm">{session.duration}분</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                    <span className="text-white/70 text-sm">{getStatusText(session.status)}</span>
                  </div>
                </div>

                {session.reflection && (
                  <div className="text-sm text-white/70 bg-white/5 rounded-lg p-3 mb-3">
                    <p><strong>회고:</strong> {session.reflection}</p>
                  </div>
                )}

                {/* Reflection input for completed sessions without reflection */}
                {session.completed && !session.reflection && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">회고 작성</span>
                    </div>
                    <textarea
                      placeholder="이 세션에서 무엇을 완료했나요? 어떤 점이 좋았고 개선할 점은 무엇인가요?"
                      value={sessionReflections[session.id] || ''}
                      onChange={(e) => setSessionReflections(prev => ({
                        ...prev,
                        [session.id]: e.target.value
                      }))}
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

function MemoSessionApp() {

  // App mode state
  const [appMode, setAppMode] = useState<AppMode>("session")

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
  const [currentPhase, setCurrentPhase] = useState<"setup" | "focus" | "break">("setup")
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])

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
        completed: session.completed,
        created_at: session.created_at,
        // user_id is handled by the backend based on the session/cookie
      };

      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      })

      if (res && res.ok) {
        const newSessionData = await res.json();
        console.log("Session created in backend");
        await fetchSessionData();
        return newSessionData; // Return the created session data
      } else {
        console.error("Failed to create session in backend");
        return null;
      }
    } catch (err) {
      console.error("Error creating session in backend:", err);
      return null;
    }
  }

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      // If marking as completed, also set completed flag
      if (status === 'completed') {
        updateData.completed = true
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

    if (isRunning && timeLeft > 0 && currentSession) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning && currentSession) {
      setIsRunning(false)
      if (currentPhase === "focus") {
        // Focus time completed, mark session as completed and start break
        const completedSession = {
          ...currentSession,
          status: 'completed' as const,
          completed: true,
          updated_at: new Date()
        }
        setCurrentSession(completedSession)

        // Update session status in backend
        updateSessionStatus(currentSession.id, 'completed')

        // Refresh sessions to get updated data
        fetchSessionData()

        setCurrentPhase("break")
        setTimeLeft(currentSession.break_duration * 60)
        setIsRunning(true)
      } else if (currentPhase === "break") {
        // Break completed, reset to setup
        setCurrentPhase("setup")
        setCurrentSession(null)
        setTimeLeft(0)
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

  useEffect(() => {
    if (appMode === "session" && viewMode === "daily") {
      fetchCurrentSession();
    }
  }, [appMode, viewMode, currentDate, timeZone]);

  useEffect(() => {
    if (appMode === "session" && viewMode === "daily") {
      if (currentSession) {
        // 타이머 초기화/세팅
        if (["started", "paused"].includes(currentSession.status) && currentSession.started_at) {
          const now = Date.now();
          const started = new Date(currentSession.started_at).getTime();
          const updated = new Date(currentSession.updated_at).getTime();
          let elapsed = 0;
          if (currentSession.status === "paused") {
            elapsed = Math.floor((updated - started) / 1000); // 초 단위
          } else if (currentSession.status === "started") {
            elapsed = Math.floor((now - started) / 1000); // 초 단위
          }
          const remaining = Math.max(0, currentSession.duration * 60 - elapsed);
          setTimeLeft(remaining);
          setIsRunning(currentSession.status === "started");
        } else {
          setTimeLeft(currentSession?.duration ? currentSession.duration * 60 : 0);
          setIsRunning(false);
        }
        setCurrentPhase("focus");
      } else {
        setTimeLeft(0);
        setIsRunning(false);
        setCurrentPhase("setup");
      }
    }
  }, [currentSession, viewMode, appMode]);

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
      started_at: session.started_at ? new Date(session.started_at?.endsWith?.("Z") ? session.started_at : session.started_at + "Z") : undefined,
      created_at: new Date(session.created_at?.endsWith?.("Z") ? session.created_at : session.created_at + "Z"),
      updated_at: session.updated_at ? new Date(session.updated_at?.endsWith?.("Z") ? session.updated_at : session.updated_at + "Z") : undefined,
    }
  }

  // 2. fetch 함수 추가
  const fetchCurrentSession = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/session/current`;
      const res = await apiCall(url);
      if (res && res.ok) {
        const data = await res.json();
        setCurrentSession(parseSession(data));
      } else {
        setCurrentSession(null); // 404 처리 시에도 null
      }
    } catch (err) {
      setCurrentSession(null);
      console.error("Error fetching current session:", err);
    }
  };

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
          if (session.completed) {
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
      id: '', // Will be set by backend
      user_id: user?.email || '',
      subject: sessionData.subject,
      goal: sessionData.goal,
      duration: sessionData.duration,
      break_duration: breakDuration,
      tags: sessionData.tags,
      created_at: new Date(),
      updated_at: new Date(),
      status: 'pending',
      completed: false
    }

    const createdSession = await createSessionInBackend(newSession);
    if (createdSession) {
        const convertedSession = {
            ...createdSession,
            started_at: createdSession.started_at ? new Date(createdSession.started_at) : undefined,
            created_at: new Date(createdSession.created_at),
            updated_at: createdSession.updated_at ? new Date(createdSession.updated_at) : new Date(),
        };
        setCurrentSession(convertedSession);
        setTimeLeft(convertedSession.duration * 60);
        setCurrentPhase("focus");
        setIsRunning(false);
    }
  }

  const toggleTimer = async () => {
    if (!currentSession) return

    const newRunningState = !isRunning
    setIsRunning(newRunningState)

    if (newRunningState) {
      // Starting timer
      const newStatus = currentSession.status === 'pending' ? 'started' : 'started'
      await updateSessionStatus(currentSession.id, newStatus)

      // Update started_at if this is the first start
      if (currentSession.status === 'pending') {
        setCurrentSession(prev => prev ? {
          ...prev,
          status: 'started',
          started_at: new Date(),
          updated_at: new Date()
        } : null)
      }
    } else {
      // Pausing timer
      await updateSessionStatus(currentSession.id, 'paused')
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'paused',
        updated_at: new Date()
      } : null)
    }
  }

  const resetTimer = async () => {
    if (currentSession) {
      await updateSessionStatus(currentSession.id, 'pending')
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'pending',
        updated_at: new Date()
      } : null)
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
      // Update session status to cancelled
      await updateSessionStatus(currentSession.id, 'cancelled')
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
    setSessionReflections(prev => {
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
      formatLocalDate(new Date(session.created_at)) === today
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
      const sessionDate = new Date(session.created_at)
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
      const sessionDate = new Date(session.created_at)
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
              const category = categories[catSummary.category] || CATEGORIES.uncategorized
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

  // Session daily summary with statistics
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
            <div className="text-2xl font-bold text-white mb-1">{todayStats.totalSessions - todayStats.sessionsCompleted}개</div>
            <div className="text-white/60 text-sm">진행중/중단</div>
          </div>
        </div>
      </div>
    )
  }

  // Session weekly summary with statistics
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

  // Session monthly summary with statistics
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

  const renderMemoCard = (memo: Memo) => {
    const category = memo.category ? categories[memo.category] || CATEGORIES.uncategorized : null
    const utcCreated = typeof memo.created_at === "string" ? new Date(memo.created_at.endsWith("Z") ? memo.created_at : memo.created_at + "Z") : memo.created_at
    const time = utcCreated.toLocaleString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const imageAttachments = memo.attachments.filter((att) => att.type === "image")
    const audioAttachments = memo.attachments.filter((att) => att.type === "audio")

    const { text: previewText, truncated } = truncateAtLineBreak(memo.content)
    const isExpanded = expandedPreviews.includes(memo.id)
    const preview = isExpanded || !truncated ? memo.content : previewText

    return (
      <div
        key={memo.id}
        className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-5 cursor-pointer hover:bg-white/15 transition-all duration-200"
        onClick={() => setSelectedMemo(memo)}
      >
        {/* Header with category and time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {category ? (
              <>
                <div
                  className={`w-8 h-8 rounded-full ${category.bgColor} flex items-center justify-center flex-shrink-0`}
                  style={{ color: category.color }}
                >
                  {category.icon}
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90">{category.name}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-white/60">카테고리 없음</span>
              </div>
            )}
          </div>
          <span className="text-xs text-white/60">{time}</span>
        </div>

        {/* Content */}
        <div className="mb-4">
          <MarkdownRenderer content={preview} isCompact />
          {truncated && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(memo.id)
              }}
              className="mt-1 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-300" />
              )}
            </button>
          )}
        </div>

        {/* Images - Horizontal scroll layout */}
        {imageAttachments.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {imageAttachments.slice(0, 4).map((attachment) => (
                <div key={attachment.id} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={attachment.url || "/placeholder.svg"}
                    alt={attachment.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {imageAttachments.length > 4 && (
                <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white/70 font-medium">+{imageAttachments.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio indicator - simplified without filename */}
        {audioAttachments.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <Mic className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/80">음성 메모 {audioAttachments.length}개</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {memo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {memo.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-white/15 text-white/80 font-medium">
                #{tag}
              </span>
            ))}
            {memo.tags.length > 3 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/60">
                +{memo.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }



  const renderWeeklyView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }

    return (
      <div className="space-y-4">
        {/* Weekly Summary */}
        {appMode === "session" && renderSessionWeeklySummary()}

        {weekDays.map((day, index) => {
          const dateStr = formatLocalDate(day)
          const dayName = day.toLocaleDateString(locale, { weekday: "short" })
          const dayNumber = day.getDate()
          const isToday = day.toDateString() === new Date().toDateString()

          if (appMode === "memo") {
            const dayMemos = weeklyData[dateStr] || []

            // Group memos by category for display
            const categoryGroups: { [key: string]: number } = {}
            dayMemos.forEach((memo) => {
              const category = memo.category || "uncategorized"
              categoryGroups[category] = (categoryGroups[category] || 0) + 1
            })

            // Find daily summary for this date
            let summaryForDay = null
            if (dailySummary && dailySummary.date === dateStr) {
              summaryForDay = dailySummary
            }

            return (
              <div
                key={index}
                className={`backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 cursor-pointer hover:bg-white/15 transition-all duration-200 ${
                  isToday ? "ring-2 ring-blue-400/50" : ""
                }`}
                onClick={() => {
                  setSelectedDate(dateStr)
                  setViewMode("daily")
                  setCurrentDate(day)
                }}
              >
                <div className="flex items-center justify-between my-2">
                  {/* Date block */}
                  <div className="flex flex-col justify-center items-center mr-6">
                    <div className="text-white/80 text-xs font-medium">{dayName}</div>
                    <div className="text-white text-lg font-bold">{dayNumber}</div>
                  </div>
                  {/* Summary and category counts */}
                  <div className="flex-1">
                    {dayMemos.length > 0 ? (
                      summaryForDay ? (
                        <p className="text-white/80 text-sm">{summaryForDay.ai_comment}</p>
                      ) : (
                        <p className="text-white/80 text-sm">요약 생성 중...</p>
                      )
                    ) : (
                      <div className="text-white/60 text-sm">메모가 없습니다</div>
                    )}
                    {Object.keys(categoryGroups).length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-4">
                        {Object.entries(categoryGroups).map(([categoryKey, count]) => {
                          const category = categories[categoryKey] || CATEGORIES.uncategorized
                          return (
                            <div key={categoryKey} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10">
                              <div
                                className="w-3 h-3 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: category.color }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                              </div>
                              <span className="text-xs text-white/70">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          } else {
            // Session mode
            const daySessions = weeklySessionData[dateStr] || []
            const completedSessions = daySessions.filter(s => s.completed)
            const totalFocusTime = completedSessions.reduce((acc, session) => acc + session.duration, 0)

            return (
              <div
                key={index}
                className={`backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 cursor-pointer hover:bg-white/15 transition-all duration-200 ${
                  isToday ? "ring-2 ring-blue-400/50" : ""
                }`}
                onClick={() => {
                  setSelectedDate(dateStr)
                  setViewMode("daily")
                  setCurrentDate(day)
                }}
              >
                <div className="flex items-center justify-between my-2">
                  {/* Date block */}
                  <div className="flex flex-col justify-center items-center mr-6">
                    <div className="text-white/80 text-xs font-medium">{dayName}</div>
                    <div className="text-white text-lg font-bold">{dayNumber}</div>
                  </div>
                  {/* Session summary */}
                  <div className="flex-1">
                    {daySessions.length > 0 ? (
                      <div>
                        <p className="text-white/80 text-sm">{completedSessions.length}개 세션 완료 • {totalFocusTime}분 집중</p>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {daySessions.slice(0, 2).map((session) => (
                            <div key={session.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10">
                              <Timer className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-white/70">{session.duration}분</span>
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="px-2 py-1 rounded-full bg-white/10">
                              <span className="text-xs text-white/70">+{daySessions.length - 2}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/60 text-sm">세션이 없습니다</div>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        })}
      </div>
    )
  }

  const getIntensityLevel = (count: number) => {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 5) return 2
    if (count <= 10) return 3
    return 4
  }

  const getIntensityColor = (level: number) => {
    const colors = [
      "bg-white/5 border-white/10", // 0
      "bg-blue-500/20 border-blue-400/30", // 1-2
      "bg-blue-500/40 border-blue-400/50", // 3-5
      "bg-blue-500/60 border-blue-400/70", // 6-10
      "bg-blue-500/80 border-blue-400/90", // 10+
    ]
    return colors[level] || colors[0]
  }

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    const weekRows = []
    for (let i = 0; i < days.length; i += 7) {
      weekRows.push(days.slice(i, i + 7))
    }

    // Calculate statistics
    let totalCount = 0
    let activeDays = 0
    let maxCount = 0

    if (appMode === "memo") {
      totalCount = Object.values(monthlyData).reduce((sum, data) => sum + data.memo_count, 0)
      activeDays = Object.keys(monthlyData).length
      maxCount = Math.max(...Object.values(monthlyData).map((data) => data.memo_count), 0)
    } else {
      totalCount = Object.values(monthlySessionData).reduce((sum, data) => sum + data.session_count, 0)
      activeDays = Object.keys(monthlySessionData).length
      maxCount = Math.max(...Object.values(monthlySessionData).map((data) => data.session_count), 0)
    }

    return (
      <div className="space-y-6">
        {/* Monthly Summary */}
        {appMode === "session" && renderSessionMonthlySummary()}

        {/* Calendar Grid */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{appMode === "memo" ? "메모 활동" : "세션 활동"}</h3>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>적음</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={`w-3 h-3 rounded-sm border ${getIntensityColor(level)}`} />
                ))}
              </div>
              <span>많음</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="text-center text-white/60 text-sm py-2 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weekRows.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  const dateStr = formatLocalDate(day)
                  const isCurrentMonth = day.getMonth() === month
                  const isToday = day.toDateString() === new Date().toDateString()

                  let count = 0
                  if (appMode === "memo") {
                    const dayData = monthlyData[dateStr]
                    count = dayData?.memo_count || 0
                  } else {
                    const dayData = monthlySessionData[dateStr]
                    count = dayData?.session_count || 0
                  }

                  const intensityLevel = getIntensityLevel(count)

                  return (
                    <div
                      key={dayIndex}
                      className={`aspect-square flex flex-col items-center justify-center text-xs cursor-pointer rounded-lg transition-all duration-200 border ${
                        isCurrentMonth ? "text-white hover:scale-105" : "text-white/40"
                      } ${isToday ? "ring-2 ring-blue-400" : ""} ${getIntensityColor(intensityLevel)}`}
                      onClick={() => {
                        if (isCurrentMonth) {
                          setViewMode("daily")
                          setCurrentDate(day)
                        }
                      }}
                      title={`${day.getDate()}일 - ${count}개 ${appMode === "memo" ? "메모" : "세션"}`}
                    >
                      <div className="font-medium">{day.getDate()}</div>
                      {count > 0 && (
                        <div className="text-xs text-white/80 mt-0.5">{count > 99 ? "99+" : count}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
          <h4 className="text-white font-medium mb-3">범례</h4>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-white/5 border border-white/10" />
              <span>{appMode === "memo" ? "메모" : "세션"} 없음</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/20 border border-blue-400/30" />
              <span>1-2개 {appMode === "memo" ? "메모" : "세션"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/40 border border-blue-400/50" />
              <span>3-5개 {appMode === "memo" ? "메모" : "세션"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/60 border border-blue-400/70" />
              <span>6-10개 {appMode === "memo" ? "메모" : "세션"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/80 border border-blue-400/90" />
              <span>10개 이상 {appMode === "memo" ? "메모" : "세션"}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                  onClick={goToToday}
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

            {/* Category Filter - only show in daily view for memo mode */}
            {appMode === "memo" && viewMode === "daily" && (
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  isScrolled ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
                }`}
              >
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      categoryFilter === null ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    전체
                  </button>
                  {memoCategories.map((key) => {
                    const config = categories[key] || CATEGORIES.uncategorized
                    return (
                      <button
                        key={key}
                        onClick={() => setCategoryFilter(key)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                          categoryFilter === key ? "bg-white/20 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        {config.icon}
                        {config.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        </div>

        {/* Content */}
        <div className="p-4 pb-32">
          {appMode === "memo" ? (
            <>
              {viewMode === "daily" && (
                <>
                  {renderDailySummary()}
                  {filteredMemos.length === 0 && memos.length > 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                        <Search className="w-8 h-8 text-white/50" />
                      </div>
                      <p className="text-white/70 text-lg mb-2">검색 결과가 없습니다</p>
                      <p className="text-white/50 text-sm">다른 검색어나 필터를 시도해보세요</p>
                    </div>
                  ) : (
                    memos.length > 0 && <div className="space-y-4">{filteredMemos.map(renderMemoCard)}</div>
                  )}
                </>
              )}

              {viewMode === "weekly" && renderWeeklyView()}
              {viewMode === "monthly" && renderMonthlyView()}
            </>
          ) : (
            /* Session Mode Content */
            <>
              {viewMode === "daily" && (
                <>
                  {renderSessionDailySummary()}

                  {/* Current Session Timer */}
                  <div className="mb-6">
                    <CircularTimer
                      duration={currentSession?.duration || 25}
                      timeLeft={timeLeft}
                      isRunning={isRunning}
                      isBreak={currentPhase === "break"}
                      onToggle={toggleTimer}
                      onReset={resetTimer}
                      onCancel={currentPhase !== "setup" ? cancelCurrentTask : undefined}
                      sessionTitle={currentSession?.subject}
                      sessionGoal={currentSession?.goal}
                      sessionTags={currentSession?.tags}
                      sessionStartTime={currentSession?.started_at}
                      onStartSession={startSession}
                    />
                  </div>

                  {/* Daily Sessions List */}
                  {(() => {
                    const today = formatLocalDate(currentDate)
                    const todaySessions = sessions.filter(session =>
                      formatLocalDate(new Date(session.created_at)) === today
                    )

                    return todaySessions.length > 0 && (
                      <div className="space-y-4">
                        {todaySessions.map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          timeZone={timeZone}
                          locale={locale}
                          sessionReflections={sessionReflections}
                          setSessionReflections={setSessionReflections}
                          handleReflectionSubmit={handleReflectionSubmit}
                          deleteSessionFromBackend={deleteSessionFromBackend}
                        />
                      ))}
                      </div>
                    )
                  })()}
                </>
              )}

              {viewMode === "weekly" && renderWeeklyView()}
              {viewMode === "monthly" && renderMonthlyView()}
            </>
          )}
        </div>

        {/* Input Modal */}
        {showInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
            <div className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border-t border-white/20 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white/70">새 메모</h3>
                <button onClick={resetInputState} className="text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <hr className="border-t border-white/20 mb-4" />

              <textarea
                className="w-full p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60 resize-y mb-4 max-h-[40vh] overflow-y-auto"
                rows={10}
                placeholder="메모를 입력하세요..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              {/* Tags Input */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  placeholder="태그 추가..."
                  className="flex-1 pl-4 pr-2 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addTag()
                      e.preventDefault()
                    }
                  }}
                />
                <button onClick={addTag} className="px-4 py-3 rounded-xl bg-white/20 text-white font-medium">
                  추가
                </button>
              </div>

              {/* Tags Display */}
              {inputTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {inputTags.map((tag, idx) => (
                    <div key={idx} className="px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(idx)} className="text-white/50">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Category Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/80 text-sm">카테고리</label>
                  <button
                    onClick={() => setShowCategorySelector(!showCategorySelector)}
                    className="text-blue-400 text-sm hover:text-blue-300"
                  >
                    {selectedCategory ? categories[selectedCategory]?.name || "선택됨" : "선택하기"}
                  </button>
                </div>

                {selectedCategory && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10">
                    <div
                      className={`w-6 h-6 rounded-full ${categories[selectedCategory]?.bgColor} flex items-center justify-center`}
                      style={{ color: categories[selectedCategory]?.color }}
                    >
                      {categories[selectedCategory]?.icon}
                    </div>
                    <span className="text-white text-sm">{categories[selectedCategory]?.name}</span>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="ml-auto text-white/50 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {showCategorySelector && (
                  <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.entries(categories).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedCategory(key)
                            setShowCategorySelector(false)
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all"
                        >
                          <div
                            className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}
                            style={{ color: config.color }}
                          >
                            {config.icon}
                          </div>
                          <span className="text-white text-sm">{config.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10">
                      {showNewCategoryInput ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="새 카테고리 이름"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/60 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                createNewCategory(newCategoryName, false)
                              }
                            }}
                          />
                          <button
                            onClick={() => createNewCategory(newCategoryName, false)}
                            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setShowNewCategoryInput(false)
                              setNewCategoryName("")
                            }}
                            className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewCategoryInput(true)}
                          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">새 카테고리 만들기</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments Preview */}
              {(inputAttachments.images.length > 0 || inputAttachments.audios.length > 0) && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">첨부파일</h4>

                  {/* Image Previews */}
                  {inputAttachments.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {inputAttachments.images.map((file, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file) || "/placeholder.svg"}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeInputImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audio Previews */}
                  {inputAttachments.audios.length > 0 && (
                    <div className="space-y-2">
                      {inputAttachments.audios.map((blob, index) => (
                        <div key={index} className="rounded-xl bg-white/10 p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                              <Mic className="w-5 h-5" />
                            </div>
                            <span className="text-white text-sm flex-1">음성 메모 {index + 1}</span>
                            <button
                              onClick={() => removeInputAudio(index)}
                              className="text-white/50 hover:text-white transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setShowImageOptions(true)}
                  className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-sm">사진</span>
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 py-3 rounded-xl border text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2 ${
                    isRecording ? "bg-red-500/20 border-red-500/30" : "bg-white/10 border-white/20"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-sm">{isRecording ? "녹음 중..." : "음성"}</span>
                </button>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium"
              >
                메모 저장
              </button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedMemo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50" onClick={resetDetailState}>
            <div
              className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border-t border-white/20 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Detail/Edit Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white/70">{isEditing ? "메모 수정" : "메모 상세"}</h3>
                <button
                  onClick={resetDetailState}
                  className="text-white/70 p-1 rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <hr className="border-t border-white/20 mb-4" />

              {isEditing ? (
                <>
                  <textarea
                    className="w-full p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none mb-4"
                    rows={4}
                    placeholder="메모를 입력하세요..."
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />

                  {/* Edit Tags Input */}
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="태그 추가..."
                      className="flex-1 pl-4 pr-2 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60"
                      value={editCurrentTag}
                      onChange={(e) => setEditCurrentTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addEditTag()
                          e.preventDefault()
                        }
                      }}
                    />
                    <button onClick={addEditTag} className="px-4 py-3 rounded-xl bg-white/20 text-white font-medium">
                      추가
                    </button>
                  </div>

                  {/* Edit Tags Display */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {editTags.map((tag, idx) => (
                      <div key={idx} className="px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeEditTag(idx)} className="text-white/50">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Edit Category Selection */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white/80 text-sm">카테고리</label>
                      <button
                        onClick={() => setShowEditCategorySelector(!showEditCategorySelector)}
                        className="text-blue-400 text-sm hover:text-blue-300"
                      >
                        {editSelectedCategory ? categories[editSelectedCategory]?.name || "선택됨" : "선택하기"}
                      </button>
                    </div>

                    {editSelectedCategory && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/10">
                        <div
                          className={`w-6 h-6 rounded-full ${categories[editSelectedCategory]?.bgColor} flex items-center justify-center`}
                          style={{ color: categories[editSelectedCategory]?.color }}
                        >
                          {categories[editSelectedCategory]?.icon}
                        </div>
                        <span className="text-white text-sm">{categories[editSelectedCategory]?.name}</span>
                        <button
                          onClick={() => setEditSelectedCategory(null)}
                          className="ml-auto text-white/50 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {showEditCategorySelector && (
                      <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {Object.entries(categories).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setEditSelectedCategory(key)
                                setShowEditCategorySelector(false)
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all"
                            >
                              <div
                                className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}
                                style={{ color: config.color }}
                              >
                                {config.icon}
                              </div>
                              <span className="text-white text-sm">{config.name}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/10">
                          {showEditNewCategoryInput ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="새 카테고리 이름"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/60 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    createNewCategory(newCategoryName, true)
                                  }
                                }}
                              />
                              <button
                                onClick={() => createNewCategory(newCategoryName, true)}
                                className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm"
                              >
                                추가
                              </button>
                              <button
                                onClick={() => {
                                  setShowEditNewCategoryInput(false)
                                  setNewCategoryName("")
                                }}
                                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowEditNewCategoryInput(true)}
                              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-sm">새 카테고리 만들기</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Existing Attachments */}
                  {editAttachments.existing.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">기존 첨부파일</h4>
                      <div className="flex flex-wrap gap-2">
                        {editAttachments.existing
                          .filter((att) => att.type === "image")
                          .map((attachment) => (
                            <div key={attachment.id} className="relative w-24 h-24 rounded-lg overflow-hidden">
                              <img
                                src={attachment.url || "/placeholder.svg"}
                                alt={attachment.filename}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removeExistingAttachment(attachment.id)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                        {editAttachments.existing
                          .filter((att) => att.type === "audio")
                          .map((attachment) => (
                            <div key={attachment.id} className="rounded-xl bg-white/10 p-3">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => playAudio(attachment.id, attachment.url)}
                                  className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white"
                                >
                                  {playingAudio === attachment.id ? (
                                    <Pause className="w-5 h-5" />
                                  ) : (
                                    <Play className="w-5 h-5" />
                                  )}
                                </button>
                                <span className="text-white text-sm">{attachment.filename}</span>
                                <button
                                  onClick={() => removeExistingAttachment(attachment.id)}
                                  className="text-white/50 hover:text-white transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* New Attachments Preview */}
                  {(editAttachments.newImages.length > 0 || editAttachments.newAudios.length > 0) && (
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">새로 추가된 첨부파일</h4>

                      {/* New Image Previews */}
                      {editAttachments.newImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editAttachments.newImages.map((file, index) => (
                            <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden">
                              <img
                                src={URL.createObjectURL(file) || "/placeholder.svg"}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => {
                                  setEditAttachments((prev) => ({
                                    ...prev,
                                    newImages: prev.newImages.filter((_, i) => i !== index),
                                  }))
                                }}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Audio Previews */}
                      {editAttachments.newAudios.length > 0 && (
                        <div className="space-y-2">
                          {editAttachments.newAudios.map((blob, index) => (
                            <div key={index} className="rounded-xl bg-white/10 p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white">
                                  <Mic className="w-5 h-5" />
                                </div>
                                <span className="text-white text-sm flex-1">새 음성 메모 {index + 1}</span>
                                <button
                                  onClick={() => {
                                    setEditAttachments((prev) => ({
                                      ...prev,
                                      newAudios: prev.newAudios.filter((_, i) => i !== index),
                                    }))
                                  }}
                                  className="text-white/50 hover:text-white transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Attachments */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => setShowImageOptions(true)}
                      className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">사진 추가</span>
                    </button>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex-1 py-3 rounded-xl border text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2 ${
                    isRecording ? "bg-red-500/20 border-red-500/30" : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span className="text-sm">{isRecording ? "녹음 중..." : "음성 추가"}</span>
                    </button>
                  </div>

                  {/* Edit Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleEdit}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMemo.id)}
                      className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-all"
                    >
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Content with Markdown Support */}
                  <div className="mb-6">
                    <MarkdownRenderer content={selectedMemo.content} />
                  </div>

                  {/* Tags */}
                  {selectedMemo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {selectedMemo.tags.map((tag, idx) => (
                        <span key={idx} className="text-sm px-3 py-1 rounded-full bg-white/20 text-white">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Images Section */}
                  {selectedMemo.attachments.filter((att) => att.type === "image").length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white font-medium mb-3">이미지</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedMemo.attachments
                          .filter((att) => att.type === "image")
                          .map((attachment) => (
                            <div
                              key={attachment.id}
                              className="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                setImageModal({ isOpen: true, imageUrl: attachment.url })
                              }}
                            >
                              <img
                                src={attachment.url || "/placeholder.svg"}
                                alt={attachment.filename}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                                <ZoomIn className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Audio Section */}
                  {selectedMemo.attachments.filter((att) => att.type === "audio").length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white font-medium mb-3">음성 메모</h4>
                      <div>
                        {selectedMemo.attachments
                          .filter((att) => att.type === "audio")
                          .map((attachment) => (
                            <div key={attachment.id} className="mb-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playAudio(attachment.id, attachment.url)
                                }}
                                className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all"
                              >
                                {playingAudio === attachment.id ? (
                                  <Pause className="w-6 h-6 text-white" />
                                ) : (
                                  <Play className="w-6 h-6 text-white" />
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Category & Dates just above edit button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {selectedMemo.category &&
                        (() => {
                          const cat = categories[selectedMemo.category] || CATEGORIES.uncategorized
                          return (
                            <>
                              <div
                                className={`w-8 h-8 rounded-full ${cat.bgColor} flex items-center justify-center`}
                                style={{ color: cat.color }}
                              >
                                {cat.icon}
                              </div>
                              <span className="text-white font-medium">{cat.name}</span>
                            </>
                          )
                        })()}
                    </div>
                    <div className="text-white/60 text-xs text-right space-y-0.5">
                      <p>
                        작성일: {(() => {
                          const utcDate = selectedMemo.created_at
                          return utcDate.toLocaleString(locale, {
                            timeZone,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        })()}
                      </p>
                      <p>
                        수정일: {(() => {
                          const utcDate = selectedMemo.updated_at
                          return utcDate.toLocaleString(locale, {
                            timeZone,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setEditText(selectedMemo.content)
                      setEditTags(selectedMemo.tags)
                      setEditSelectedCategory(selectedMemo.category || null)
                      setEditAttachments({
                        existing: selectedMemo.attachments,
                        newImages: [],
                        newAudios: [],
                      })
                    }}
                    className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    메모 수정
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Image Modal */}
        <ImageModal
          isOpen={imageModal.isOpen}
          imageUrl={imageModal.imageUrl}
          onClose={() => setImageModal({ isOpen: false, imageUrl: "" })}
        />

        {/* Image Options Modal */}
        {showImageOptions && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">사진 추가 방법</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (isEditing && selectedMemo) {
                      editFileInputRef.current?.click()
                    } else {
                      fileInputRef.current?.click()
                    }
                    setShowImageOptions(false)
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                >
                  갤러리에서 선택
                </button>
                <button
                  onClick={() => {
                    cameraInputRef.current?.click()
                    setShowImageOptions(false)
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                >
                  카메라로 촬영
                </button>
              </div>
              <button
                onClick={() => setShowImageOptions(false)}
                className="w-full py-3 rounded-xl text-white/70 hover:bg-white/5 transition-all mt-4"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        <CategoryManagement
          isOpen={showCategoryManagement}
          onClose={() => setShowCategoryManagement(false)}
          onUpdate={fetchCustomCategories}
        />

        {/* Hidden file inputs */}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => addImages(e.target.files)}
        />

        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          ref={cameraInputRef}
          className="hidden"
          onChange={(e) => addImages(e.target.files)}
        />

        <input
          type="file"
          accept="image/*"
          multiple
          ref={editFileInputRef}
          className="hidden"
          onChange={(e) => addEditImages(e.target.files)}
        />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthGuard>
      <MemoSessionApp />
    </AuthGuard>
  )
}
