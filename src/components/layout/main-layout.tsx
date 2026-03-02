'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useUser } from '@/providers/user-provider'
import { Loader2 } from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
  /** @deprecated user prop is deprecated. User is now fetched from UserProvider context. */
  user?: {
    name: string
    role: string
  } | null
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  // Public pages that don't require auth
  const isPublicPage = pathname === '/login'
  // Client-side redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push('/login')
    }
  }, [isLoading, user, isPublicPage, router])

  // Public pages: render children directly (no header/sidebar)
  if (isPublicPage) {
    return <>{children}</>
  }
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }
  // If not logged in, show minimal UI while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} user={user} />

      <div className="flex">
        <Sidebar className="hidden md:block h-[calc(100vh-56px)] sticky top-14" />

        {/* 모바일 사이드바 */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[180px] p-0">
            <SheetTitle className="sr-only">메뉴</SheetTitle>
            <div className="py-4">
              <Sidebar />
            </div>
          </SheetContent>
        </Sheet>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  )
}
