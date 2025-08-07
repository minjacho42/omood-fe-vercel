"use client"

interface SessionProgressCircleProps {
  duration: number // 총 시간 (분)
  size?: number // 원의 크기
  className?: string
}

export function SessionProgressCircle({ 
  duration, 
  size = 40, 
  className = "" 
}: SessionProgressCircleProps) {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(duration / 60, 1) // 60분을 최대로 설정
  const strokeDasharray = circumference
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="2"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ef4444"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {/* Duration text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-700">{duration}분</span>
      </div>
    </div>
  )
}
