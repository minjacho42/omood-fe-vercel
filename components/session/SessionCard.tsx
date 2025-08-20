'use client'

import type React from "react"
import { motion, useAnimation } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import { CheckCircle, Timer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SessionProgressCircle } from "@/components/session-progress-circle"
import { PomodoroSession } from "@/types/index"

interface SessionCardProps {
  session: PomodoroSession
  locale: string
  timeZone: string
  sessionReflections: { [sessionId: string]: string }
  setSessionReflections: React.Dispatch<React.SetStateAction<{ [sessionId: string]: string }>>
  handleReflectionSubmit: (sessionId: string) => Promise<void>
  deleteSessionFromBackend: (sessionId: string) => Promise<void>
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  locale,
  timeZone,
  sessionReflections,
  setSessionReflections,
  handleReflectionSubmit,
  deleteSessionFromBackend,
}) => {
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
      bgControls.start({ opacity: 0 })
    }
  }) as any

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteSessionFromBackend(session.id)
  }

  const utcCreated = session.created_at
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
