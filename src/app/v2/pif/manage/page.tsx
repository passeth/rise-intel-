'use client'

import { useMemo, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  bulkUpdateProducts,
  fetchManageProducts,
  type ManageProduct,
} from './actions'

const PAGE_SIZE = 50

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('ko-KR')
}

function renderDash(value: string | null): string {
  if (!value || value.trim().length === 0) {
    return '-'
  }

  return value
}

export default function V2PifManagePage() {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [cosmeticTypeInput, setCosmeticTypeInput] = useState('')
  const [isCosmeticTypePopoverOpen, setIsCosmeticTypePopoverOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pif-manage-products', search, page],
    queryFn: () => fetchManageProducts(search, page, PAGE_SIZE),
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: (input: {
      productCodes: string[]
      field: string
      value: string | number | boolean | null
    }) => bulkUpdateProducts(input.productCodes, input.field, input.value),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? '일괄 수정에 실패했습니다')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['pif-manage-products'] })
      toast.success(`${result.updatedCount}개 제품이 업데이트되었습니다`)
      setIsCosmeticTypePopoverOpen(false)
      setCosmeticTypeInput('')
      setSelectedProducts(new Set())
    },
    onError: (error: Error) => {
      toast.error(error.message || '일괄 수정에 실패했습니다')
    },
  })

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const selectedCount = selectedProducts.size

  const allSelected =
    products.length > 0 &&
    products.every((product) => selectedProducts.has(product.product_code))
  const someSelected = products.some((product) =>
    selectedProducts.has(product.product_code)
  )

  const hierarchyRows = useMemo(() => {
    if (selectedProducts.size === 0) {
      return products
    }

    return products.filter((product) => selectedProducts.has(product.product_code))
  }, [products, selectedProducts])

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
      if (start > 2) {
        pages.push(-1)
      }
    }

    for (let value = start; value <= end; value += 1) {
      if (value !== 1 && value !== totalPages) {
        pages.push(value)
      }
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(-2)
      }
      pages.push(totalPages)
    }

    return pages
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    setSelectedProducts(new Set())
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleToggleAll = (checked: boolean) => {
    const next = new Set(selectedProducts)

    for (const product of products) {
      if (checked) {
        next.add(product.product_code)
      } else {
        next.delete(product.product_code)
      }
    }

    setSelectedProducts(next)
  }

  const handleToggleOne = (productCode: string, checked: boolean) => {
    const next = new Set(selectedProducts)

    if (checked) {
      next.add(productCode)
    } else {
      next.delete(productCode)
    }

    setSelectedProducts(next)
  }

  const handleCosmeticTypeBulkUpdate = () => {
    const value = cosmeticTypeInput.trim()

    if (!value) {
      toast.error('변경할 화장품유형을 입력해주세요')
      return
    }

    if (selectedProducts.size === 0) {
      toast.error('선택된 제품이 없습니다')
      return
    }

    bulkUpdateMutation.mutate({
      productCodes: Array.from(selectedProducts),
      field: 'cosmetic_type',
      value,
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#666666]">
          <span>PIF</span>
          <span className="text-[#999999]">&gt;</span>
          <span>제품 리스트</span>
          <span className="text-[#999999]">&gt;</span>
          <span className="font-medium text-[#1A1A1A]">제품 관리</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">제품 관리</h1>
        <p className="mt-1 text-sm text-[#999999]">
          멀티셀렉 후 일괄 상태 변경, 브랜드 매칭 등 관리 기능
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 border border-[#E5E5E5] bg-white p-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
          />
          <Input
            placeholder="제품코드, 제품명, 관리번호 검색..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
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

      <div className="border border-[#E5E5E5] bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto mb-3 text-[#E5E5E5]" />
            <p className="text-sm text-[#999999]">
              {search ? '검색 결과가 없습니다' : '등록된 품목이 없습니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader className="bg-[#F9F9F9]">
                  <TableRow className="border-b border-[#E5E5E5]">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={(value) => handleToggleAll(value === true)}
                        aria-label="전체 선택"
                        className="mx-auto"
                      />
                    </TableHead>
                    <TableHead className="w-32 text-xs font-semibold text-[#666666]">
                      제품코드
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666]">
                      관리번호
                    </TableHead>
                    <TableHead className="min-w-[220px] text-xs font-semibold text-[#666666]">
                      제품명(국문)
                    </TableHead>
                    <TableHead className="w-32 text-xs font-semibold text-[#666666]">
                      반제품코드
                    </TableHead>
                    <TableHead className="w-32 text-xs font-semibold text-[#666666]">
                      P제품코드
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666]">
                      화장품유형
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666]">
                      작성일자
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666]">
                      작성자
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const checked = selectedProducts.has(product.product_code)

                    return (
                      <TableRow
                        key={product.product_code}
                        className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50"
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              handleToggleOne(product.product_code, value === true)
                            }
                            aria-label={`${product.product_code} 선택`}
                            className="mx-auto"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-[#1A1A1A]">
                          {product.product_code}
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          {renderDash(product.management_code)}
                        </TableCell>
                        <TableCell className="text-xs text-[#1A1A1A]">
                          {renderDash(product.korean_name)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#666666]">
                          {renderDash(product.semi_product_code)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#666666]">
                          {renderDash(product.p_product_code)}
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          {renderDash(product.cosmetic_type)}
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          {formatDate(product.created_date)}
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          {renderDash(product.author)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#F9F9F9]/50 px-4 py-3">
                <p className="text-xs text-[#999999]">
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString()}-
                  {Math.min(page * PAGE_SIZE, totalCount).toLocaleString()} /{' '}
                  {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={!hasPrev}
                    className="h-8 w-8"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  {renderPagination().map((value, index) =>
                    value < 0 ? (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#999999]">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={value}
                        variant={value === page ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setPage(value)}
                        className={`h-8 w-8 text-xs ${
                          value === page ? 'bg-[#1A1A1A] text-white' : ''
                        }`}
                      >
                        {value}
                      </Button>
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((prev) => prev + 1)}
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

      <section className="mt-6 border border-[#E5E5E5] bg-white">
        <div className="border-b border-[#E5E5E5] bg-[#F9F9F9] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">제품 계층 연결</h2>
          <p className="mt-1 text-xs text-[#999999]">
            완제품 - P제품 - 반제품 연결 구조를 확인합니다
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full border-collapse">
            <TableHeader className="bg-white">
              <TableRow className="border-b border-[#E5E5E5]">
                <TableHead className="w-36 text-xs font-semibold text-[#666666]">
                  완제품코드
                </TableHead>
                <TableHead className="w-36 text-xs font-semibold text-[#666666]">
                  P제품코드
                </TableHead>
                <TableHead className="w-36 text-xs font-semibold text-[#666666]">
                  반제품코드
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchyRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-3 py-10 text-center text-xs text-[#999999]">
                    표시할 계층 연결 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                hierarchyRows.map((product: ManageProduct) => (
                  <TableRow
                    key={`${product.product_code}-hierarchy`}
                    className="border-b border-[#E5E5E5]"
                  >
                    <TableCell className="font-mono text-xs text-[#1A1A1A]">
                      {product.product_code}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#666666]">
                      {renderDash(product.p_product_code)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#666666]">
                      {renderDash(product.semi_product_code)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#333333] bg-[#1A1A1A] px-4 py-3 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.2)]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-medium">{selectedCount}개 선택됨</span>

            <Popover
              open={isCosmeticTypePopoverOpen}
              onOpenChange={setIsCosmeticTypePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
                >
                  화장품유형 일괄 변경
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 border-[#E5E5E5] p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#1A1A1A]">새 화장품유형 입력</p>
                  <Input
                    placeholder="예: 스킨케어"
                    value={cosmeticTypeInput}
                    onChange={(event) => setCosmeticTypeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleCosmeticTypeBulkUpdate()
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCosmeticTypePopoverOpen(false)}
                      className="h-8"
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCosmeticTypeBulkUpdate}
                      disabled={bulkUpdateMutation.isPending}
                      className="h-8 bg-[#1A1A1A] text-white hover:bg-[#333333]"
                    >
                      {bulkUpdateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          적용 중
                        </>
                      ) : (
                        '적용'
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled
                    className="h-8 cursor-not-allowed bg-white text-[#1A1A1A] opacity-50"
                  >
                    활성/비활성 전환
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                DB 컬럼 추가 후 활성화
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled
                    className="h-8 cursor-not-allowed bg-white text-[#1A1A1A] opacity-50"
                  >
                    브랜드 일괄 지정
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                DB 컬럼 추가 후 활성화
              </TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProducts(new Set())}
              className="ml-auto h-8 text-white hover:bg-[#333333] hover:text-white"
            >
              <X className="mr-1 h-3.5 w-3.5" /> 선택 해제
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
