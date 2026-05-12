'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Beaker,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  ChevronDown,
  Brain,
  Scale,
  ClipboardCheck,
  FolderOpen,
  Rocket,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavChild {
  title: string
  href: string
}

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  children?: NavChild[]
}

// ── v1 메뉴 (기존) ──
const navItemsV1: NavItem[] = [
  {
    title: '홈',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '제품표준서',
    icon: Package,
    children: [
      { title: '제품 목록', href: '/products' },
      { title: '제품 생성/수정', href: '/products/new' },
      { title: 'BOM 업로드', href: '/products/bom' },
    ],
  },
  {
    title: '원료관리',
    icon: Beaker,
    children: [
      { title: '원료 목록', href: '/ingredients' },
      { title: '원료입고 관리대장', href: '/ingredients/receipts' },
    ],
  },
  {
    title: '시험성적서',
    href: '/certificates',
    icon: ClipboardList,
  },
  {
    title: '정제수 관리',
    href: '/purified-water',
    icon: Droplets,
  },
  {
    title: '시험규격',
    href: '/standards',
    icon: FileText,
  },
  {
    title: '성분 인텔리전스',
    icon: FlaskConical,
    children: [
      { title: '인텔리전스 홈', href: '/ingredient-intelligence' },
      { title: '처방 분석', href: '/ingredient-intelligence/analyze-formula' },
    ],
  },
]

// ── v2 메뉴 (리뉴얼) ──
const navItemsV2: NavItem[] = [
  {
    title: '대시보드',
    href: '/v2',
    icon: LayoutDashboard,
  },
  {
    title: 'PIF',
    icon: FolderOpen,
    children: [
      { title: '제품 리스트', href: '/v2/pif' },
      { title: '제품 등록', href: '/v2/pif/new' },
      { title: '제품 관리', href: '/v2/pif/manage' },
      { title: 'CPNP 서류 생성', href: '/v2/pif/cpnp' },
      { title: '업체 서류 현황', href: '/v2/pif/documents/status' },
      { title: 'BOM 업로드', href: '/products/bom' },
    ],
  },
  {
    title: '원료관리',
    icon: Beaker,
    children: [
      { title: '원료 리스트', href: '/v2/ingredients' },
      { title: '입고 관리대장', href: '/v2/ingredients/receipts' },
      { title: '원료 문서 등록', href: '/v2/ingredients/documents' },
      { title: '신규 원료 등록', href: '/v2/ingredients/new' },
    ],
  },
  {
    title: 'QC',
    icon: ClipboardCheck,
    children: [
      { title: '성적서 발급', href: '/v2/qc/certificates' },
      { title: '정제수 관리', href: '/v2/qc/purified-water' },
      { title: '부자재 시험관리', href: '/v2/qc/subsidiary-materials' },
    ],
  },
  {
    title: 'Regulation',
    href: '/v2/regulation',
    icon: Scale,
  },
  {
    title: '신제품 개발',
    href: '/v2/development',
    icon: Rocket,
  },
  {
    title: 'Lab Intel',
    icon: Brain,
    children: [
      { title: 'Daily News', href: '/v2/intel/news' },
      { title: '성분 인텔리전스', href: '/v2/intel/ingredients' },
      { title: 'Product Report', href: '/v2/intel/reports' },
    ],
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [closedMenus, setClosedMenus] = useState<string[]>([])

  // Auto-detect version from route
  const isV2Route = pathname.startsWith('/v2')
  const [version, setVersion] = useState<'v1' | 'v2'>(isV2Route ? 'v2' : 'v1')

  useEffect(() => {
    setVersion(pathname.startsWith('/v2') ? 'v2' : 'v1')
  }, [pathname])

  const handleVersionSwitch = (v: 'v1' | 'v2') => {
    setVersion(v)
    setOpenMenus([])
    setClosedMenus([])
    router.push(v === 'v1' ? '/' : '/v2')
  }

  const activeNavItems = version === 'v1' ? navItemsV1 : navItemsV2

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    )
    setClosedMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === '/' || href === '/v2') {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isChildActive = (children?: { href: string }[]) =>
    children?.some((child) => isActive(child.href))

  return (
    <aside className={cn('w-[180px] shrink-0 border-r bg-background', className)}>
      {/* Version Switcher */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => handleVersionSwitch('v1')}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
              version === 'v1'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Current
          </button>
          <button
            onClick={() => handleVersionSwitch('v2')}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
              version === 'v2'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            New
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 p-2">
        {activeNavItems.map((item) => {
          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          }

          const isOpen = closedMenus.includes(item.title)
            ? openMenus.includes(item.title)
            : openMenus.includes(item.title) || isChildActive(item.children)

          return (
            <div key={item.title}>
              <button
                onClick={() => toggleMenu(item.title)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  isChildActive(item.children)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && item.children && (
                <div className="ml-3 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors',
                        isActive(child.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <span className="truncate">{child.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
