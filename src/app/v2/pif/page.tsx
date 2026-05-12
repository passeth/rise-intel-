'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/providers/user-provider'
import {
  fetchPifProducts,
  updatePifProduct,
  updatePifProductStatus,
  type PifProduct,
  type PifStatus,
} from './actions'

const PAGE_SIZE = 50

type ColumnDef = {
  key: keyof PifProduct
  label: string
  width: string
  editable: boolean
}

const columns: ColumnDef[] = [
  { key: 'management_code', label: '관리번호', width: 'w-24', editable: true },
  { key: 'korean_name', label: '제품명(국문)', width: 'min-w-[200px]', editable: true },
  { key: 'english_name', label: '제품명(영문)', width: 'min-w-[200px]', editable: true },
  { key: 'label_volume', label: '표시용량', width: 'w-20', editable: true },
  { key: 'cosmetic_type', label: '화장품유형', width: 'w-28', editable: true },
  { key: 'created_date', label: '작성일자', width: 'w-24', editable: false },
]
export default function V2PifPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PifStatus>('active')
  const [selectedProductCodes, setSelectedProductCodes] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{
    productCode: string
    field: string
  } | null>(null)
  const [editValue, setEditValue] = useState('')

  const editInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { isAdmin } = useUser()

  const { data, isLoading } = useQuery({
    queryKey: ['pif-products', search, page, status],
    queryFn: () => fetchPifProducts(search, page, PAGE_SIZE, status),
  })

  const updateMutation = useMutation({
    mutationFn: updatePifProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pif-products'] })
      toast.success('저장되었습니다')
      setEditingCell(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '저장에 실패했습니다')
    },
  })

  const statusMutation = useMutation({
    mutationFn: updatePifProductStatus,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || '상태 변경에 실패했습니다')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['pif-products'] })
      setSelectedProductCodes(new Set())
      toast.success(`${result.updated}개 제품을 ${result.updated > 0 ? (status === 'active' ? 'inactive' : 'active') : ''} 상태로 변경했습니다`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '상태 변경에 실패했습니다')
    },
  })

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const statusCounts = data?.statusCounts ?? { active: 0, inactive: 0 }
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNext = page < totalPages
  const hasPrev = page > 1
  const selectedCount = selectedProductCodes.size
  const allVisibleSelected =
    products.length > 0 && products.every((product) => selectedProductCodes.has(product.product_code))

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingCell])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    setSelectedProductCodes(new Set())
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const startEditing = (product: PifProduct, field: keyof PifProduct) => {
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

    const product = products.find(
      (p) => p.product_code === editingCell.productCode
    )
    if (!product) return

    const field = editingCell.field as keyof PifProduct
    const original = product[field]
    const newValue: string | null =
      editValue.trim() === '' ? null : editValue

    if ((original === null ? '' : String(original)) === (newValue ?? '')) {
      setEditingCell(null)
      return
    }

    updateMutation.mutate({
      product_code: editingCell.productCode,
      field: editingCell.field,
      value: newValue,
    })
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    else if (e.key === 'Escape') cancelEditing()
  }

  const handleStatusTabChange = (value: string) => {
    setStatus(value === 'inactive' ? 'inactive' : 'active')
    setPage(1)
    setSelectedProductCodes(new Set())
  }

  const toggleProductSelection = (productCode: string, checked: boolean) => {
    const next = new Set(selectedProductCodes)
    if (checked) next.add(productCode)
    else next.delete(productCode)
    setSelectedProductCodes(next)
  }

  const toggleVisibleSelection = (checked: boolean) => {
    const next = new Set(selectedProductCodes)
    for (const product of products) {
      if (checked) next.add(product.product_code)
      else next.delete(product.product_code)
    }
    setSelectedProductCodes(next)
  }

  const bulkTargetStatus: PifStatus = status === 'active' ? 'inactive' : 'active'

  const handleBulkStatusUpdate = () => {
    statusMutation.mutate({
      productCodes: Array.from(selectedProductCodes),
      status: bulkTargetStatus,
    })
  }

  const renderCell = (product: PifProduct, col: ColumnDef) => {
    const isEditing =
      editingCell?.productCode === product.product_code &&
      editingCell?.field === col.key
    const value = product[col.key]

    if (isEditing) {
      return (
        <TableCell key={col.key} className={`p-1 ${col.width}`}>
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
        key={col.key}
        className={`p-2 ${col.width} ${
          col.editable
            ? 'cursor-pointer hover:bg-blue-50/50 transition-colors'
            : ''
        }`}
        onClick={
          col.editable ? () => startEditing(product, col.key) : undefined
        }
      >
        <span
          className={`text-xs ${
            value === null || value === ''
              ? 'text-[#E5E5E5]'
              : 'text-[#1A1A1A]'
          }`}
        >
          {value === null || value === '' ? '—' : String(value)}
        </span>
      </TableCell>
    )
  }

  const renderPagination = () => {
    const pages: number[] = []
    const maxVisible = 7
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible)
      start = Math.max(1, end - maxVisible + 1)
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
            PIF
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">제품 리스트</h1>
        </div>
        <p className="text-sm text-[#999999]">
          총{' '}
          <span className="font-semibold text-[#666666]">
            {totalCount.toLocaleString()}
          </span>
          개 품목
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex gap-2 items-center mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
          />
          <Input
            placeholder="품목코드, 품목명, 관리번호 검색..."
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
        {isAdmin && (
          <Button
            onClick={() => router.push('/v2/pif/new')}
            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus size={16} /> 제품 등록
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs value={status} onValueChange={handleStatusTabChange}>
          <TabsList className="bg-white border border-[#E5E5E5]">
            <TabsTrigger value="active" className="text-xs">
              Active ({statusCounts.active.toLocaleString()})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">
              Inactive ({statusCounts.inactive.toLocaleString()})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666666]">
              {selectedCount.toLocaleString()}개 선택
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkStatusUpdate}
              disabled={selectedCount === 0 || statusMutation.isPending}
              className="h-8 text-xs"
            >
              선택 제품 {bulkTargetStatus === 'active' ? 'Active' : 'Inactive'} 처리
            </Button>
          </div>
        )}
      </div>

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
                    {isAdmin && (
                      <TableHead className="sticky left-0 z-30 bg-[#F9F9F9] w-10 px-2 shadow-[1px_0_0_0_#E5E5E5]">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(value) => toggleVisibleSelection(value === true)}
                          aria-label="현재 페이지 제품 전체 선택"
                          className="h-4 w-4"
                        />
                      </TableHead>
                    )}
                    <TableHead className={`${isAdmin ? 'left-10' : 'left-0'} sticky z-20 bg-[#F9F9F9] w-28 text-xs font-semibold text-[#666666] whitespace-nowrap shadow-[1px_0_0_0_#E5E5E5]`}>
                      제품코드
                    </TableHead>
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`${col.width} text-xs font-semibold text-[#666666] whitespace-nowrap`}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50"
                    >
                      {isAdmin && (
                        <TableCell className="sticky left-0 z-20 bg-white p-2 border-r border-[#E5E5E5] shadow-[1px_0_0_0_#E5E5E5]">
                          <Checkbox
                            checked={selectedProductCodes.has(product.product_code)}
                            onCheckedChange={(value) =>
                              toggleProductSelection(product.product_code, value === true)
                            }
                            aria-label={`${product.product_code} 선택`}
                            className="h-4 w-4"
                          />
                        </TableCell>
                      )}
                      <TableCell className={`${isAdmin ? 'left-10' : 'left-0'} sticky z-10 bg-white p-2 border-r border-[#E5E5E5] shadow-[1px_0_0_0_#E5E5E5]`}>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/v2/pif/${encodeURIComponent(product.product_code)}`}
                            className="font-mono text-xs text-blue-600 hover:underline font-medium truncate"
                          >
                            {product.product_code}
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/v2/pif/new?edit=${encodeURIComponent(product.product_code)}`
                                )
                              }
                              className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded shrink-0"
                              title="수정"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      {columns.map((col) => renderCell(product, col))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]/50">
                <p className="text-xs text-[#999999]">
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(page * PAGE_SIZE, totalCount).toLocaleString()} /{' '}
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
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-xs text-[#999999]"
                      >
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
    </div>
  )
}
