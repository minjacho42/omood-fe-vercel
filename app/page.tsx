"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  X,
  Calendar,
  List,
  BarChart3,
  Edit3,
  Trash2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"

// Types
interface Memo {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

interface Session {
  id: string
  subject: string
  goal: string
  tags: string[]
  duration: number
  status: "pending" | "running" | "paused" | "completed" | "reviewed"
  startedAt?: string
  completedAt?: string
  reflection?: string
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  email: string
  name: string
  picture: string
}

const Page = () => {
  // Core state
  const [user, setUser] = useState<User | null>(null)
  const [appMode, setAppMode] = useState<"memo" | "session">("memo")
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isScrolled, setIsScrolled] = useState(false)

  // Memo state
  const [memos, setMemos] = useState<Memo[]>([])
  const [memoInput, setMemoInput] = useState("")
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [showMemoDetail, setShowMemoDetail] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)

  // Session state
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [showSessionSetup, setShowSessionSetup] = useState(false)
  const [showSessionTimer, setShowSessionTimer] = useState(false)
  const [showSessionDetail, setShowSessionDetail] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  // Session setup state
  const [sessionSetupData, setSessionSetupData] = useState({
    goal: "",
    subject: "",
    tags: [] as string[],
    duration: 25,
  })

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  // Auth functions
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    const scope = "openid email profile"

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    window.location.href = authUrl
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    setUser(null)
  }

  // API functions
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("access_token")
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Memo functions
  const fetchMemos = async () => {
    try {
      const data = await apiCall("/memos")
      setMemos(data)
    } catch (error) {
      console.error("Failed to fetch memos:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memoInput.trim()) return

    try {
      const newMemo = await apiCall("/memos", {
        method: "POST",
        body: JSON.stringify({
          content: memoInput.trim(),
          tags: extractTags(memoInput),
        }),
      })

      setMemos((prev) => [newMemo, ...prev])
      setMemoInput("")
    } catch (error) {
      console.error("Failed to create memo:", error)
    }
  }

  const updateMemo = async (id: string, updates: Partial<Memo>) => {
    try {
      const updatedMemo = await apiCall(`/memos/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      })

      setMemos((prev) => prev.map((memo) => (memo.id === id ? updatedMemo : memo)))
      return updatedMemo
    } catch (error) {
      console.error("Failed to update memo:", error)
    }
  }

  const deleteMemo = async (id: string) => {
    try {
      await apiCall(`/memos/${id}`, { method: "DELETE" })
      setMemos((prev) => prev.filter((memo) => memo.id !== id))
    } catch (error) {
      console.error("Failed to delete memo:", error)
    }
  }

  // Session functions
  const fetchSessions = async () => {
    try {
      const data = await apiCall("/sessions")
      setSessions(data)

      // Find active session
      const active = data.find((s: Session) => s.status === "running" || s.status === "paused")
      if (active) {
        setActiveSession(active)
        if (active.status === "running") {
          setIsRunning(true)
          setIsPaused(false)
        } else if (active.status === "paused") {
          setIsRunning(false)
          setIsPaused(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    }
  }

  const createNewSession = async () => {
    if (!sessionSetupData.subject.trim()) return

    try {
      const newSession = await apiCall("/sessions", {
        method: "POST",
        body: JSON.stringify({
          subject: sessionSetupData.subject,
          goal: sessionSetupData.goal,
          tags: sessionSetupData.tags,
          duration: sessionSetupData.duration,
          status: "pending",
        }),
      })

      setSessions((prev) => [newSession, ...prev])
      setShowSessionSetup(false)
      setSessionSetupData({ goal: "", subject: "", tags: [], duration: 25 })
    } catch (error) {
      console.error("Failed to create session:", error)
    }
  }

  const updateSession = async (id: string, updates: Partial<Session>) => {
    try {
      const updatedSession = await apiCall(`/sessions/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      })

      setSessions((prev) => prev.map((session) => (session.id === id ? updatedSession : session)))

      if (activeSession?.id === id) {
        setActiveSession(updatedSession)
      }

      return updatedSession
    } catch (error) {
      console.error("Failed to update session:", error)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await apiCall(`/sessions/${id}`, { method: "DELETE" })
      setSessions((prev) => prev.filter((session) => session.id !== id))

      if (activeSession?.id === id) {
        setActiveSession(null)
        setIsRunning(false)
        setIsPaused(false)
        setTimeLeft(0)
      }
    } catch (error) {
      console.error("Failed to delete session:", error)
    }
  }

  const startSession = async (session: Session) => {
    try {
      const updatedSession = await updateSession(session.id, {
        status: "running",
        startedAt: new Date().toISOString(),
      })

      if (updatedSession) {
        setActiveSession(updatedSession)
        setTimeLeft(updatedSession.duration * 60)
        setIsRunning(true)
        setIsPaused(false)
        setShowSessionTimer(true)
      }
    } catch (error) {
      console.error("Failed to start session:", error)
    }
  }

  const pauseSession = async () => {
    if (!activeSession) return

    try {
      const updatedSession = await updateSession(activeSession.id, {
        status: "paused",
      })

      if (updatedSession) {
        setIsRunning(false)
        setIsPaused(true)
      }
    } catch (error) {
      console.error("Failed to pause session:", error)
    }
  }

  const resumeSession = async () => {
    if (!activeSession) return

    try {
      const updatedSession = await updateSession(activeSession.id, {
        status: "running",
      })

      if (updatedSession) {
        setIsRunning(true)
        setIsPaused(false)
      }
    } catch (error) {
      console.error("Failed to resume session:", error)
    }
  }

  const completeSession = async () => {
    if (!activeSession) return

    try {
      const updatedSession = await updateSession(activeSession.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      })

      if (updatedSession) {
        setActiveSession(null)
        setIsRunning(false)
        setIsPaused(false)
        setTimeLeft(0)
        setShowSessionTimer(false)
        await fetchSessions()
      }
    } catch (error) {
      console.error("Failed to complete session:", error)
    }
  }

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            completeSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, timeLeft])

  // Utility functions
  const extractTags = (content: string): string[] => {
    const tagRegex = /#(\w+)/g
    const matches = content.match(tagRegex)
    return matches ? matches.map((tag) => tag.slice(1)) : []
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (viewMode === "daily") {
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      } else if (viewMode === "weekly") {
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
      } else {
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filter functions
  const getFilteredMemos = () => {
    return memos.filter((memo) => {
      const matchesSearch = memo.content.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => memo.tags.includes(tag))
      return matchesSearch && matchesTags
    })
  }

  const getFilteredSessions = () => {
    return sessions.filter((session) => {
      const matchesSearch =
        session.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.goal.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => session.tags.includes(tag))
      return matchesSearch && matchesTags
    })
  }

  // Load data on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      fetchMemos()
      fetchSessions()
    }
  }, [])

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">omood</h1>
            <p className="text-white/70 mb-8">당신의 생각과 시간을 기록하세요</p>
            <Button onClick={handleGoogleLogin} className="w-full bg-white text-gray-900 hover:bg-gray-100">
              Google로 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled ? "bg-black/20 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">omood</h1>

              {/* Mode Toggle */}
              <div className="flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setAppMode("memo")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    appMode === "memo" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  메모
                </button>
                <button
                  onClick={() => setAppMode("session")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    appMode === "session" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  세션
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "daily" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "weekly" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "monthly" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigateDate("prev")}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <h2 className="text-xl font-semibold text-white">{formatDate(currentDate)}</h2>

            <Button
              onClick={() => navigateDate("next")}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              onClick={goToToday}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              오늘
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* Content based on mode */}
        {appMode === "memo" ? (
          <>
            {/* Memo Input */}
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="relative">
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder="무엇을 생각하고 계신가요? #태그를 사용해보세요"
                  rows={3}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <Button
                  type="submit"
                  disabled={!memoInput.trim()}
                  className="absolute bottom-3 right-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Memo List */}
            <div className="space-y-4">
              {getFilteredMemos().map((memo) => (
                <Card
                  key={memo.id}
                  className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedMemo(memo)
                    setShowMemoDetail(true)
                  }}
                >
                  <CardContent className="p-4">
                    <p className="text-white mb-2">{memo.content}</p>
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <div className="flex flex-wrap gap-1">
                        {memo.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-purple-500/30 rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span>{new Date(memo.createdAt).toLocaleString("ko-KR")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Session Creation Button */}
            <div className="mb-6">
              <Button
                onClick={() => setShowSessionSetup(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />새 세션 만들기
              </Button>
            </div>

            {/* Active Session Timer */}
            {activeSession && (
              <Card className="mb-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30">
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">{activeSession.subject}</h3>
                    <div className="text-4xl font-mono text-white mb-4">{formatTime(timeLeft)}</div>
                    <div className="flex justify-center space-x-4">
                      {!isRunning && !isPaused && (
                        <Button onClick={() => startSession(activeSession)} className="bg-green-500 hover:bg-green-600">
                          <Play className="w-4 h-4 mr-2" />
                          시작
                        </Button>
                      )}
                      {isRunning && (
                        <Button onClick={pauseSession} className="bg-yellow-500 hover:bg-yellow-600">
                          <Pause className="w-4 h-4 mr-2" />
                          일시정지
                        </Button>
                      )}
                      {isPaused && (
                        <Button onClick={resumeSession} className="bg-green-500 hover:bg-green-600">
                          <Play className="w-4 h-4 mr-2" />
                          재개
                        </Button>
                      )}
                      <Button
                        onClick={completeSession}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        완료
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session List */}
            <div className="space-y-4">
              {getFilteredSessions().map((session) => (
                <Card
                  key={session.id}
                  className={`bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer ${
                    session.status === "running"
                      ? "ring-2 ring-green-400"
                      : session.status === "paused"
                        ? "ring-2 ring-yellow-400"
                        : session.status === "completed"
                          ? "ring-2 ring-blue-400"
                          : ""
                  }`}
                  onClick={() => {
                    setSelectedSession(session)
                    setShowSessionDetail(true)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{session.subject}</h3>
                        {session.goal && <p className="text-white/70 text-sm mb-2">{session.goal}</p>}
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {session.duration}분
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              session.status === "pending"
                                ? "bg-gray-500/30"
                                : session.status === "running"
                                  ? "bg-green-500/30"
                                  : session.status === "paused"
                                    ? "bg-yellow-500/30"
                                    : session.status === "completed"
                                      ? "bg-blue-500/30"
                                      : "bg-purple-500/30"
                            }`}
                          >
                            {session.status === "pending"
                              ? "대기"
                              : session.status === "running"
                                ? "진행중"
                                : session.status === "paused"
                                  ? "일시정지"
                                  : session.status === "completed"
                                    ? "완료"
                                    : "검토됨"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {session.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-purple-500/30 rounded-full text-xs text-white/80">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {session.status === "pending" && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            startSession(session)
                          }}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Session Setup Modal */}
      {showSessionSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div
            className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">새 세션 설정</h2>
              <Button
                onClick={() => setShowSessionSetup(false)}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">주제</label>
                <input
                  type="text"
                  placeholder="세션 주제를 입력하세요"
                  value={sessionSetupData.subject}
                  onChange={(e) => setSessionSetupData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">목표</label>
                <textarea
                  placeholder="이 세션에서 달성하고 싶은 목표를 입력하세요"
                  value={sessionSetupData.goal}
                  onChange={(e) => setSessionSetupData((prev) => ({ ...prev, goal: e.target.value }))}
                  rows={3}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">태그</label>
                <input
                  type="text"
                  placeholder="태그를 입력하세요 (쉼표로 구분)"
                  value={sessionSetupData.tags.join(", ")}
                  onChange={(e) =>
                    setSessionSetupData((prev) => ({
                      ...prev,
                      tags: e.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter((tag) => tag),
                    }))
                  }
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">시간 (분)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={sessionSetupData.duration}
                  onChange={(e) =>
                    setSessionSetupData((prev) => ({
                      ...prev,
                      duration: Number.parseInt(e.target.value) || 25,
                    }))
                  }
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={createNewSession}
                disabled={!sessionSetupData.subject.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50"
              >
                세션 생성
              </Button>
              <Button
                onClick={() => setShowSessionSetup(false)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Memo Detail Modal */}
      {showMemoDetail && selectedMemo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">메모 상세</h2>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    setEditingMemo(selectedMemo)
                    setShowMemoDetail(false)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={async () => {
                    await deleteMemo(selectedMemo.id)
                    setShowMemoDetail(false)
                    setSelectedMemo(null)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setShowMemoDetail(false)
                    setSelectedMemo(null)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg">
                <p className="text-white whitespace-pre-wrap">{selectedMemo.content}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedMemo.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-500/30 rounded-full text-sm text-white/80">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="text-sm text-white/60">
                <p>생성: {new Date(selectedMemo.createdAt).toLocaleString("ko-KR")}</p>
                <p>수정: {new Date(selectedMemo.updatedAt).toLocaleString("ko-KR")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {showSessionDetail && selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">세션 상세</h2>
              <div className="flex items-center space-x-2">
                {(selectedSession.status === "pending" ||
                  selectedSession.status === "completed" ||
                  selectedSession.status === "reviewed") && (
                  <Button
                    onClick={() => {
                      setEditingSession(selectedSession)
                      setShowSessionDetail(false)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    await deleteSession(selectedSession.id)
                    setShowSessionDetail(false)
                    setSelectedSession(null)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setShowSessionDetail(false)
                    setSelectedSession(null)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{selectedSession.subject}</h3>
                {selectedSession.goal && <p className="text-white/80 mb-4">{selectedSession.goal}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-white/60 text-sm">시간</p>
                  <p className="text-white font-semibold">{selectedSession.duration}분</p>
                </div>
                <div className="p-3 bg-white/10 rounded-lg">
                  <p className="text-white/60 text-sm">상태</p>
                  <p className="text-white font-semibold">
                    {selectedSession.status === "pending"
                      ? "대기"
                      : selectedSession.status === "running"
                        ? "진행중"
                        : selectedSession.status === "paused"
                          ? "일시정지"
                          : selectedSession.status === "completed"
                            ? "완료"
                            : "검토됨"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSession.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-500/30 rounded-full text-sm text-white/80">
                    #{tag}
                  </span>
                ))}
              </div>

              {selectedSession.reflection && (
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">회고</h4>
                  <p className="text-white/80">{selectedSession.reflection}</p>
                </div>
              )}

              <div className="text-sm text-white/60">
                <p>생성: {new Date(selectedSession.createdAt).toLocaleString("ko-KR")}</p>
                {selectedSession.startedAt && (
                  <p>시작: {new Date(selectedSession.startedAt).toLocaleString("ko-KR")}</p>
                )}
                {selectedSession.completedAt && (
                  <p>완료: {new Date(selectedSession.completedAt).toLocaleString("ko-KR")}</p>
                )}
              </div>

              {selectedSession.status === "pending" && (
                <Button
                  onClick={() => {
                    startSession(selectedSession)
                    setShowSessionDetail(false)
                  }}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  세션 시작
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Page
