'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Loader2, ChevronLeft, ChevronRight, Package, Plus, Pencil, FileText, Download, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/providers/user-provider'
import { fetchLabProducts, updateLabProduct, type LabProductDetail } from './actions'

const PAGE_SIZE = 50

type DocType = 'ingredients_en' | 'formula_breakdown' | 'inci_summary'

const DOC_TYPE_LABELS: Record<DocType, string> = {
  ingredients_en: 'EN Ingredients',
  formula_breakdown: 'Formula Breakdown',
  inci_summary: 'INCI Summary',
}

export default function LabProductsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ productCode: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedDocTypes, setSelectedDocTypes] = useState<Set<DocType>>(
    new Set(['ingredients_en', 'formula_breakdown', 'inci_summary'])
  )
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchDownloading, setBatchDownloading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<string | null>(null)

  const editInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { isAdmin } = useUser()

  const { data, isLoading } = useQuery({
    queryKey: ['lab-products', search, page],
    queryFn: () => fetchLabProducts(search, page, PAGE_SIZE),
  })

  const updateMutation = useMutation({
    mutationFn: updateLabProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-products'] })
      toast.success('저장되었습니다')
      setEditingCell(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '저장에 실패했습니다')
    },
  })

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const allPageSelected = products.length > 0 && products.every(p => selectedProducts.has(p.product_code))
  const somePageSelected = products.some(p => selectedProducts.has(p.product_code))

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingCell])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const toggleSelectAll = useCallback(() => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        products.forEach(p => next.delete(p.product_code))
      } else {
        products.forEach(p => next.add(p.product_code))
      }
      return next
    })
  }, [products, allPageSelected])

  const toggleSelectProduct = useCallback((productCode: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productCode)) {
        next.delete(productCode)
      } else {
        next.add(productCode)
      }
      return next
    })
  }, [])

  const toggleDocType = useCallback((docType: DocType) => {
    setSelectedDocTypes(prev => {
      const next = new Set(prev)
      if (next.has(docType)) {
        if (next.size > 1) next.delete(docType)
      } else {
        next.add(docType)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set())
  }, [])

  const handleBatchGenerate = useCallback(async () => {
    const codes = Array.from(selectedProducts)
    if (codes.length === 0) return

    setBatchGenerating(true)
    setBatchProgress(`${codes.length}개 제품 문서 생성 중...`)

    try {
      const res = await fetch('/api/generate-docs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCodes: codes,
          docTypes: Array.from(selectedDocTypes),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '일괄 생성 실패')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['lab-products'] })

      if (data.failCount > 0) {
        toast.warning(`${data.successCount}개 성공, ${data.failCount}개 실패`)
      } else {
        toast.success(`${data.successCount}개 제품 문서 생성 완료`)
      }
    } catch {
      toast.error('일괄 생성 중 오류가 발생했습니다')
    } finally {
      setBatchGenerating(false)
      setBatchProgress(null)
    }
  }, [selectedProducts, selectedDocTypes, queryClient])

  const handleBatchDownload = useCallback(async () => {
    const codes = Array.from(selectedProducts)
    if (codes.length === 0) return

    setBatchDownloading(true)
    setBatchProgress(`${codes.length}개 제품 문서 다운로드 준비 중...`)

    try {
      const res = await fetch('/api/generate-docs/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCodes: codes,
          docTypes: Array.from(selectedDocTypes),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        toast.error(errorData.error || '다운로드 실패')
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] ?? 'documents.zip'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const warnings = res.headers.get('X-Download-Warnings')
      if (warnings) {
        const parsed = JSON.parse(warnings) as string[]
        if (parsed.length > 0) {
          toast.warning(`${parsed.length}개 파일 누락 (미생성 문서)`)
        }
      }

      toast.success('다운로드 완료')
    } catch {
      toast.error('다운로드 중 오류가 발생했습니다')
    } finally {
      setBatchDownloading(false)
      setBatchProgress(null)
    }
  }, [selectedProducts, selectedDocTypes])

  const startEditing = (product: LabProductDetail, field: keyof LabProductDetail) => {
    const value = product[field]
    setEditingCell({ productCode: product.product_code, field: field as string })
    setEditValue(value === null ? '' : String(value))
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = () => {
    if (!editingCell) return

    const product = products.find(p => p.product_code === editingCell.productCode)
    if (!product) return

    const field = editingCell.field as keyof LabProductDetail
    const originalValue = product[field]

    const valueToSend: string | number | null = editValue.trim() === '' ? null : editValue

    const originalString = originalValue === null ? '' : String(originalValue)
    const currentString = valueToSend === null ? '' : String(valueToSend)

    if (originalString === currentString) {
      setEditingCell(null)
      return
    }

    updateMutation.mutate({
      product_code: editingCell.productCode,
      field: editingCell.field,
      value: valueToSend,
    })
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const toggleValue = (product: LabProductDetail, field: keyof LabProductDetail) => {
    const currentValue = product[field] as number
    const newValue = currentValue === 1 ? 0 : 1

    updateMutation.mutate({
      product_code: product.product_code,
      field: field as string,
      value: newValue,
    })
  }

  const renderCell = (product: LabProductDetail, field: keyof LabProductDetail, type: 'text' | 'number' | 'toggle', className?: string) => {
    const isEditing = editingCell?.productCode === product.product_code && editingCell?.field === field
    const value = product[field]

    if (type === 'toggle') {
      const isChecked = value === 1
      return (
        <TableCell className={`p-2 text-center ${className}`}>
          <div
            className="flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded p-1 w-8 h-8 mx-auto"
            onClick={() => toggleValue(product, field)}
          >
            {isChecked ? (
              <div className="w-5 h-5 rounded-full border border-green-500 flex items-center justify-center bg-green-50">
                <span className="text-green-600 font-bold text-xs">○</span>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center bg-gray-50">
                <span className="text-gray-400 font-bold text-xs">✕</span>
              </div>
            )}
          </div>
        </TableCell>
      )
    }

    if (isEditing) {
      return (
        <TableCell className={`p-1 ${className}`}>
          <Input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleEditKeyDown}
            className="h-7 text-xs px-2 w-full"
            disabled={updateMutation.isPending}
          />
        </TableCell>
      )
    }

    return (
      <TableCell
        className={`p-2 cursor-pointer hover:bg-blue-50/50 transition-colors ${className}`}
        onClick={() => startEditing(product, field)}
      >
        <span className={`text-xs ${value === null || value === '' ? 'text-[#E5E5E5]' : 'text-[#1A1A1A]'}`}>
          {value === null || value === '' ? '—' : String(value)}
        </span>
      </TableCell>
    )
  }

  const isBusy = batchGenerating || batchDownloading

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">제품표준서</h1>
        <p className="text-sm text-[#999999] mt-1">
          총 <span className="font-semibold text-[#666666]">{totalCount.toLocaleString()}</span>개 품목
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
          <Input
            placeholder="품목코드, 품목명, 관리번호 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} className="bg-[#1A1A1A] text-white hover:bg-[#333333]">
          검색
        </Button>
        {isAdmin && (
          <Button
            onClick={() => router.push('/products/new')}
            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus size={16} /> 신규 생성
          </Button>
        )}
      </div>

      <div className={`bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col ${selectedProducts.size > 0 ? 'pb-20' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">
              {search ? '검색 결과가 없습니다' : '등록된 품목이 없습니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto relative">
              <Table className="w-full border-collapse">
                <TableHeader className="bg-[#F9F9F9] sticky top-0 z-20">
                  <TableRow className="border-b border-[#E5E5E5]">
                    <TableHead className="sticky left-0 z-20 bg-[#F9F9F9] w-10 px-2 shadow-[1px_0_0_0_#E5E5E5]">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="전체 선택"
                      />
                    </TableHead>
                    <TableHead className="sticky left-10 z-20 bg-[#F9F9F9] w-28 text-xs font-semibold text-[#666666] whitespace-nowrap shadow-[1px_0_0_0_#E5E5E5]">
                      제품코드
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      관리번호
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold text-[#666666] whitespace-nowrap">
                      제품명(국문)
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold text-[#666666] whitespace-nowrap">
                      제품명(영문)
                    </TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      표시용량
                    </TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      충진용량
                    </TableHead>
                    <TableHead className="w-16 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      비중
                    </TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      pH기준
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      점경도기준
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      권장사용나이
                    </TableHead>
                    <TableHead className="w-16 text-xs font-semibold text-[#666666] whitespace-nowrap text-center">
                      원료보고
                    </TableHead>
                    <TableHead className="w-16 text-xs font-semibold text-[#666666] whitespace-nowrap text-center">
                      표준명칭
                    </TableHead>
                    <TableHead className="w-16 text-xs font-semibold text-[#666666] whitespace-nowrap text-center">
                      책판적용
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      알러지물질
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      사용기한
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      재활용등급
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      문안표기부자재
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      작성일자
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const isSelected = selectedProducts.has(product.product_code)
                    return (
                      <TableRow
                        key={product.id}
                        className={`border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50 ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        <TableCell className="sticky left-0 z-10 bg-white p-2 shadow-[1px_0_0_0_#E5E5E5]">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectProduct(product.product_code)}
                            aria-label={`${product.product_code} 선택`}
                          />
                        </TableCell>
                        <TableCell className="sticky left-10 z-10 bg-white p-2 border-r border-[#E5E5E5] shadow-[1px_0_0_0_#E5E5E5]">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/products/${encodeURIComponent(product.product_code)}/docs`}
                              className="font-mono text-xs text-blue-600 hover:underline font-medium truncate"
                            >
                              {product.product_code}
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() => router.push(`/products/new?edit=${encodeURIComponent(product.product_code)}`)}
                                className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded shrink-0"
                                title="수정"
                              >
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        {renderCell(product, 'management_code', 'text')}
                        {renderCell(product, 'korean_name', 'text')}
                        {renderCell(product, 'english_name', 'text')}
                        {renderCell(product, 'label_volume', 'text')}
                        {renderCell(product, 'fill_volume', 'text')}
                        {renderCell(product, 'specific_gravity', 'text')}
                        {renderCell(product, 'ph_standard', 'text')}
                        {renderCell(product, 'viscosity_standard', 'text')}
                        {renderCell(product, 'recommended_age', 'text')}
                        {renderCell(product, 'raw_material_report', 'toggle')}
                        {renderCell(product, 'standardized_name', 'toggle')}
                        {renderCell(product, 'responsible_seller', 'toggle')}
                        {renderCell(product, 'allergen_korean', 'text')}
                        {renderCell(product, 'shelf_life', 'text')}
                        {renderCell(product, 'recycling_grade', 'text')}
                        {renderCell(product, 'label_position', 'text')}
                        {renderCell(product, 'created_date', 'text')}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]/50">
                <p className="text-xs text-[#999999]">
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, totalCount).toLocaleString()} / {totalCount.toLocaleString()}
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
                  {(() => {
                    const pages: number[] = []
                    const maxVisible = 7
                    let start = Math.max(1, page - Math.floor(maxVisible / 2))
                    let end = Math.min(totalPages, start + maxVisible - 1)
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
                    if (start > 1) { pages.push(1); if (start > 2) pages.push(-1) }
                    for (let i = start; i <= end; i++) { if (i !== 1 && i !== totalPages) pages.push(i) }
                    if (end < totalPages) { if (end < totalPages - 1) pages.push(-2); pages.push(totalPages) }
                    return pages.map((p, idx) =>
                      p < 0 ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-[#999999]">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'ghost'}
                          size="icon"
                          onClick={() => setPage(p)}
                          className={`h-8 w-8 text-xs ${p === page ? 'bg-[#1A1A1A] text-white' : ''}`}
                        >
                          {p}
                        </Button>
                      )
                    )
                  })()}
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

      {selectedProducts.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#1A1A1A] shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-[#1A1A1A] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {selectedProducts.size}
              </div>
              <span className="text-sm font-medium text-[#1A1A1A]">개 선택</span>
            </div>

            <div className="h-6 w-px bg-[#E5E5E5]" />

            <div className="flex items-center gap-2">
              {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => toggleDocType(type)}
                  disabled={isBusy}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                    selectedDocTypes.has(type)
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#999999]'
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-[#E5E5E5]" />

            <div className="flex items-center gap-2 ml-auto">
              {batchProgress && (
                <span className="text-xs text-[#999999] flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  {batchProgress}
                </span>
              )}

              <Button
                onClick={handleBatchGenerate}
                disabled={isBusy}
                className="gap-1.5 bg-[#1A1A1A] text-white hover:bg-[#333333] h-8 text-xs"
              >
                {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                일괄 발급
              </Button>

              <Button
                onClick={handleBatchDownload}
                disabled={isBusy}
                variant="outline"
                className="gap-1.5 h-8 text-xs"
              >
                {batchDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                일괄 다운로드
              </Button>

              <Button
                onClick={clearSelection}
                disabled={isBusy}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#999999] hover:text-[#1A1A1A]"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
