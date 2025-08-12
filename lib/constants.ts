import { Lightbulb, BookOpen, ShoppingCart, Briefcase, Heart, Clock } from "lucide-react"
import type { CategoryConfig } from "./types"

export const CATEGORIES: Record<string, CategoryConfig> = {
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
