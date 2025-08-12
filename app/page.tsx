"use client"

import { Button } from "@/components/ui/button"
import { Plus, Timer, X } from "lucide-react"
import { useState } from "react"

const Page = () => {
  const [appMode, setAppMode] = useState("session")
  const [showSessionSetup, setShowSessionSetup] = useState(false)
  const [showSessionTimer, setShowSessionTimer] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [sessionSetupData, setSessionSetupData] = useState({
    goal: "",
    subject: "",
    tags: [],
    duration: 25,
  })

  const createNewSession = () => {
    // Logic to create a new session
  }

  return (
    <>
      {appMode === "session" && (
        <>
          {/* Replace + button with session creation button */}
          <button
            onClick={() => setShowSessionSetup(true)}
            className={`rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all ${
              isScrolled ? "w-8 h-8" : "w-10 h-10"
            }`}
          >
            <Plus className={`${isScrolled ? "w-4 h-4" : "w-5 h-5"}`} />
          </button>

          <button
            onClick={() => setShowSessionTimer((prev) => !prev)}
            className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <Timer className="w-5 h-5 text-purple-400" />
          </button>
        </>
      )}

      {/* Add Session Setup Modal */}
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
                <label className="block text-sm font-medium text-white/80 mb-2">목표</label>
                <textarea
                  placeholder="이 세션에서 달성하고 싶은 목표를 입력하세요"
                  value={sessionSetupData.goal}
                  onChange={(e) => setSessionSetupData((prev) => ({ ...prev, goal: e.target.value }))}
                  rows={3}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">주제</label>
                <input
                  type="text"
                  placeholder="세션 주제를 입력하세요"
                  value={sessionSetupData.subject}
                  onChange={(e) => setSessionSetupData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
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
    </>
  )
}

export default Page
