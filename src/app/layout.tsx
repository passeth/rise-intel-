import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { UserProvider } from '@/providers/user-provider'
import { Toaster } from '@/components/ui/sonner'
import { getServerUser } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'

const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

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
      <body className={`${notoSansKR.variable} font-sans antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <UserProvider initialUser={initialUser}>
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
