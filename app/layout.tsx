import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Omood',
  description: 'Smart memo app for quick input and automatic organization.',
  generator: 'omood.app',
    icons: {
        icon: "/omood.svg",            // 기본 favicon
        shortcut: "/favicon-16x16.png",// 원하는 경우 추가 크기 지정
        apple: "/apple-touch-icon.png",// iOS 홈 화면용
    },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
