import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  features?: string[]
}

export function PlaceholderPage({ title, description, features }: PlaceholderPageProps) {
  return (
    <div className="container mx-auto max-w-[800px] px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider">
            NEW
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{title}</h1>
        </div>
        <p className="text-sm text-[#999999]">{description}</p>
      </div>

      <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#F9F9F9] p-8 text-center">
        <Construction className="h-10 w-10 text-[#E5E5E5] mx-auto mb-4" />
        <p className="text-sm font-medium text-[#666666] mb-1">준비 중</p>
        <p className="text-xs text-[#999999]">이 페이지는 현재 개발 중입니다</p>
      </div>

      {features && features.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">예정 기능</h2>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#666666]">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#E5E5E5] shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
