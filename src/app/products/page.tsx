'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Loader2, ChevronLeft, ChevronRight, Package, Check, X, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/providers/user-provider'
import { fetchLabProducts, updateLabProduct, type LabProductDetail } from './actions'

const PAGE_SIZE = 50

export default function LabProductsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ productCode: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
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

  // Focus input when editing starts
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
    
    let valueToSend: string | number | null = editValue.trim() === '' ? null : editValue

    // specific_gravity: ± 등 특수문자 포함 가능하므로 text로 저장
    // (예: "0.885±0.010")

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
    const currentValue = product[field] as number // assuming 0 or 1
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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">제품표준서</h1>
        <p className="text-sm text-[#999999] mt-1">
          총 <span className="font-semibold text-[#666666]">{totalCount.toLocaleString()}</span>개 품목
        </p>
      </div>

      {/* Search Bar */}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col">
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
                    <TableHead className="sticky left-0 z-20 bg-[#F9F9F9] w-28 text-xs font-semibold text-[#666666] whitespace-nowrap shadow-[1px_0_0_0_#E5E5E5]">
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
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50">
                      <TableCell className="sticky left-0 z-10 bg-white p-2 border-r border-[#E5E5E5] shadow-[1px_0_0_0_#E5E5E5]">
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
    </div>
  )
}
