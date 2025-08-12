"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, useDragControls } from "framer-motion"

interface DraggableTimerProps {
  duration: number // in minutes
  onDurationChange?: (newDuration: number) => void
  isRunning?: boolean
  isPaused?: boolean
  onComplete?: () => void
  disabled?: boolean
}

export const DraggableTimer = forwardRef<HTMLDivElement, DraggableTimerProps>(
  ({ duration, onDurationChange, isRunning = false, isPaused = false, onComplete, disabled = false }, ref) => {
    const [timeLeft, setTimeLeft] = useState(duration * 60) // in seconds
    const [isDragging, setIsDragging] = useState(false)
    const dragControls = useDragControls()
    const containerRef = useRef<HTMLDivElement>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useImperativeHandle(ref, () => containerRef.current!)

    // Update timeLeft when duration changes
    useEffect(() => {
      if (!isRunning && !isPaused) {
        setTimeLeft(duration * 60)
      }
    }, [duration, isRunning, isPaused])

    // Timer countdown logic
    useEffect(() => {
      if (isRunning && !isPaused && timeLeft > 0) {
        intervalRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              onComplete?.()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [isRunning, isPaused, timeLeft, onComplete])

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const handleDrag = (event: any, info: any) => {
      if (disabled || isRunning) return

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = info.point.x - centerX
      const deltaY = info.point.y - centerY
      const angle = Math.atan2(deltaY, deltaX)

      // Convert angle to minutes (0-120 minutes range)
      let normalizedAngle = (angle + Math.PI) / (2 * Math.PI)
      if (normalizedAngle < 0) normalizedAngle += 1

      const newDuration = Math.max(1, Math.min(120, Math.round(normalizedAngle * 120)))

      if (newDuration !== duration) {
        onDurationChange?.(newDuration)
      }
    }

    const progress = duration > 0 ? timeLeft / (duration * 60) : 0
    const circumference = 2 * Math.PI * 90 // radius of 90
    const strokeDashoffset = circumference * (1 - progress)

    const getTimerColor = () => {
      if (isRunning) return "stroke-green-400"
      if (isPaused) return "stroke-yellow-400"
      return "stroke-blue-400"
    }

    const getBackgroundColor = () => {
      if (isRunning) return "bg-green-500/10"
      if (isPaused) return "bg-yellow-500/10"
      return "bg-blue-500/10"
    }

    return (
      <div ref={containerRef} className="relative">
        <motion.div
          className={`w-48 h-48 rounded-full ${getBackgroundColor()} border-2 border-white/20 flex items-center justify-center cursor-pointer select-none`}
          drag={!disabled && !isRunning}
          dragControls={dragControls}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onDrag={handleDrag}
          whileHover={!disabled && !isRunning ? { scale: 1.05 } : {}}
          whileTap={!disabled && !isRunning ? { scale: 0.95 } : {}}
        >
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-white/10"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ${getTimerColor()}`}
            />
          </svg>

          {/* Timer display */}
          <div className="text-center z-10">
            <div className="text-3xl font-bold text-white mb-1">{formatTime(timeLeft)}</div>
            <div className="text-sm text-white/70">{duration}분 세션</div>
            {isDragging && !disabled && !isRunning && (
              <div className="text-xs text-white/50 mt-1">드래그하여 시간 조절</div>
            )}
          </div>

          {/* Drag handle indicator */}
          {!disabled && !isRunning && <div className="absolute top-4 right-4 w-3 h-3 bg-white/30 rounded-full" />}
        </motion.div>

        {/* Status indicator */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isRunning
                ? "bg-green-500/20 text-green-400 border border-green-400/30"
                : isPaused
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-400/30"
            }`}
          >
            {isRunning ? "진행중" : isPaused ? "일시정지" : "대기중"}
          </div>
        </div>
      </div>
    )
  },
)

DraggableTimer.displayName = "DraggableTimer"
