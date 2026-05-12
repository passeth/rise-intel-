'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronRightIcon, FileText, Download, ExternalLink, X,
} from 'lucide-react'
import { fetchLabIngredients, type LabIngredientRow, type SortField, type SortDirection } from './actions'
import { Card } from '@/components/ui/card'

const PAGE_SIZE = 50

// ── Document category config ──
const DOC_CATEGORIES = [
  { key: 'coa_urls' as const, label: '업체성적서' },
  { key: 'composition_urls' as const, label: 'Composition' },
  { key: 'msds_en_urls' as const, label: 'MSDS (EN)' },
  { key: 'msds_kr_urls' as const, label: 'MSDS (KR)' },
  { key: 'fragrance_urls' as const, label: '향료자료' },
  { key: 'other_urls' as const, label: '기타' },
] as const

function getTotalDocCount(item: LabIngredientRow): number {
  return DOC_CATEGORIES.reduce((sum, cat) => sum + (item[cat.key]?.length ?? 0), 0)
}

// ── Document Modal Component ──
function DocumentModal({
  ingredient,
  onClose,
}: {
  ingredient: LabIngredientRow
  onClose: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewFileName = previewUrl ? decodeURIComponent(previewUrl.split('/').pop() || 'document') : ''

  const firstCategoryWithDocs = DOC_CATEGORIES.find(cat => (ingredient[cat.key]?.length ?? 0) > 0)
  const defaultTab = firstCategoryWithDocs?.key ?? 'coa_urls'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl sm:max-w-3xl w-[85vw] max-h-[80vh] flex flex-col p-0" showCloseButton={false} aria-describedby={undefined}>
        <DialogHeader className="px-5 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-medium">
              <span className="font-mono text-gray-500 mr-2">{ingredient.ingredient_code}</span>
              {ingredient.ingredient_name} — 관련 문서
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full justify-start bg-gray-100/80 p-1 mb-4 h-auto flex-wrap">
              {DOC_CATEGORIES.map(cat => {
                const count = ingredient[cat.key]?.length ?? 0
                return (
                  <TabsTrigger key={cat.key} value={cat.key} className="text-xs px-3 py-1.5 h-8">
                    {cat.label}
                    <span className="ml-1.5 bg-gray-200 text-gray-600 text-[10px] px-1 rounded-sm">{count}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {DOC_CATEGORIES.map(cat => {
              const docs = ingredient[cat.key] ?? []
              return (
                <TabsContent key={cat.key} value={cat.key}>
                  {docs.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-md">등록된 문서가 없습니다.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {docs.map((url, idx) => {
                        const fileName = decodeURIComponent(url.split('/').pop() || 'document')
                        return (
                          <div
                            key={idx}
                            className="border border-gray-200 rounded-lg p-3 bg-white flex items-center justify-between shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setPreviewUrl(url)}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-red-50 text-red-500 p-1.5 rounded">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate" title={fileName}>{fileName}</div>
                                <div className="text-[10px] text-gray-400">PDF</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-blue-600 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); window.open(url, '_blank') }}
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

      {/* Preview Popup */}
      {previewUrl && (
        <Dialog open onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}>
          <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col" showCloseButton={false} aria-describedby={undefined}>
            <DialogHeader className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-sm font-medium truncate pr-4">{previewFileName}</DialogTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-600 hover:text-blue-600" asChild>
                    <a href={previewUrl} download>
                      <Download size={14} className="mr-1" /> 다운로드
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-600 hover:text-blue-600" onClick={() => window.open(previewUrl, '_blank')}>
                    <ExternalLink size={14} className="mr-1" /> 새창
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => setPreviewUrl(null)}>
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

// ── Main Page ──
export default function LabIngredientsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('ingredient_code')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [docModalItem, setDocModalItem] = useState<LabIngredientRow | null>(null)
  const router = useRouter()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['lab-ingredients', debouncedSearch, page, sortField, sortDir],
    queryFn: () => fetchLabIngredients({ search: debouncedSearch, page, pageSize: PAGE_SIZE, sortField, sortDir }),
    placeholderData: (previousData) => previousData,
  })

  const ingredients = data?.ingredients ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-slate-600" />
      : <ChevronDown className="h-3 w-3 text-slate-600" />
  }

  const handleRowClick = (ingredientCode: string) => {
    router.push(`/ingredients/${encodeURIComponent(ingredientCode)}`)
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6 text-[#1A1A1A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            원료 관리
            <span className="text-sm font-normal text-[#666666] bg-[#F9F9F9] px-2 py-1 rounded-full border border-[#E5E5E5]">
              Total {totalCount.toLocaleString()}
            </span>
          </h1>
          <p className="text-[#999999] text-sm mt-1">
            원료 성분 및 COA 문서를 관리합니다.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
          <Input 
            placeholder="원료코드, 원료명, 제조사 검색..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-[#E5E5E5] focus-visible:ring-[#1A1A1A]"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-[#E5E5E5] shadow-sm overflow-hidden bg-white max-w-[1200px]">
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader className="bg-[#F9F9F9]">
              <TableRow className="border-b-[#E5E5E5] hover:bg-[#F9F9F9]">
                <TableHead className="w-[80px] text-xs font-medium text-[#666666] cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('ingredient_code')}>
                  <span className="inline-flex items-center gap-1">원료코드 <SortIcon field="ingredient_code" /></span>
                </TableHead>
                <TableHead className="w-[160px] text-xs font-medium text-[#666666] cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('ingredient_name')}>
                  <span className="inline-flex items-center gap-1">원료명 <SortIcon field="ingredient_name" /></span>
                </TableHead>
                <TableHead className="w-[80px] text-xs font-medium text-[#666666] cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('manufacturer')}>
                  <span className="inline-flex items-center gap-1">제조사 <SortIcon field="manufacturer" /></span>
                </TableHead>

                <TableHead className="w-[120px] text-xs font-medium text-[#666666]">INCI Name (EN)</TableHead>
                <TableHead className="w-[120px] text-xs font-medium text-[#666666]">INCI Name (KR)</TableHead>
                <TableHead className="w-[80px] text-xs font-medium text-[#666666]">CAS No</TableHead>
                <TableHead className="w-[40px] text-right text-xs font-medium text-[#666666]">%</TableHead>
                <TableHead className="w-[50px] text-center text-xs font-medium text-[#666666]">합</TableHead>
                <TableHead className="w-[50px] text-center text-xs font-medium text-[#666666]">문서</TableHead>
                <TableHead className="w-[32px] text-center text-xs font-medium text-[#666666]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && ingredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-[#999999]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>데이터를 불러오는 중...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : ingredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-[#999999]">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                ingredients.map((item) => {
                   const comps = item.components ?? []
                   const rowCount = Math.max(comps.length, 1)
                   const docCount = getTotalDocCount(item)
                   const ratioSum = comps.reduce((sum, c) => sum + (c.composition_ratio ?? 0), 0)

                  return (
                    <Fragment key={item.id}>
                      {Array.from({ length: rowCount }).map((_, idx) => {
                        const comp = comps[idx]
                        const isFirst = idx === 0
                        const isLast = idx === rowCount - 1

                        return (
                          <TableRow
                            key={comp?.id ?? `${item.id}-empty`}
                            className={`
                              hover:bg-slate-50 transition-colors cursor-pointer
                              ${isLast ? 'border-b border-[#E5E5E5]' : 'border-b border-slate-100'}
                            `}
                            onClick={() => handleRowClick(item.ingredient_code)}
                          >
                            {isFirst && (
                              <>
                                <TableCell rowSpan={rowCount} className="whitespace-normal font-mono text-xs text-[#666666] py-2 align-top border-r border-slate-100 break-all">
                                  {item.ingredient_code}
                                </TableCell>
                                <TableCell rowSpan={rowCount} className="whitespace-normal font-medium text-xs text-[#1A1A1A] py-2 align-top border-r border-slate-100 break-words">
                                  {item.ingredient_name}
                                </TableCell>
                                <TableCell rowSpan={rowCount} className="whitespace-normal text-xs text-[#666666] py-2 align-top border-r border-slate-100 break-words">
                                  {item.manufacturer || <span className="text-[#E5E5E5]">—</span>}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="whitespace-normal py-1.5 text-[11px] text-slate-700 break-words">
                              {comp?.inci_name_en || <span className="text-[#E5E5E5]">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-normal py-1.5 text-[11px] text-slate-700 break-words">
                              {comp?.inci_name_kr || <span className="text-[#E5E5E5]">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-normal py-1.5 text-[11px] font-mono text-slate-600 break-all">
                              {comp?.cas_number || <span className="text-[#E5E5E5]">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-normal py-1.5 text-[11px] text-slate-700 text-right font-mono">
                              {comp?.composition_ratio != null
                                ? `${comp.composition_ratio.toFixed(1)}`
                                : <span className="text-[#E5E5E5]">—</span>
                              }
                            </TableCell>
                            {isFirst && (
                              <>
                                <TableCell
                                  rowSpan={rowCount}
                                  className={`text-center py-2 align-middle border-l border-slate-100 text-[11px] font-mono ${
                                    comps.length === 0
                                      ? 'text-[#E5E5E5]'
                                      : Math.abs(ratioSum - 100) < 0.01
                                      ? 'text-slate-700'
                                      : 'text-red-500 font-bold'
                                  }`}
                                >
                                  {comps.length === 0 ? '—' : ratioSum.toFixed(1)}
                                </TableCell>
                                <TableCell
                                  rowSpan={rowCount}
                                  className="text-center py-2 align-middle border-l border-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (docCount > 0) setDocModalItem(item)
                                  }}
                                >
                                  {docCount > 0 ? (
                                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-medium">
                                      <FileText size={12} />
                                      {docCount}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">—</span>
                                  )}
                                </TableCell>
                                <TableCell rowSpan={rowCount} className="text-center py-2 align-middle border-l border-slate-100">
                                  <ChevronRightIcon className="h-4 w-4 text-slate-300 mx-auto" />
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        )
                      })}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[#666666] font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Document Modal */}
      {docModalItem && (
        <DocumentModal ingredient={docModalItem} onClose={() => setDocModalItem(null)} />
      )}
    </div>
  )
}
