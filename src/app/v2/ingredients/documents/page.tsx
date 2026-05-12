'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  Search,
  X,
} from 'lucide-react'
import { fetchIngredients, type LabIngredientRow } from '../actions'

const PAGE_SIZE = 50
const FETCH_SIZE = 5000
const EMPTY_INGREDIENTS: LabIngredientRow[] = []

const DOC_CATEGORIES = [
  { key: 'coa_urls' as const, label: 'COA' },
  { key: 'composition_urls' as const, label: 'Composition' },
  { key: 'msds_en_urls' as const, label: 'MSDS-EN' },
  { key: 'msds_kr_urls' as const, label: 'MSDS-KR' },
  { key: 'fragrance_urls' as const, label: '향료' },
  { key: 'other_urls' as const, label: '기타' },
] as const

function getTotalDocCount(item: LabIngredientRow): number {
  return DOC_CATEGORIES.reduce((sum, cat) => sum + (item[cat.key]?.length ?? 0), 0)
}

function DocumentModal({
  ingredient,
  onClose,
}: {
  ingredient: LabIngredientRow
  onClose: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewFileName = previewUrl
    ? decodeURIComponent(previewUrl.split('/').pop() || 'document')
    : ''

  const firstCategoryWithDocs = DOC_CATEGORIES.find(
    (cat) => (ingredient[cat.key]?.length ?? 0) > 0
  )
  const defaultTab = firstCategoryWithDocs?.key ?? 'coa_urls'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="max-w-3xl sm:max-w-3xl w-[85vw] max-h-[80vh] flex flex-col p-0 border border-[#E5E5E5]"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <DialogHeader className="px-5 py-3 border-b border-[#E5E5E5] bg-[#F9F9F9] flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-[#1A1A1A]">
              <span className="font-mono text-[#666666] mr-2">
                {ingredient.ingredient_code}
              </span>
              {ingredient.ingredient_name} - 관련 문서
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#999999] hover:text-[#1A1A1A]"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full justify-start bg-[#F9F9F9] p-1 mb-4 h-auto flex-wrap">
              {DOC_CATEGORIES.map((cat) => {
                const count = ingredient[cat.key]?.length ?? 0
                return (
                  <TabsTrigger
                    key={cat.key}
                    value={cat.key}
                    className="text-xs px-3 py-1.5 h-8"
                  >
                    {cat.label}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {count}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {DOC_CATEGORIES.map((cat) => {
              const docs = ingredient[cat.key] ?? []
              return (
                <TabsContent key={cat.key} value={cat.key}>
                  {docs.length === 0 ? (
                    <div className="text-sm text-[#999999] py-8 text-center bg-[#F9F9F9] rounded-md border border-[#E5E5E5]">
                      등록된 문서가 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {docs.map((url, idx) => {
                        const fileName = decodeURIComponent(
                          url.split('/').pop() || 'document'
                        )

                        return (
                          <div
                            key={idx}
                            className="border border-[#E5E5E5] rounded-lg p-3 bg-white flex items-center justify-between shadow-sm hover:border-[#999999] transition-colors cursor-pointer"
                            onClick={() => setPreviewUrl(url)}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-[#F9F9F9] text-[#666666] p-1.5 rounded border border-[#E5E5E5]">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-xs font-medium truncate text-[#1A1A1A]"
                                  title={fileName}
                                >
                                  {fileName}
                                </div>
                                <div className="text-[10px] text-[#999999]">PDF</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#999999] hover:text-[#1A1A1A] flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(url, '_blank')
                              }}
                            >
                              <ExternalLink size={13} />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      </DialogContent>

      {previewUrl && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPreviewUrl(null)
          }}
        >
          <DialogContent
            className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col border border-[#E5E5E5]"
            showCloseButton={false}
            aria-describedby={undefined}
          >
            <DialogHeader className="px-4 py-3 border-b border-[#E5E5E5] bg-[#F9F9F9] flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-sm font-medium truncate pr-4 text-[#1A1A1A]">
                  {previewFileName}
                </DialogTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[#666666] hover:text-[#1A1A1A]"
                    asChild
                  >
                    <a href={previewUrl} download>
                      <Download size={14} className="mr-1" /> 다운로드
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[#666666] hover:text-[#1A1A1A]"
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    <ExternalLink size={14} className="mr-1" /> 새창
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#999999] hover:text-[#1A1A1A]"
                    onClick={() => setPreviewUrl(null)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={previewFileName}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

export default function V2IngredientsDocumentsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showOnlyWithDocs, setShowOnlyWithDocs] = useState(true)
  const [docModalItem, setDocModalItem] = useState<LabIngredientRow | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['v2-ingredients-documents', search],
    queryFn: () => fetchIngredients(search, 1, FETCH_SIZE),
    placeholderData: (previousData) => previousData,
  })

  const allIngredients = data?.ingredients ?? EMPTY_INGREDIENTS

  const filteredIngredients = useMemo(() => {
    if (!showOnlyWithDocs) return allIngredients
    return allIngredients.filter((item) => getTotalDocCount(item) > 0)
  }, [allIngredients, showOnlyWithDocs])

  const totalCount = filteredIngredients.length
  const totalDocCount = useMemo(
    () => filteredIngredients.reduce((sum, item) => sum + getTotalDocCount(item), 0),
    [filteredIngredients]
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const hasNext = safePage < totalPages
  const hasPrev = safePage > 1

  const pagedIngredients = useMemo(() => {
    const from = (safePage - 1) * PAGE_SIZE
    return filteredIngredients.slice(from, from + PAGE_SIZE)
  }, [filteredIngredients, safePage])

  const handleSearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const renderPagination = () => {
    const pages: number[] = []
    const maxVisible = 7
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push(-1)
    }
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) pages.push(i)
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(-2)
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider">
            원료
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">원료 문서 등록</h1>
        </div>
        <p className="text-sm text-[#999999]">
          총 <span className="font-semibold text-[#666666]">{totalCount.toLocaleString()}</span>개 원료,
          문서 <span className="font-semibold text-[#666666]">{totalDocCount.toLocaleString()}</span>건
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex flex-col md:flex-row gap-2 md:items-center mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
          />
          <Input
            placeholder="원료코드, 원료명, 제조사 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
        >
          검색
        </Button>
        <div className="inline-flex rounded-lg border border-[#E5E5E5] p-0.5 bg-[#F9F9F9]">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-xs ${
              !showOnlyWithDocs ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666666]'
            }`}
            onClick={() => {
              setShowOnlyWithDocs(false)
              setPage(1)
            }}
          >
            모든 원료
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-xs ${
              showOnlyWithDocs ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666666]'
            }`}
            onClick={() => {
              setShowOnlyWithDocs(true)
              setPage(1)
            }}
          >
            문서 있는 원료만
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm p-4 md:p-5">
        {isLoading && allIngredients.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : pagedIngredients.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">등록된 문서가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pagedIngredients.map((ingredient) => {
                const docTotal = getTotalDocCount(ingredient)

                return (
                  <Card
                    key={ingredient.id}
                    className="border-[#E5E5E5] shadow-sm hover:shadow-md hover:border-[#999999] transition-all cursor-pointer bg-white"
                    onClick={() => {
                      if (docTotal > 0) setDocModalItem(ingredient)
                    }}
                  >
                    <CardHeader className="pb-3 space-y-1">
                      <div className="text-[11px] font-mono text-[#666666] break-all">
                        {ingredient.ingredient_code}
                      </div>
                      <h3 className="text-sm font-semibold text-[#1A1A1A] leading-snug line-clamp-2">
                        {ingredient.ingredient_name}
                      </h3>
                      <p className="text-[11px] text-[#999999] truncate">
                        {ingredient.manufacturer || '-'}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1.5 min-h-7">
                        {DOC_CATEGORIES.map((cat) => {
                          const count = ingredient[cat.key]?.length ?? 0
                          if (count === 0) return null

                          return (
                            <Badge
                              key={cat.key}
                              variant="outline"
                              className="border-[#E5E5E5] bg-[#F9F9F9] text-[#666666] text-[10px] font-medium"
                            >
                              {cat.label} ({count})
                            </Badge>
                          )
                        })}
                      </div>
                      <div className="flex items-end justify-end">
                        <span className="text-sm font-semibold text-[#1A1A1A]">
                          총 {docTotal}건
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {totalCount > 0 && (
              <div className="flex items-center justify-between px-1 pt-5">
                <p className="text-xs text-[#999999]">
                  {((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(safePage * PAGE_SIZE, totalCount).toLocaleString()} / 총{' '}
                  {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev}
                    className="h-8 w-8"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  {renderPagination().map((p, idx) =>
                    p < 0 ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-[#999999]">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === safePage ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setPage(p)}
                        className={`h-8 w-8 text-xs ${
                          p === safePage ? 'bg-[#1A1A1A] text-white' : ''
                        }`}
                      >
                        {p}
                      </Button>
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
                    className="h-8 w-8"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {isFetching && !isLoading && (
          <div className="mt-3 text-xs text-[#999999] flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            데이터 갱신 중...
          </div>
        )}
      </div>

      {docModalItem && (
        <DocumentModal
          ingredient={docModalItem}
          onClose={() => setDocModalItem(null)}
        />
      )}
    </div>
  )
}
