'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Beaker,
  ClipboardCheck,
  FolderOpen,
  Rocket,
  Brain,
  Scale,
  ChevronDown,
  Users,
} from 'lucide-react'
import { useState } from 'react'

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

const navItems: NavItem[] = [
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
      { title: 'BOM 업로드', href: '/products/bom' },
      { title: 'CPNP 서류 생성', href: '/v2/pif/cpnp' },
      { title: '업체 서류 현황', href: '/v2/pif/documents/status' },
    ],
  },
  {
    title: '원료관리',
    icon: Beaker,
    children: [
      { title: '원료 리스트', href: '/v2/ingredients' },
      { title: '입고 관리대장', href: '/v2/ingredients/receipts' },
      { title: '원료 문서 등록', href: '/v2/ingredients/documents' },
      { title: '화장품원료 정보조회', href: '/v2/ingredients/registry' },
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

  {
    title: '사용자 관리',
    href: '/v2/admin/users',
    icon: Users,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [menuOverrides, setMenuOverrides] = useState<Record<string, boolean>>({})

  const isActive = (href: string) => {
    if (href === '/' || href === '/v2') {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isChildLinkActive = (href: string, siblings: NavChild[]) => {
    if (pathname === href) {
      return true
    }

    if (!pathname.startsWith(href + '/')) {
      return false
    }

    return !siblings.some(
      (sibling) =>
        sibling.href !== href &&
        (pathname === sibling.href || pathname.startsWith(sibling.href + '/'))
    )
  }

  const isChildActive = (children?: NavChild[]) =>
    children?.some((child) => isChildLinkActive(child.href, children)) ?? false

  const toggleMenu = (title: string, defaultOpen: boolean) => {
    setMenuOverrides((prev) => ({
      ...prev,
      [title]: !(prev[title] ?? defaultOpen),
    }))
  }

  return (
    <aside className={cn('w-[180px] shrink-0 border-r bg-background', className)}>
      <nav className="space-y-0.5 p-2">
        {navItems.map((item) => {
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

          const childActive = isChildActive(item.children)
          const isOpen = menuOverrides[item.title] ?? childActive

          return (
            <div key={item.title}>
              <button
                onClick={() => toggleMenu(item.title, childActive)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  childActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">{item.title}</span>
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
                        isChildLinkActive(child.href, item.children ?? [])
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
