import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { UserProvider } from '@/providers/user-provider'
import { Toaster } from '@/components/ui/sonner'
import { getServerUser } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { DevTools } from '@/components/dev-tools'

export const metadata: Metadata = {
  title: 'RISE INTEL',
  description: '화장품 연구 자동화 및 성분 인텔리전스 시스템',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialUser = await getServerUser()

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <UserProvider initialUser={initialUser}>
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
            <DevTools />
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
