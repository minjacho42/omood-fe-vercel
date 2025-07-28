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
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Grid3X3,
  Clock,
  X,
  Camera,
  Pause,
  Play,
  Trash2,
} from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import CategoryManagement from "@/components/category-management"

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

function MemoApp() {
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

  const fetchUser = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
        credentials: "include",
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      }
    } catch (err) {
      console.error("Error fetching user:", err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
      window.location.href = "/login"
    } catch (err) {
      console.error("Logout failed:", err)
      window.location.href = "/login"
    }
  }

  const fetchCustomCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`, {
        credentials: "include",
      })
      if (res.ok) {
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
    fetchData()
  }, [timeZone, viewMode, currentDate, categoryFilter])

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

  const fetchDailyData = async () => {
    const dateStr = currentDate.toISOString().split("T")[0]

    try {
      // Fetch daily memos using /memo/list endpoint
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`

      const res = await fetch(url, {
        credentials: "include",
      })
      if (res.ok) {
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

    const startDateStr = startOfWeek.toISOString().split("T")[0]
    const endDateStr = endOfWeek.toISOString().split("T")[0]

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`

      const res = await fetch(url, {
        credentials: "include",
      })
      if (res.ok) {
        const memos = await res.json()

        // Group memos by date
        const groupedMemos: { [key: string]: Memo[] } = {}
        memos.forEach((memo: Memo) => {
          const memoDate = memo.created_at.split("T")[0]
          if (!groupedMemos[memoDate]) {
            groupedMemos[memoDate] = []
          }
          groupedMemos[memoDate].push(memo)
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

    const startDateStr = firstDay.toISOString().split("T")[0]
    const endDateStr = lastDay.toISOString().split("T")[0]

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`

      const res = await fetch(url, {
        credentials: "include",
      })
      if (res.ok) {
        const memos = await res.json()

        // Group memos by date and count
        const groupedData: { [key: string]: { memo_count: number; has_summary: boolean } } = {}
        memos.forEach((memo: Memo) => {
          const memoDate = memo.created_at.split("T")[0]
          if (!groupedData[memoDate]) {
            groupedData[memoDate] = { memo_count: 0, has_summary: false }
          }
          groupedData[memoDate].memo_count++
        })

        setMonthlyData(groupedData)
      }
    } catch (err) {
      console.error("Error fetching monthly data:", err)
    }
  }

  const fetchDailySummary = async (date: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/summary/daily?date=${date}&tz=${encodeURIComponent(timeZone)}`,
        {
          credentials: "include",
        },
      )
      if (res.ok) {
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
        content: "React 18의 새로운 Concurrent Features에 대해 공부했다.",
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
        date: currentDate.toISOString().split("T")[0],
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

  const handleSubmit = async () => {
    if (!inputText.trim()) return

    const allTags = currentTag.trim() ? [...inputTags, currentTag.trim()] : inputTags

    const formData = new FormData()
    formData.append("content", inputText)
    formData.append("tags", allTags.join(","))

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (res.ok) {
        resetInputState()
        fetchData()
      } else {
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

    editAttachments.newImages.forEach((file, index) => {
      formData.append(`new_image_${index}`, file)
    })

    editAttachments.newAudios.forEach((blob, index) => {
      const file = new File([blob], `new_audio_${index}.wav`, { type: "audio/wav" })
      formData.append(`new_audio_${index}`, file)
    })

    formData.append("keep_attachments", editAttachments.existing.map((att) => att.id).join(","))

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${selectedMemo.id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      })

      if (res.ok) {
        resetDetailState()
        fetchData()
      }
    } catch (err) {
      console.error("Edit failed:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      resetDetailState()
      fetchData()
    } catch (err) {
      console.error("Delete failed:", err)
    }
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
  }

  const resetDetailState = () => {
    setSelectedMemo(null)
    setIsEditing(false)
    setEditText("")
    setEditTags([])
    setEditCurrentTag("")
    setEditAttachments({ existing: [], newImages: [], newAudios: [] })
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

  // Categories present in current memos
  const memoCategories = useMemo(() => {
    const cats = memos.map((m) => m.category || "uncategorized")
    return Array.from(new Set(cats))
  }, [memos])

  const filteredMemos = memos.filter((memo) => {
    const memoKey = memo.category || "uncategorized"
    if (categoryFilter && memoKey !== categoryFilter) {
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

  const updateMemoCategory = async (memoId: string, newCategory: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/${memoId}/category`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
        credentials: "include",
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error("Update category failed:", err)
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

  const renderMemoCard = (memo: Memo) => {
    const category = categories[memo.category || "uncategorized"] || CATEGORIES.uncategorized
    const utcCreated = memo.created_at.endsWith("Z") ? new Date(memo.created_at) : new Date(memo.created_at + "Z")
    const time = utcCreated.toLocaleString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <div
        key={memo.id}
        className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 cursor-pointer hover:bg-white/15 transition-all duration-200"
        onClick={() => setSelectedMemo(memo)}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full ${category.bgColor} flex items-center justify-center flex-shrink-0`}
            style={{ color: category.color }}
          >
            {category.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-white/80">{category.name}</span>
              {memo.category_confidence && (
                <span className="text-xs text-white/60">{Math.round(memo.category_confidence * 100)}%</span>
              )}
              <span className="text-xs text-white/60">{time}</span>
            </div>

            {memo.attachments.length > 0 && (
              <div className="mb-3">
                <div className="flex gap-2 mb-2">
                  {memo.attachments
                    .filter((att) => att.type === "image")
                    .slice(0, 3)
                    .map((attachment) => (
                      <div key={attachment.id} className="w-16 h-16 rounded-lg overflow-hidden">
                        <img
                          src={attachment.url || "/placeholder.svg"}
                          alt={attachment.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  {memo.attachments.filter((att) => att.type === "image").length > 3 && (
                    <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-xs text-white/70">
                        +{memo.attachments.filter((att) => att.type === "image").length - 3}
                      </span>
                    </div>
                  )}
                </div>
                {memo.attachments.filter((att) => att.type === "audio").length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Mic className="w-3 h-3" />
                    <span>{memo.attachments.filter((att) => att.type === "audio").length}개 음성 메모</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-white text-sm leading-relaxed line-clamp-3 mb-3">{memo.content}</p>

            {memo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memo.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                    #{tag}
                  </span>
                ))}
                {memo.tags.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                    +{memo.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
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
        {weekDays.map((day, index) => {
          const dateStr = day.toISOString().split("T")[0]
          const dayName = day.toLocaleDateString(locale, { weekday: "short" })
          const dayNumber = day.getDate()
          const dayMemos = weeklyData[dateStr] || []
          const isToday = day.toDateString() === new Date().toDateString()

          // Group memos by category for display
          const categoryGroups: { [key: string]: number } = {}
          dayMemos.forEach((memo) => {
            const category = memo.category || "uncategorized"
            categoryGroups[category] = (categoryGroups[category] || 0) + 1
          })

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
              <div className="flex items-center gap-4 mb-3">
                <div className="text-center">
                  <div className="text-white/80 text-xs font-medium">{dayName}</div>
                  <div className="text-white text-lg font-bold">{dayNumber}</div>
                </div>
                <div className="flex-1">
                  {dayMemos.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white/90 text-sm font-medium">{dayMemos.length}개 메모</span>
                      </div>
                      <p className="text-white/80 text-sm line-clamp-2">{dayMemos[0]?.content || "메모 내용"}</p>
                    </div>
                  ) : (
                    <div className="text-white/60 text-sm">메모가 없습니다</div>
                  )}
                </div>
              </div>

              {Object.keys(categoryGroups).length > 0 && (
                <div className="flex gap-2 flex-wrap">
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
          )
        })}
      </div>
    )
  }

  const getIntensityLevel = (memoCount: number) => {
    if (memoCount === 0) return 0
    if (memoCount <= 2) return 1
    if (memoCount <= 5) return 2
    if (memoCount <= 10) return 3
    return 4
  }

  const getIntensityColor = (level: number) => {
    const colors = [
      "bg-white/5 border-white/10", // 0 memos
      "bg-blue-500/20 border-blue-400/30", // 1-2 memos
      "bg-blue-500/40 border-blue-400/50", // 3-5 memos
      "bg-blue-500/60 border-blue-400/70", // 6-10 memos
      "bg-blue-500/80 border-blue-400/90", // 10+ memos
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
    const totalMemos = Object.values(monthlyData).reduce((sum, data) => sum + data.memo_count, 0)
    const activeDays = Object.keys(monthlyData).length
    const maxMemos = Math.max(...Object.values(monthlyData).map((data) => data.memo_count), 0)

    return (
      <div className="space-y-6">
        {/* Monthly Statistics */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4">이번 달 통계</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{totalMemos}</div>
              <div className="text-white/60 text-sm">총 메모</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{activeDays}</div>
              <div className="text-white/60 text-sm">활동일</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{maxMemos}</div>
              <div className="text-white/60 text-sm">최대 메모</div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">메모 활동</h3>
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
                  const dateStr = day.toISOString().split("T")[0]
                  const dayData = monthlyData[dateStr]
                  const isCurrentMonth = day.getMonth() === month
                  const isToday = day.toDateString() === new Date().toDateString()
                  const memoCount = dayData?.memo_count || 0
                  const intensityLevel = getIntensityLevel(memoCount)

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
                      title={`${day.getDate()}일 - ${memoCount}개 메모`}
                    >
                      <div className="font-medium">{day.getDate()}</div>
                      {memoCount > 0 && (
                        <div className="text-xs text-white/80 mt-0.5">{memoCount > 99 ? "99+" : memoCount}</div>
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
              <span>메모 없음</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/20 border border-blue-400/30" />
              <span>1-2개 메모</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/40 border border-blue-400/50" />
              <span>3-5개 메모</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/60 border border-blue-400/70" />
              <span>6-10개 메모</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/80 border border-blue-400/90" />
              <span>10개 이상 메모</span>
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
          className={`sticky top-0 z-20 backdrop-blur-2xl bg-white/20 border border-white/20 shadow-lg transition-all duration-300 rounded-b-3xl ${
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

          {/* Category Filter - only show in daily view */}
          {viewMode === "daily" && (
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
        </div>

        {/* Content */}
        <div className="p-4 pb-32">
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
        </div>

        {/* Input Modal */}
        {showInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
            <div className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border-t border-white/20 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">새 메모</h3>
                <button onClick={resetInputState} className="text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                className="w-full p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none mb-4"
                rows={4}
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
            <div className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border-t border-white/20 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">{isEditing ? "메모 수정" : "메모 상세"}</h3>
                <button onClick={resetDetailState} className="text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  {/* Category */}
                  {selectedMemo.category && (
                    <div className="flex items-center gap-3 mb-4">
                      {(() => {
                        const category =
                          categories[selectedMemo.category || "uncategorized"] || CATEGORIES.uncategorized
                        return (
                          <>
                            <div
                              className={`w-10 h-10 rounded-full ${category.bgColor} flex items-center justify-center flex-shrink-0`}
                              style={{ color: category.color }}
                            >
                              {category.icon}
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{category.name}</h4>
                              {selectedMemo.category_confidence && (
                                <p className="text-white/60 text-sm">
                                  정확도: {Math.round(selectedMemo.category_confidence * 100)}%
                                </p>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* Content */}
                  <p className="text-white text-base leading-relaxed mb-4">{selectedMemo.content}</p>

                  {/* Attachments */}
                  {selectedMemo.attachments.length > 0 && (
                    <div className="mb-4">
                      {selectedMemo.attachments
                        .filter((att) => att.type === "image")
                        .map((attachment) => (
                          <div key={attachment.id} className="rounded-xl overflow-hidden mb-2">
                            <img
                              src={attachment.url || "/placeholder.svg"}
                              alt={attachment.filename}
                              className="w-full max-h-64 object-cover"
                            />
                          </div>
                        ))}

                      {selectedMemo.attachments
                        .filter((att) => att.type === "audio")
                        .map((attachment) => (
                          <div key={attachment.id} className="rounded-xl bg-white/10 p-3 mb-2">
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
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

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

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setEditText(selectedMemo.content)
                      setEditTags(selectedMemo.tags)
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
      <MemoApp />
    </AuthGuard>
  )
}
