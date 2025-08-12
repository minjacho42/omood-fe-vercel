"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, X, Plus, Clock, Calendar, Target } from "lucide-react"

interface CircularTimerProps {
  duration: number // in minutes
  timeLeft: number // in seconds
  isRunning: boolean
  isBreak: boolean
  onToggle: () => void
  onReset: () => void
  onCancel?: () => void
  onDurationChange?: (minutes: number) => void
  isSettingMode?: boolean
  sessionTitle?: string
  sessionGoal?: string
  sessionTags?: string[]
  sessionStartTime?: Date
  onStartSession?: (sessionData: {
    subject: string
    goal: string
    duration: number
    tags: string[]
  }) => void
  onOpenSessionModal?: () => void
  currentSession?: {
    status: "pending" | "started" | "paused" | "completed" | "cancelled"
  }
}

export function CircularTimer({
  duration,
  timeLeft,
  isRunning,
  isBreak,
  onToggle,
  onReset,
  onCancel,
  onDurationChange,
  isSettingMode = false,
  sessionTitle = "",
  sessionGoal = "",
  sessionTags = [],
  sessionStartTime,
  onStartSession,
  onOpenSessionModal,
  currentSession,
}: CircularTimerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragAngle, setDragAngle] = useState(0)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showSessionDetail, setShowSessionDetail] = useState(false)
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [localDuration, setLocalDuration] = useState(duration)
  const svgRef = useRef<SVGSVGElement>(null)

  // Session form states
  const [subject, setSubject] = useState("")
  const [goal, setGoal] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  const radius = 120
  const center = 150
  const circumference = 2 * Math.PI * radius

  // 세션이 없거나 pending 상태에서 편집 중일 때만 설정 모드
  const effectiveSettingMode =
    !sessionTitle || (sessionTitle && currentSession?.status === "pending" && isEditingDuration)

  const effectiveDuration = effectiveSettingMode ? localDuration : duration

  // Calculate progress
  const totalSeconds = effectiveDuration * 60
  const remainingProgress = effectiveSettingMode ? 1 : timeLeft / totalSeconds
  const targetAngle = effectiveSettingMode ? dragAngle : (effectiveDuration / 60) * 360
  const remainingAngle = effectiveSettingMode ? dragAngle : remainingProgress * targetAngle

  // Convert angle to minutes
  const angleToMinutes = (angle: number) => {
    const minutes = Math.round((angle / 360) * 60)
    return Math.max(5, Math.min(60, minutes))
  }

  const minAngle = (5 / 60) * 360

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get mouse/touch position relative to center
  const getAngleFromEvent = useCallback((event: MouseEvent | TouchEvent) => {
    if (!svgRef.current) return 0

    const rect = svgRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY

    const x = clientX - centerX
    const y = clientY - centerY

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360

    return angle
  }, [])

  // Handle drag start
  const handleDragStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!effectiveSettingMode) return

      event.preventDefault()
      setIsDragging(true)

      const angle = Math.max(minAngle, getAngleFromEvent(event.nativeEvent as MouseEvent | TouchEvent))
      setDragAngle(angle)
      const newDuration = angleToMinutes(angle)
      setLocalDuration(newDuration)

      // Don't call onDurationChange during drag - only update local state
    },
    [effectiveSettingMode, getAngleFromEvent, minAngle],
  )

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging || !effectiveSettingMode) return

      event.preventDefault()
      const angle = Math.max(minAngle, getAngleFromEvent(event))
      setDragAngle(angle)
      const newDuration = angleToMinutes(angle)
      setLocalDuration(newDuration)

      // Don't call onDurationChange during drag - only update local state
    }

    const handleDragEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove)
      document.addEventListener("mouseup", handleDragEnd)
      document.addEventListener("touchmove", handleDragMove)
      document.addEventListener("touchend", handleDragEnd)
    }

    return () => {
      document.removeEventListener("mousemove", handleDragMove)
      document.removeEventListener("mouseup", handleDragEnd)
      document.removeEventListener("touchmove", handleDragMove)
      document.removeEventListener("touchend", handleDragEnd)
    }
  }, [isDragging, effectiveSettingMode, getAngleFromEvent, minAngle])

  // Initialize drag angle when component mounts
  useEffect(() => {
    const initialAngle = Math.max(minAngle, (localDuration / 60) * 360)
    setDragAngle(initialAngle)
  }, [localDuration, minAngle])

  // Create SVG path for the arc
  const createArcPath = (angle: number) => {
    const startAngle = -90
    const endAngle = startAngle + angle

    const startX = center + radius * Math.cos((startAngle * Math.PI) / 180)
    const startY = center + radius * Math.sin((startAngle * Math.PI) / 180)
    const endX = center + radius * Math.cos((endAngle * Math.PI) / 180)
    const endY = center + radius * Math.sin((endAngle * Math.PI) / 180)

    const largeArcFlag = angle > 180 ? 1 : 0

    if (angle === 360) {
      return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.1} ${center - radius}`
    }

    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`
  }

  const createInnerTickMarks = () => {
    const ticks = []
    for (let i = 0; i < 60; i += 5) {
      const angle = (i / 60) * 360 - 90
      const isMainTick = i % 15 === 0
      const tickLength = isMainTick ? 12 : 6
      const tickWidth = isMainTick ? 2 : 1

      const startRadius = radius - 15
      const endRadius = startRadius - tickLength

      const startX = center + startRadius * Math.cos((angle * Math.PI) / 180)
      const startY = center + startRadius * Math.sin((angle * Math.PI) / 180)
      const endX = center + endRadius * Math.cos((angle * Math.PI) / 180)
      const endY = center + endRadius * Math.sin((angle * Math.PI) / 180)

      ticks.push(
        <line
          key={i}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#9ca3af"
          strokeWidth={tickWidth}
          strokeLinecap="round"
        />,
      )
    }
    return ticks
  }

  const createNumberLabels = () => {
    const labels = []
    for (let i = 0; i < 60; i += 5) {
      const angle = (i / 60) * 360 - 90
      const labelRadius = radius - 35

      const x = center + labelRadius * Math.cos((angle * Math.PI) / 180)
      const y = center + labelRadius * Math.sin((angle * Math.PI) / 180)

      labels.push(
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-bold fill-white/70"
          style={{ fontSize: "12px" }}
        >
          {i}
        </text>,
      )
    }
    return labels
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const addCustomTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      const formattedTag = newTag.trim().startsWith("#") ? newTag.trim() : `#${newTag.trim()}`
      setSelectedTags((prev) => [...prev, formattedTag])
      setNewTag("")
    }
  }

  const handleStartSession = () => {
    if (!subject.trim() || !goal.trim()) {
      return
    }

    // 입력 필드에 내용이 있으면 자동으로 태그에 추가
    const finalTags = [...selectedTags]
    if (newTag.trim()) {
      const formattedTag = newTag.trim().startsWith("#") ? newTag.trim() : `#${newTag.trim()}`
      if (!finalTags.includes(formattedTag)) {
        finalTags.push(formattedTag)
      }
    }

    if (onStartSession) {
      onStartSession({
        subject,
        goal,
        duration: localDuration,
        tags: finalTags,
      })
    }

    // Reset form
    setSubject("")
    setGoal("")
    setSelectedTags([])
    setNewTag("")
    setShowSessionModal(false)
  }

  const handleNewSessionClick = () => {
    setShowSessionModal(true)
  }

  const handleSessionTitleClick = () => {
    if (sessionTitle) {
      setShowSessionDetail(true)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto relative">
      {/* Timer Container - 빨간색 테마 적용 */}
      <div className="relative mb-6">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-6 relative mx-auto">
          {/* Session Title or New Session Button */}
          <div className="absolute top-4 left-4 z-10">
            {sessionTitle ? (
              <button
                onClick={handleSessionTitleClick}
                className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/20 rounded-xl px-3 py-2 shadow-md max-w-32 transition-all duration-200 hover:scale-105"
              >
                <div className="text-sm font-bold text-white truncate">{sessionTitle}</div>
                <div className="text-xs text-white/70 mt-1">상세보기</div>
              </button>
            ) : (
              <button
                onClick={handleNewSessionClick}
                className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/20 rounded-xl p-3 shadow-md transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Digital Time Display */}
          <div className="absolute top-4 right-4 z-10">
            <div className="backdrop-blur-md bg-black/30 border border-white/20 rounded-xl px-4 py-2 shadow-lg">
              <div className="text-xl font-mono font-bold text-white text-center">
                {effectiveSettingMode ? `${localDuration}분` : formatTime(timeLeft)}
              </div>
              <div className="text-xs text-white/70 text-center">
                {effectiveSettingMode ? "설정" : isBreak ? "휴식" : "집중"}
              </div>
              {/* 수정 버튼 - pending 상태에서만 표시 */}
              {sessionTitle && currentSession?.status === "pending" && !isEditingDuration && (
                <button
                  onClick={() => {
                    setIsEditingDuration(true)
                    setLocalDuration(duration)
                    setDragAngle((duration / 60) * 360)
                  }}
                  className="mt-2 w-full px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-all"
                >
                  수정하기
                </button>
              )}
              {/* 수정 완료/취소 버튼 */}
              {isEditingDuration && (
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => {
                      // Only call onDurationChange when completing the edit
                      if (onDurationChange) {
                        onDurationChange(localDuration)
                      }
                      setIsEditingDuration(false)
                    }}
                    className="flex-1 px-2 py-1 bg-green-500/30 hover:bg-green-500/40 rounded-lg text-xs text-white transition-all"
                  >
                    완료
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingDuration(false)
                      setLocalDuration(duration)
                      setDragAngle((duration / 60) * 360)
                    }}
                    className="flex-1 px-2 py-1 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-xs text-white transition-all"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timer Face */}
          <div className="relative w-full h-full flex items-center justify-center py-8">
            <svg
              ref={svgRef}
              width="300"
              height="300"
              className={`${effectiveSettingMode ? "cursor-pointer" : ""} touch-none`}
              style={{ touchAction: "none" }}
              onMouseDownCapture={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragStart(e)
              }}
              onTouchStartCapture={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragStart(e)
              }}
            >
              <defs>
                <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                  <feOffset dx="2" dy="2" result="offset" />
                  <feFlood floodColor="#000000" floodOpacity="0.2" />
                  <feComposite in2="offset" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
                </filter>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#dc2626" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#16a34a" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#15803d" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="rgba(255, 255, 255, 0.1)"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={3}
                filter="url(#innerShadow)"
              />

              {/* Tick marks */}
              {createInnerTickMarks()}

              {/* Number labels */}
              {createNumberLabels()}

              {/* Progress arc - 빨간색/초록색 그라데이션 */}
              <path
                d={createArcPath(remainingAngle)}
                fill={isBreak ? "url(#breakGradient)" : "url(#focusGradient)"}
                opacity={0.9}
                filter="url(#dropShadow)"
              />

              {/* Center knob */}
              <circle
                cx={center}
                cy={center}
                r={15}
                fill="rgba(255, 255, 255, 0.2)"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth={3}
                filter="url(#dropShadow)"
              />

              {/* Drag handle (setting mode only) - 빨간색 */}
              {effectiveSettingMode && (
                <circle
                  cx={center + radius * Math.cos(((dragAngle - 90) * Math.PI) / 180)}
                  cy={center + radius * Math.sin(((dragAngle - 90) * Math.PI) / 180)}
                  r="12"
                  fill={isBreak ? "#22c55e" : "#ef4444"}
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth="3"
                  className="cursor-grab active:cursor-grabbing"
                  filter="url(#dropShadow)"
                />
              )}
            </svg>

            {/* Center Content - Status or Instructions */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center">
                {effectiveSettingMode ? (
                  <div className="text-sm text-white/80">
                    <div className="font-semibold mb-1">드래그로 시간 설정</div>
                    <div className="text-xs">5분 ~ 60분</div>
                  </div>
                ) : (
                  <div className="text-lg font-semibold text-white">{isRunning ? "진행 중" : "대기 중"}</div>
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons - 빨간색 테마 적용 */}
          <div className="flex justify-center gap-4 mt-4">
            {/* Start/Pause Button - 빨간색 */}
            <button
              onClick={sessionTitle ? onToggle : handleNewSessionClick}
              className="w-14 h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              {sessionTitle && isRunning ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={onReset}
              disabled={!sessionTitle}
              className="w-14 h-14 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 rounded-full shadow-lg border border-white/20 flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>

            {/* Stop/Cancel Button - 더 진한 빨간색 */}
            <button
              onClick={onCancel}
              disabled={!sessionTitle}
              className="w-14 h-14 bg-red-600/30 hover:bg-red-600/40 disabled:bg-white/10 disabled:opacity-50 rounded-full shadow-lg border border-red-500/40 flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Session Setup Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                {/* <h2 className="text-2xl font-bold text-white">🍅 새 세션 설정</h2> */}
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Current Timer Setting Display */}
              {/* <div className="mb-6 p-4 bg-white/10 border border-white/20 rounded-xl text-center">
                <div className="text-sm text-white/70 mb-1">설정된 시간</div>
                <div className="text-3xl font-bold text-white mb-1">{localDuration}분</div>
                <div className="text-xs text-white/60 mt-1">타이머를 드래그해서 조정하세요</div>
              </div> */}

              {/* Subject Input */}
              <div className="mb-4">
                <Label htmlFor="subject" className="text-base font-semibold text-white">
                  주제
                </Label>
                <Input
                  id="subject"
                  placeholder="예: JWT refresh token 로직 작성"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/60"
                />
              </div>

              {/* Goal Input */}
              <div className="mb-4">
                <Label htmlFor="goal" className="text-base font-semibold text-white">
                  목표
                </Label>
                <Textarea
                  id="goal"
                  placeholder="예: /login 테스트까지 완료"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={2}
                  className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/60"
                />
              </div>

              {/* Tags */}
              <div className="mb-4">
                <Label className="text-base font-semibold mb-3 block text-white">태그</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="새 태그 입력..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addCustomTag()}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/60"
                  />
                  <Button
                    onClick={addCustomTag}
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer text-xs bg-white/20 text-white hover:bg-white/30"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons - 빨간색 테마 */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSessionModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  취소
                </Button>
                <Button
                  onClick={handleStartSession}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  disabled={!subject.trim() || !goal.trim()}
                >
                  세션 시작 ({localDuration}분)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {showSessionDetail && sessionTitle && (
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
                    <div className="text-lg font-bold text-white">{sessionTitle}</div>
                  </div>
                </div>

                {/* Goal */}
                {sessionGoal && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white/70 mb-1">목표</div>
                      <div className="text-white">{sessionGoal}</div>
                    </div>
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white/70 mb-1">설정 시간</div>
                    <div className="text-white">{duration}분</div>
                  </div>
                </div>

                {/* Start Time */}
                {sessionStartTime && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white/70 mb-1">시작 시간</div>
                      <div className="text-white">
                        {new Date(sessionStartTime).toLocaleString("ko-KR", {
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
                {sessionTags && sessionTags.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-white/70 mb-2">태그</div>
                    <div className="flex flex-wrap gap-2">
                      {sessionTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs bg-white/20 text-white">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Status */}
                <div className="mt-6 p-4 bg-white/10 border border-white/20 rounded-xl">
                  <div className="text-sm font-semibold text-white/70 mb-2">현재 상태</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">
                      {isBreak ? "휴식 중" : "집중 중"} • {isRunning ? "진행 중" : "일시정지"}
                    </span>
                    <span className="text-2xl font-mono font-bold text-white">{formatTime(timeLeft)}</span>
                  </div>
                </div>
              </div>

              {/* Close Button - 빨간색 테마 */}
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
