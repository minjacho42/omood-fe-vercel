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
  onUpdateSession?: (updates: any) => void
  onOpenSessionModal?: () => void
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
  onUpdateSession,
  onOpenSessionModal,
}: CircularTimerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragAngle, setDragAngle] = useState(0)
  const [showSessionDetail, setShowSessionDetail] = useState(false)
  const [localDuration, setLocalDuration] = useState(duration)
  const svgRef = useRef<SVGSVGElement>(null)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editSubject, setEditSubject] = useState(sessionTitle)
  const [editGoal, setEditGoal] = useState(sessionGoal || "")
  const [editTags, setEditTags] = useState<string[]>(sessionTags || [])
  const [editCurrentTag, setEditCurrentTag] = useState("")

  const radius = 120
  const center = 150
  const circumference = 2 * Math.PI * radius

  // 세션이 없을 때만 설정 모드
  const effectiveSettingMode = !sessionTitle
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

  // Handle drag start - only allow when session exists and not running
  const handleDragStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!sessionTitle || isRunning) return

      event.preventDefault()
      setIsDragging(true)

      const angle = Math.max(minAngle, getAngleFromEvent(event.nativeEvent as MouseEvent | TouchEvent))
      setDragAngle(angle)
      const newDuration = angleToMinutes(angle)
      setLocalDuration(newDuration)
    },
    [sessionTitle, isRunning, getAngleFromEvent, minAngle],
  )

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging || !sessionTitle || isRunning) return

      event.preventDefault()
      const angle = Math.max(minAngle, getAngleFromEvent(event))
      setDragAngle(angle)
      const newDuration = angleToMinutes(angle)
      setLocalDuration(newDuration)
    }

    const handleDragEnd = () => {
      if (isDragging && sessionTitle && !isRunning && onUpdateSession) {
        // Update session duration in backend
        onUpdateSession({ duration: localDuration })
      }
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
  }, [isDragging, sessionTitle, isRunning, getAngleFromEvent, minAngle, localDuration, onUpdateSession])

  // Initialize drag angle when component mounts or duration changes
  useEffect(() => {
    const initialAngle = Math.max(minAngle, (duration / 60) * 360)
    setDragAngle(initialAngle)
    setLocalDuration(duration)
  }, [duration, minAngle])

  // Update edit states when session changes
  useEffect(() => {
    setEditSubject(sessionTitle)
    setEditGoal(sessionGoal || "")
    setEditTags(sessionTags || [])
  }, [sessionTitle, sessionGoal, sessionTags])

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

  const addEditTag = () => {
    if (editCurrentTag.trim() && !editTags.includes(editCurrentTag.trim())) {
      const formattedTag = editCurrentTag.trim().startsWith("#") ? editCurrentTag.trim() : `#${editCurrentTag.trim()}`
      setEditTags((prev) => [...prev, formattedTag])
      setEditCurrentTag("")
    }
  }

  const removeEditTag = (index: number) => {
    setEditTags((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEdit = () => {
    if (!editSubject.trim() || !editGoal.trim() || !onUpdateSession) return

    // Add current tag if exists
    const finalTags = [...editTags]
    if (editCurrentTag.trim()) {
      const formattedTag = editCurrentTag.trim().startsWith("#") ? editCurrentTag.trim() : `#${editCurrentTag.trim()}`
      if (!finalTags.includes(formattedTag)) {
        finalTags.push(formattedTag)
      }
    }

    onUpdateSession({
      subject: editSubject.trim(),
      goal: editGoal.trim(),
      tags: finalTags,
    })

    setIsEditing(false)
    setEditCurrentTag("")
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
          {/* Session Title or Edit Button */}
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
              <div className="text-sm text-white/60">세션이 없습니다</div>
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
            </div>
          </div>

          {/* Timer Face */}
          <div className="relative w-full h-full flex items-center justify-center py-8">
            <svg
              ref={svgRef}
              width="300"
              height="300"
              className={`${sessionTitle && !isRunning ? "cursor-pointer" : ""} touch-none`}
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

              {/* Drag handle (when session exists and not running) - 빨간색 */}
              {sessionTitle && !isRunning && (
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
                {!sessionTitle ? (
                  <div className="text-sm text-white/80">
                    <div className="font-semibold mb-1">세션을 생성하세요</div>
                    <div className="text-xs">+ 버튼을 눌러 시작</div>
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
              onClick={onToggle}
              disabled={!sessionTitle}
              className="w-14 h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:bg-gray-500 disabled:opacity-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
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

      {/* Session Detail Modal */}
      {showSessionDetail && sessionTitle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">📋 세션 정보</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setShowSessionDetail(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  {/* Subject Input */}
                  <div>
                    <Label className="text-white/80 text-sm mb-2 block">주제</Label>
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder-white/60"
                    />
                  </div>

                  {/* Goal Input */}
                  <div>
                    <Label className="text-white/80 text-sm mb-2 block">목표</Label>
                    <Textarea
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      rows={3}
                      className="bg-white/10 border-white/20 text-white placeholder-white/60"
                    />
                  </div>

                  {/* Tags Input */}
                  <div>
                    <Label className="text-white/80 text-sm mb-2 block">태그</Label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="새 태그 입력..."
                        value={editCurrentTag}
                        onChange={(e) => setEditCurrentTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addEditTag()}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/60"
                      />
                      <Button
                        onClick={addEditTag}
                        variant="outline"
                        size="sm"
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                      >
                        추가
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editTags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer text-xs bg-white/20 text-white hover:bg-white/30"
                          onClick={() => removeEditTag(index)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      disabled={!editSubject.trim() || !editGoal.trim()}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
