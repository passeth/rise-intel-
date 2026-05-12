'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  FileText,
  List,
  Globe,
  Layers,
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  Package,
  FileBox,
  AlertTriangle,
  ClipboardList,
  HardDrive,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { fetchLabProducts } from '../../actions'

const PAGE_SIZE = 100

interface DocLink {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  group: string
}

const docLinks: DocLink[] = [
  { href: 'standard', label: '제품표준서', icon: FileText, group: '기본' },
  { href: 'ingredients/ko', label: '국문 성분표', icon: List, group: '성분표' },
  { href: 'ingredients/en', label: '영문 성분표', icon: Globe, group: '성분표' },
  { href: 'ingredients/breakdown', label: '브레이크다운', icon: Layers, group: '성분표' },
  { href: 'ingredients/summary', label: 'INCI 합산', icon: BarChart3, group: '성분표' },
  { href: 'specs/en', label: '영문 성적서', icon: ClipboardCheck, group: '시험' },
  { href: 'specs/semi', label: '반제품 기준', icon: FlaskConical, group: '시험' },
  { href: 'specs/final', label: '완제품 기준', icon: Package, group: '시험' },
  { href: 'raw-materials/coa', label: '원료 COA', icon: FileBox, group: '기타' },
  { href: 'msds', label: 'MSDS', icon: AlertTriangle, group: '기타' },
  { href: 'manufacturing-process', label: '제조공정기록서', icon: ClipboardList, group: '기타' },
  { href: 'subsidiary-materials', label: '부자재 디자인', icon: HardDrive, group: '기타' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { productCode } = useParams<{ productCode: string }>()
  const decodedProductCode = decodeURIComponent(productCode)
  const basePath = `/products/${productCode}/docs`

  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState(initialQ)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ)
  const [page, setPage] = useState(1)

  const activeItemRef = useRef<HTMLAnchorElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)

  // 현재 문서 경로 추출 (encoded/decoded 양쪽 모두 처리)
  const decodedBasePath = `/products/${decodedProductCode}/docs`
  let currentDocPath = 'standard'
  if (pathname === basePath || pathname === decodedBasePath) {
    currentDocPath = '' // 마스터 페이지 (docs/page.tsx)
  } else if (pathname.startsWith(basePath + '/')) {
    currentDocPath = pathname.slice(basePath.length + 1).split('?')[0]
  } else if (pathname.startsWith(decodedBasePath + '/')) {
    currentDocPath = pathname.slice(decodedBasePath.length + 1).split('?')[0]
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['lab-products-sidebar', debouncedSearch, page],
    queryFn: () => fetchLabProducts(debouncedSearch, page, PAGE_SIZE),
  })

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  // 선택된 품목으로 스크롤
  useEffect(() => {
    if (!isLoading && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [isLoading, decodedProductCode])

  // 페이지 변경 시 리스트 맨 위로
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0
    }
  }, [page])

  return (
    <div className="flex gap-0 -mx-4 -my-6 relative" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* 사이드바 토글 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute top-4 z-20 w-7 h-7 bg-white border border-[#E5E5E5] rounded-full flex items-center justify-center text-[#999999] hover:text-[#1A1A1A] hover:border-[#999999] transition-all duration-300 shadow-sm ${
          sidebarOpen ? 'left-[247px]' : 'left-1'
        }`}
        title={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
      >
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
      </button>

      {/* 품목 사이드바 */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } flex-shrink-0 bg-white border-r border-[#E5E5E5] flex flex-col transition-all duration-300 overflow-hidden h-full`}
      >
        {/* 검색 */}
        <div className="p-3 border-b border-[#E5E5E5] flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999999]" />
            <Input
              placeholder="품목 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <p className="text-[10px] text-[#999999] mt-2 px-0.5">
            {isLoading ? '로딩중...' : `${totalCount.toLocaleString()}개 품목`}
          </p>
        </div>

        {/* 품목 리스트 */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-[#999999]" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#999999]">
              {debouncedSearch ? '검색 결과 없음' : '품목 없음'}
            </div>
          ) : (
            <nav className="py-1">
              {products.map((p) => {
                const isActive = p.product_code === decodedProductCode
                const qParam = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ''
                const href = currentDocPath
                  ? `/products/${encodeURIComponent(p.product_code)}/docs/${currentDocPath}${qParam}`
                  : `/products/${encodeURIComponent(p.product_code)}/docs${qParam}`
                return (
                  <Link
                    key={p.product_code}
                    ref={isActive ? activeItemRef : null}
                    href={href}
                    className={`block px-3 py-2 text-xs border-l-2 transition-colors ${
                      isActive
                        ? 'bg-primary/5 border-primary text-primary font-medium'
                        : 'border-transparent text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#999999] block">{p.product_code}</span>
                    <span className="line-clamp-1">{p.korean_name || '—'}</span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#E5E5E5] bg-[#F9F9F9]/50 flex-shrink-0">
            <span className="text-[10px] text-[#999999]">{page}/{totalPages}</span>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" onClick={() => setPage(1)} disabled={!hasPrev} className="h-6 w-6">
                <ChevronsLeft size={12} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPage((p) => p - 1)} disabled={!hasPrev} className="h-6 w-6">
                <ChevronLeft size={12} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className="h-6 w-6">
                <ChevronRight size={12} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPage(totalPages)} disabled={!hasNext} className="h-6 w-6">
                <ChevronsRight size={12} />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 문서 탭 네비게이션 */}
        <div className="flex flex-wrap gap-1 px-6 pt-4 pb-2 border-b border-[#E5E5E5] bg-white flex-shrink-0">
          {docLinks.map((link) => {
            const fullHref = `${basePath}/${link.href}`
            const isActive = pathname === fullHref || pathname.startsWith(fullHref + '/')
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={fullHref}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-[#999999] hover:bg-[#F5F5F5] hover:text-[#666666]'
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* 문서 콘텐츠 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
