"use client"

import { v4 as uuidv4 } from "uuid"
import { Lightbulb, BookOpen, ShoppingCart, Briefcase, Heart, Sparkles } from "lucide-react"

const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ")

function getGoogleAuthUrl() {
  const state = (typeof window !== "undefined" && uuidv4()) || ""
  if (typeof window !== "undefined") {
    localStorage.setItem("oauth_state", state)
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&response_type=code&redirect_uri=${process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI}&scope=${encodeURIComponent(GOOGLE_SCOPES)}&state=${state}&access_type=offline&prompt=consent`
}

export default function LoginPage() {
  const handleLoginClick = () => {
    const url = getGoogleAuthUrl()
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating category icons */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
          <Lightbulb className="w-6 h-6 text-amber-400" />
        </div>
        <div className="absolute top-32 right-32 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse delay-1000">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <div className="absolute bottom-32 left-32 w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse delay-2000">
          <ShoppingCart className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="absolute bottom-20 right-20 w-11 h-11 bg-violet-500/20 rounded-full flex items-center justify-center animate-pulse delay-3000">
          <Briefcase className="w-5 h-5 text-violet-400" />
        </div>
        <div className="absolute top-1/2 left-16 w-9 h-9 bg-pink-500/20 rounded-full flex items-center justify-center animate-pulse delay-4000">
          <Heart className="w-4 h-4 text-pink-400" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-3 text-white tracking-tight">Quick Memo</h1>

        {/* Subtitle */}
        <p className="mb-8 text-white/70 text-base font-medium leading-relaxed">
          AI가 자동으로 분류하는
          <br />
          스마트한 메모 앱
        </p>

        {/* Features */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
            <span>텍스트, 이미지, 음성 메모 지원</span>
          </div>
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
            <span>AI 자동 카테고리 분류</span>
          </div>
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-red-400 rounded-full" />
            <span>스마트한 메모 정리 기능</span>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLoginClick}
          className="w-full flex justify-center items-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Google로 시작하기</span>
        </button>

        {/* Footer */}
        <p className="mt-6 text-white/50 text-xs">로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.</p>
      </div>
    </div>
  )
}
