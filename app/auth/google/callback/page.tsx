"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sparkles, CheckCircle, XCircle, RotateCcw } from "lucide-react"

function GoogleCallbackInner() {
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  const returnedState = searchParams.get("state")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("로그인 처리 중...")

  useEffect(() => {
    const sendCodeToBackend = async () => {
      if (!code || !returnedState) {
        setStatus("error")
        setMessage("인증 정보가 올바르지 않습니다.")
        return
      }

      const storedState = localStorage.getItem("oauth_state")
      if (storedState !== returnedState) {
        console.error("CSRF 경고: state 불일치")
        setStatus("error")
        setMessage("보안 검증에 실패했습니다.")
        return
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
          credentials: "include",
        })

        if (res.ok) {
          setStatus("success")
          setMessage("로그인 성공! 메모 앱으로 이동합니다.")

          // Clean up stored state
          localStorage.removeItem("oauth_state")

          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = "/"
          }, 2000)
        } else {
          const errorData = await res.json().catch(() => ({}))
          setStatus("error")
          setMessage(errorData.message || "로그인에 실패했습니다.")
        }
      } catch (error) {
        console.error("로그인 에러:", error)
        setStatus("error")
        setMessage("네트워크 오류가 발생했습니다.")
      }
    }

    sendCodeToBackend()
  }, [code, returnedState])

  const handleRetry = () => {
    window.location.href = "/login"
  }

  const renderIcon = () => {
    switch (status) {
      case "loading":
        return <RotateCcw className="w-12 h-12 text-blue-400 animate-spin" />
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-400" />
      case "error":
        return <XCircle className="w-12 h-12 text-red-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "loading":
        return "from-blue-500 to-purple-500"
      case "success":
        return "from-green-500 to-emerald-500"
      case "error":
        return "from-red-500 to-pink-500"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Status Icon */}
        <div className="mb-6 flex justify-center">{renderIcon()}</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {status === "loading" && "로그인 처리 중"}
          {status === "success" && "로그인 완료!"}
          {status === "error" && "로그인 실패"}
        </h2>

        {/* Message */}
        <p className="text-white/70 text-base mb-8 leading-relaxed">{message}</p>

        {/* Progress bar for loading */}
        {status === "loading" && (
          <div className="mb-6">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className={`bg-gradient-to-r ${getStatusColor()} h-2 rounded-full animate-pulse`}
                style={{ width: "60%" }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {status === "error" && (
          <button
            onClick={handleRetry}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-6 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:scale-105"
          >
            다시 시도하기
          </button>
        )}

        {status === "success" && <div className="text-white/60 text-sm">잠시 후 자동으로 이동됩니다...</div>}
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white text-lg">로딩 중...</div>
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  )
}
