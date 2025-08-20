'use client'

import type React from "react"
import { useEffect, useState } from "react"
import {
  BookOpen,
  Briefcase,
  Heart,
  Lightbulb,
  ShoppingCart,
  Clock,
} from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import { Header } from "@/components/shared/Header"
import { MemoView } from "@/components/memo/MemoView"
import { SessionView } from "@/components/session/SessionView"
import { AppMode, ViewMode, CategoryConfig } from "@/types"
import { fetchUser, handleLogout, fetchCustomCategories } from "@/lib/api"

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

function MemoSessionApp() {
  const [appMode, setAppMode] = useState<AppMode>("memo")
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [timeZone, setTimeZone] = useState<string>("")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>(CATEGORIES)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US"

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimeZone(tz)
    
    const loadData = async () => {
        const userData = await fetchUser();
        setUser(userData);
        const customCategories = await fetchCustomCategories();
        // logic to merge custom categories with default ones
    }
    loadData();

  }, [])

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    const increment = direction === "next" ? 1 : -1

    if (viewMode === "daily") {
      newDate.setDate(newDate.getDate() + increment)
    } else if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + 7 * increment)
    } else if (viewMode === "monthly") {
      newDate.setMonth(newDate.getMonth() + increment)
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
      return `${startOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      })} - ${endOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    } else {
      return currentDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
      })
    }
  }

  return (
    <AuthGuard>
      <div className="bg-black text-white min-h-screen">
        <Header
          appMode={appMode}
          setAppMode={setAppMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentDate={currentDate}
          navigateDate={navigateDate}
          goToToday={goToToday}
          formatDateHeader={formatDateHeader}
          user={user}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          handleLogout={handleLogout}
        />
        <main className="container mx-auto p-4">
          {appMode === 'memo' ? (
            <MemoView
              viewMode={viewMode}
              currentDate={currentDate}
              timeZone={timeZone}
              categories={categories}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              locale={locale}
            />
          ) : (
            <SessionView
              viewMode={viewMode}
              currentDate={currentDate}
              timeZone={timeZone}
              locale={locale}
            />
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

export default MemoSessionApp
