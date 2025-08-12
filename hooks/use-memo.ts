"use client"

import { useState } from "react"
import type { Memo, DailySummary, CustomCategory } from "@/lib/types"
import { apiCall, parseMemo } from "@/lib/api"
import { formatLocalDate } from "@/lib/utils/date"

export const useMemo = (timeZone: string, currentDate: Date) => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: Memo[] }>({})
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: { memo_count: number; has_summary: boolean } }>({})
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])

  const fetchDailySummary = async (dateStr: string) => {
    try {
      const res = await apiCall(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/summary?date=${dateStr}&tz=${encodeURIComponent(timeZone)}`,
      )
      if (res && res.ok) {
        const summary = await res.json()
        setDailySummary(summary)
      } else {
        setDailySummary(null)
      }
    } catch (err) {
      console.error("Error fetching daily summary:", err)
      setDailySummary(null)
    }
  }

  const fetchDailyData = async () => {
    const dateStr = formatLocalDate(currentDate)

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/list?tz=${encodeURIComponent(timeZone)}&start_date=${dateStr}&end_date=${dateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setMemos((data || []).map(parseMemo))
      }
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

        const groupedMemos: { [key: string]: Memo[] } = {}
        parsedMemos.forEach((memo: Memo) => {
          const localMemoDate = formatLocalDate(memo.created_at)
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
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/memo/monthly?tz=${encodeURIComponent(timeZone)}&start_date=${startDateStr}&end_date=${endDateStr}`
      const res = await apiCall(url)
      if (res && res.ok) {
        const data = await res.json()
        setMonthlyData(data || {})
      }
    } catch (err) {
      console.error("Error fetching monthly data:", err)
    }
  }

  const fetchCustomCategories = async () => {
    try {
      const res = await apiCall(`${process.env.NEXT_PUBLIC_API_BASE_URL}/category`)
      if (res && res.ok) {
        const categories = await res.json()
        setCustomCategories(categories || [])
      }
    } catch (err) {
      console.error("Error fetching custom categories:", err)
    }
  }

  return {
    memos,
    setMemos,
    dailySummary,
    weeklyData,
    monthlyData,
    customCategories,
    setCustomCategories,
    fetchDailyData,
    fetchWeeklyData,
    fetchMonthlyData,
    fetchCustomCategories,
  }
}
