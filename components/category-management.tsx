"use client"

import { useState, useEffect } from "react"
import { X, Plus, Edit3, Trash2, Save, Lightbulb, BookOpen, ShoppingCart, Briefcase, Heart, Clock } from "lucide-react"

interface CustomCategory {
  id: string
  key: string
  name: string
  description: string
  icon: string
  color: string
  user_id: string
  created_at: string
  updated_at: string
}

interface CategoryManagementProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const ICON_OPTIONS = [
  { key: "lightbulb", icon: <Lightbulb className="w-5 h-5" />, name: "아이디어" },
  { key: "book", icon: <BookOpen className="w-5 h-5" />, name: "학습" },
  { key: "shopping-cart", icon: <ShoppingCart className="w-5 h-5" />, name: "쇼핑" },
  { key: "briefcase", icon: <Briefcase className="w-5 h-5" />, name: "업무" },
  { key: "heart", icon: <Heart className="w-5 h-5" />, name: "개인" },
  { key: "clock", icon: <Clock className="w-5 h-5" />, name: "기타" },
]

const COLOR_OPTIONS = [
  "#F59E0B", // amber
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6B7280", // gray
  "#EF4444", // red
  "#14B8A6", // teal
]

export default function CategoryManagement({ isOpen, onClose, onUpdate }: CategoryManagementProps) {
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    icon: "lightbulb",
    color: "#F59E0B",
  })

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories)
      }
    } catch (err) {
      console.error("Error fetching categories:", err)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return

    try {
      const url = editingCategory
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom/${editingCategory.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom`

      const method = editingCategory ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formData.key || formData.name.toLowerCase().replace(/\s+/g, "_"),
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
        }),
        credentials: "include",
      })

      if (res.ok) {
        resetForm()
        fetchCategories()
        onUpdate()
      }
    } catch (err) {
      console.error("Error saving category:", err)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("이 카테고리를 삭제하시겠습니까? (관련 메모들은 '분류중'으로 이동됩니다)")) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/categories/custom/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        fetchCategories()
        onUpdate()
      }
    } catch (err) {
      console.error("Error deleting category:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      key: "",
      name: "",
      description: "",
      icon: "lightbulb",
      color: "#F59E0B",
    })
    setEditingCategory(null)
    setIsCreating(false)
  }

  const startEdit = (category: CustomCategory) => {
    setFormData({
      key: category.key,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
    })
    setEditingCategory(category)
    setIsCreating(true)
  }

  const startCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
      <div className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/10 border-t border-white/20 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-white">카테고리 관리</h3>
          <button onClick={onClose} className="text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCreating ? (
          <>
            {/* Category List */}
            <div className="space-y-3 mb-6">
              {categories.map((category) => {
                const iconComponent =
                  ICON_OPTIONS.find((opt) => opt.key === category.icon)?.icon || ICON_OPTIONS[0].icon

                return (
                  <div key={category.id} className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <div style={{ color: category.color }}>{iconComponent}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium">{category.name}</h4>
                        <p className="text-white/60 text-sm mt-1">{category.description}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(category)}
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add Button */}
            <button
              onClick={startCreate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              <Plus className="w-4 h-4" />새 카테고리 추가
            </button>
          </>
        ) : (
          <div className="space-y-4">
            {/* Create/Edit Form */}
            <div>
              <label className="block text-white/80 text-sm mb-2">카테고리 이름</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60"
                placeholder="예: 운동, 요리, 독서..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">카테고리 설명</label>
              <textarea
                className="w-full p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-white/60 resize-none"
                rows={3}
                placeholder="AI가 메모를 분류할 때 참고할 설명을 입력하세요..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">아이콘</label>
              <div className="grid grid-cols-3 gap-2">
                {ICON_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFormData({ ...formData, icon: option.key })}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                      formData.icon === option.key
                        ? "bg-white/20 border-white/30 text-white"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {option.icon}
                    <span className="text-xs">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">색상</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      formData.color === color ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
              <h4 className="text-white/80 text-sm mb-2">미리보기</h4>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <div style={{ color: formData.color }}>
                    {ICON_OPTIONS.find((opt) => opt.key === formData.icon)?.icon}
                  </div>
                </div>
                <div>
                  <div className="text-white font-medium">{formData.name || "카테고리 이름"}</div>
                  <div className="text-white/60 text-sm">{formData.description || "카테고리 설명"}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.description.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingCategory ? "수정" : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
