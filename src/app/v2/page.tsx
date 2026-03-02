import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, FolderOpen, Beaker, Scale, ClipboardCheck, Rocket, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const sections = [
  {
    href: '/v2/pif',
    title: 'PIF',
    description: '제품 정보 파일 — 관리문서 10종, 일괄 PDF 발급, 디자인 아트웍',
    icon: FolderOpen,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    href: '/v2/ingredients',
    title: '원료관리',
    description: '원료 리스트, 입고 관리, 문서 등록, 신규 원료',
    icon: Beaker,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    href: '/v2/qc/certificates',
    title: 'QC',
    description: '성적서 발급, 정제수 관리, 부자재 시험관리',
    icon: ClipboardCheck,
    color: 'text-teal-600 bg-teal-50',
  },
  {
    href: '/v2/regulation',
    title: 'Regulation',
    description: '다국가 규제 통합 시스템',
    icon: Scale,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    href: '/v2/development',
    title: '신제품 개발',
    description: '개발 중인 제품 연구 상황 대시보드',
    icon: Rocket,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    href: '/v2/intel/ingredients',
    title: 'Lab Intel',
    description: 'Daily News, 성분 인텔리전스, Product Report',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50',
  },
]

export default function V2DashboardPage() {
  return (
    <div className="container mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider">
            NEW
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">RISE INTEL</h1>
        </div>
        <p className="text-sm text-[#999999]">
          화장품 연구 자동화 및 성분 인텔리전스 시스템
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:border-[#1A1A1A]/20 hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${section.color.split(' ')[1]}`}>
                      <Icon className={`h-5 w-5 ${section.color.split(' ')[0]}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#E5E5E5] group-hover:text-[#999999] transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base mb-1.5">{section.title}</CardTitle>
                  <p className="text-xs text-[#999999] leading-relaxed">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
