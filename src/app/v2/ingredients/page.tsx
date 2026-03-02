'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRightIcon,
  Package,
  FileText,
  ExternalLink,
  Download,
  X,
} from 'lucide-react'
import {
  fetchIngredients,
  type LabIngredientRow,
  type SortField,
  type SortDirection,
} from './actions'

const PAGE_SIZE = 50

const DOC_CATEGORIES = [
  { key: 'coa_urls' as const, label: '업체성적서', short: 'COA' },
  { key: 'composition_urls' as const, label: 'Composition', short: 'Comp' },
  { key: 'msds_en_urls' as const, label: 'MSDS (EN)', short: 'EN' },
  { key: 'msds_kr_urls' as const, label: 'MSDS (KR)', short: 'KR' },
  { key: 'fragrance_urls' as const, label: '향료자료', short: '향료' },
  { key: 'other_urls' as const, label: '기타', short: '기타' },
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
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
              <iframe src={previewUrl} className="w-full h-full border-0" title={previewFileName} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDirection
}) {
  if (sortField !== field) {
    return <ChevronsUpDown className="h-3 w-3 text-[#999999]" />
  }
  return sortDir === 'asc' ? (
    <ChevronUp className="h-3 w-3 text-[#1A1A1A]" />
  ) : (
    <ChevronDown className="h-3 w-3 text-[#1A1A1A]" />
  )
}

export default function V2IngredientsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('ingredient_code')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [docModalItem, setDocModalItem] = useState<LabIngredientRow | null>(null)
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['v2-ingredients', search, page, sortField, sortDir],
    queryFn: () => fetchIngredients(search, page, PAGE_SIZE, sortField, sortDir),
    placeholderData: (previousData) => previousData,
  })

  const ingredients = data?.ingredients ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const renderPagination = () => {
    const pages: number[] = []
    const maxVisible = 7
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
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
          <h1 className="text-2xl font-bold text-[#1A1A1A]">원료 리스트</h1>
        </div>
        <p className="text-sm text-[#999999]">
          총 <span className="font-semibold text-[#666666]">{totalCount.toLocaleString()}</span>개 원료
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex gap-2 items-center mb-4">
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
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col max-w-[1400px]">
        {isLoading && ingredients.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : ingredients.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">
              {search ? '검색 결과가 없습니다' : '등록된 원료가 없습니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto relative">
              <Table className="table-fixed min-w-[1300px] border-collapse [&_td]:whitespace-normal [&_td]:break-words [&_td]:[overflow-wrap:anywhere]">
                <TableHeader className="bg-[#F9F9F9] sticky top-0 z-20">
                  <TableRow className="border-b border-[#E5E5E5]">
                    <TableHead
                      className="w-[100px] sticky left-0 z-30 bg-[#F9F9F9] text-xs font-semibold text-[#666666] whitespace-nowrap shadow-[1px_0_0_0_#E5E5E5] cursor-pointer"
                      onClick={() => handleSort('ingredient_code')}
                    >
                      <span className="inline-flex items-center gap-1">
                        원료코드
                        <SortIcon
                          field="ingredient_code"
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[180px] text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('ingredient_name')}
                    >
                      <span className="inline-flex items-center gap-1">
                        원료명
                        <SortIcon
                          field="ingredient_name"
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-[100px] text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('manufacturer')}
                    >
                      <span className="inline-flex items-center gap-1">
                        제조사
                        <SortIcon
                          field="manufacturer"
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead className="w-[160px] text-xs font-semibold text-[#666666] whitespace-nowrap">
                      INCI Name (EN)
                    </TableHead>
                    <TableHead className="w-[160px] text-xs font-semibold text-[#666666] whitespace-nowrap">
                      INCI Name (KR)
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold text-[#666666] whitespace-nowrap">
                      CAS No
                    </TableHead>
                    <TableHead className="w-[50px] text-right text-xs font-semibold text-[#666666] whitespace-nowrap">
                      %
                    </TableHead>
                    <TableHead className="w-[220px] text-center text-xs font-semibold text-[#666666] whitespace-nowrap">
                      문서 현황
                    </TableHead>
                    <TableHead className="w-[32px] text-center text-xs font-semibold text-[#666666] whitespace-nowrap">
                      
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ingredient) => {
                    const components = ingredient.components ?? []
                    const componentCount = Math.max(components.length, 1)
                    const docCount = getTotalDocCount(ingredient)

                    return (
                      <Fragment key={ingredient.id}>
                        {Array.from({ length: componentCount }).map((_, idx) => {
                          const component = components[idx]
                          const isFirst = idx === 0
                          const isLast = idx === componentCount - 1

                          return (
                            <TableRow
                              key={component?.id ?? `${ingredient.id}-${idx}`}
                              className={`hover:bg-[#F9F9F9]/70 cursor-pointer ${
                                isLast
                                  ? 'border-b border-[#E5E5E5]'
                                  : 'border-b border-[#F9F9F9]'
                              }`}
                              onClick={() =>
                                router.push(
                                  `/v2/ingredients/${encodeURIComponent(ingredient.ingredient_code)}`
                                )
                              }
                            >
                              {isFirst && (
                                <>
                                  <TableCell
                                    rowSpan={componentCount}
                                    className="w-[100px] sticky left-0 z-10 bg-white p-2 align-top border-r border-[#E5E5E5] shadow-[1px_0_0_0_#E5E5E5]"
                                  >
                                    <Link
                                      href={`/v2/ingredients/${encodeURIComponent(ingredient.ingredient_code)}`}
                                      className="font-mono text-xs text-[#1A1A1A] hover:underline break-all"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {ingredient.ingredient_code}
                                    </Link>
                                  </TableCell>
                                  <TableCell
                                    rowSpan={componentCount}
                                    className="w-[180px] text-xs text-[#1A1A1A] p-2 align-top break-words"
                                  >
                                    {ingredient.ingredient_name}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={componentCount}
                                    className="w-[100px] text-xs text-[#666666] p-2 align-top break-words"
                                  >
                                    {ingredient.manufacturer || (
                                      <span className="text-[#E5E5E5]">-</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className="w-[160px] py-1.5 text-[11px] text-[#1A1A1A] break-words">
                                {component?.inci_name_en || (
                                  <span className="text-[#E5E5E5]">-</span>
                                )}
                              </TableCell>
                              <TableCell className="w-[160px] py-1.5 text-[11px] text-[#1A1A1A] break-words">
                                {component?.inci_name_kr || (
                                  <span className="text-[#E5E5E5]">-</span>
                                )}
                              </TableCell>
                              <TableCell className="w-[100px] py-1.5 text-[11px] text-[#666666] font-mono break-all">
                                {component?.cas_number || (
                                  <span className="text-[#E5E5E5]">-</span>
                                )}
                              </TableCell>
                              <TableCell className="w-[50px] py-1.5 text-[11px] text-[#1A1A1A] text-right font-mono">
                                {component?.composition_ratio != null ? (
                                  component.composition_ratio.toFixed(1)
                                ) : (
                                  <span className="text-[#E5E5E5]">-</span>
                                )}
                              </TableCell>
                              {isFirst && (
                                <>
                                  <TableCell
                                    rowSpan={componentCount}
                                    className="w-[220px] py-2 align-middle"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (docCount > 0) setDocModalItem(ingredient)
                                    }}
                                  >
                                    {docCount > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {DOC_CATEGORIES.map((cat) => {
                                          const count = ingredient[cat.key]?.length ?? 0
                                          if (count === 0) return null
                                          return (
                                            <span
                                              key={cat.key}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[#F9F9F9] border border-[#E5E5E5] text-[#666666] hover:bg-[#E5E5E5] transition-colors whitespace-nowrap"
                                            >
                                              {cat.short}
                                              <span className="font-semibold text-[#1A1A1A]">{count}</span>
                                            </span>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <span className="text-[#E5E5E5] text-[10px]">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={componentCount}
                                    className="w-[32px] text-center py-2 align-middle"
                                  >
                                    <ChevronRightIcon className="h-4 w-4 text-[#999999] mx-auto" />
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]/50">
                <p className="text-xs text-[#999999]">
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(page * PAGE_SIZE, totalCount).toLocaleString()} / 총{' '}
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
                        variant={p === page ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setPage(p)}
                        className={`h-8 w-8 text-xs ${
                          p === page ? 'bg-[#1A1A1A] text-white' : ''
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
