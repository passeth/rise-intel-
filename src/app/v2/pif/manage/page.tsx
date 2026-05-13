'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { useRef } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  bulkUpdateProducts,
  bulkUpdateMsdsTypes,
  fetchMsdsFlammabilitySettings,
  reevaluateFlammabilityByProductCodes,
  updateMsdsFlammabilitySettings,
  updateManageProductStatus,
  fetchManageProducts,
  type PifStatus,
  type ManageSortDirection,
  type ManageSortField,
} from './actions'

const FLAMMABILITY_OPTIONS = [
  { value: 'non_flammable', label: '비인화성' },
  { value: 'caution', label: '주의' },
  { value: 'flammable', label: '인화성' },
] as const

function flammabilityLabel(value: string | null): string {
  const found = FLAMMABILITY_OPTIONS.find((option) => option.value === value)
  return found?.label ?? '-'
}

function flammabilityBadgeClass(value: string | null): string {
  if (value === 'flammable') {
    return 'bg-red-50 text-red-700 border border-red-200'
  }
  if (value === 'caution') {
    return 'bg-amber-50 text-amber-700 border border-amber-200'
  }
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
}

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
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PifStatus>('active')
  const [flammabilityFilter, setFlammabilityFilter] = useState<'all' | 'non_flammable' | 'caution' | 'flammable'>('all')
  const [sortField, setSortField] = useState<ManageSortField>('management_code')
  const [sortDirection, setSortDirection] = useState<ManageSortDirection>('asc')
  const [cosmeticTypeInput, setCosmeticTypeInput] = useState('')
  const [isCosmeticTypePopoverOpen, setIsCosmeticTypePopoverOpen] = useState(false)
  const [msdsTypeInput, setMsdsTypeInput] = useState('')
  const [isMsdsTypePopoverOpen, setIsMsdsTypePopoverOpen] = useState(false)
  const [flammabilityInput, setFlammabilityInput] = useState<'non_flammable' | 'caution' | 'flammable'>('non_flammable')
  const [isFlammabilityPopoverOpen, setIsFlammabilityPopoverOpen] = useState(false)
  const [cautionThresholdInput, setCautionThresholdInput] = useState('1')
  const [flammableThresholdInput, setFlammableThresholdInput] = useState('24')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()

  const { data: thresholdSettings } = useQuery({
    queryKey: ['msds-flammability-settings'],
    queryFn: fetchMsdsFlammabilitySettings,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['pif-manage-products', search, page, status, flammabilityFilter, sortField, sortDirection],
    queryFn: () =>
      fetchManageProducts(search, page, PAGE_SIZE, {
        status,
        flammabilityFilter,
        sortField,
        sortDirection,
      }),
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
      setLastSelectedIndex(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '일괄 수정에 실패했습니다')
    },
  })

  const statusMutation = useMutation({
    mutationFn: updateManageProductStatus,
    onSuccess: (result, variables) => {
      if (!result.success) {
        toast.error(result.error ?? '상태 변경에 실패했습니다')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['pif-manage-products'] })
      queryClient.invalidateQueries({ queryKey: ['pif-products'] })
      toast.success(
        `${result.updatedCount}개 제품을 ${variables.status === 'active' ? 'Active' : 'Inactive'} 상태로 변경했습니다`
      )
      setSelectedProducts(new Set())
      setLastSelectedIndex(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '상태 변경에 실패했습니다')
    },
  })

  const bulkMsdsCsvMutation = useMutation({
    mutationFn: bulkUpdateMsdsTypes,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? 'MSDS 타입 CSV 반영에 실패했습니다')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['pif-manage-products'] })
      toast.success(`${result.updatedCount}개 제품의 MSDS Type을 업데이트했습니다`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'MSDS 타입 CSV 반영에 실패했습니다')
    },
  })

  const reevaluateFlammabilityMutation = useMutation({
    mutationFn: reevaluateFlammabilityByProductCodes,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? '인화성 재평가에 실패했습니다')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['pif-manage-products'] })
      toast.success(`${result.updatedCount}개 제품 인화성 재평가 완료`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '인화성 재평가에 실패했습니다')
    },
  })

  const updateThresholdsMutation = useMutation({
    mutationFn: ({ cautionThreshold, flammableThreshold }: { cautionThreshold: number; flammableThreshold: number }) =>
      updateMsdsFlammabilitySettings(cautionThreshold, flammableThreshold),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? '인화성 기준 저장에 실패했습니다')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['msds-flammability-settings'] })
      toast.success('인화성 기준값이 저장되었습니다')
    },
    onError: (error: Error) => {
      toast.error(error.message || '인화성 기준 저장에 실패했습니다')
    },
  })

  useEffect(() => {
    if (!thresholdSettings) {
      return
    }
    setCautionThresholdInput(String(thresholdSettings.caution_threshold))
    setFlammableThresholdInput(String(thresholdSettings.flammable_threshold))
  }, [thresholdSettings])

  useEffect(() => {
    setLastSelectedIndex(null)
  }, [page, status, search, flammabilityFilter, sortField, sortDirection])

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const statusCounts = data?.statusCounts ?? { active: 0, inactive: 0 }
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

  const renderPagination = () => {
    const pages: number[] = []
    const maxVisible = 7
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

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
    setLastSelectedIndex(null)
  }

  const handleStatusTabChange = (value: string) => {
    setStatus(value === 'inactive' ? 'inactive' : 'active')
    setPage(1)
    setSelectedProducts(new Set())
    setLastSelectedIndex(null)
  }

  const handleToggleSort = (field: ManageSortField) => {
    setPage(1)
    setSelectedProducts(new Set())
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const sortIndicator = (field: ManageSortField): string => {
    if (sortField !== field) {
      return '↕'
    }
    return sortDirection === 'asc' ? '↑' : '↓'
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
    setLastSelectedIndex(null)
  }

  const handleToggleOne = (productCode: string, checked: boolean, index: number) => {
    const next = new Set(selectedProducts)

    if (checked) {
      next.add(productCode)
    } else {
      next.delete(productCode)
    }

    setSelectedProducts(next)
    setLastSelectedIndex(index)
  }

  const handleProductSelectionClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    productCode: string,
    index: number
  ) => {
    if (!event.shiftKey || lastSelectedIndex === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const shouldSelect = !selectedProducts.has(productCode)
    const [from, to] = [lastSelectedIndex, index].sort((a, b) => a - b)
    const next = new Set(selectedProducts)

    for (const product of products.slice(from, to + 1)) {
      if (shouldSelect) {
        next.add(product.product_code)
      } else {
        next.delete(product.product_code)
      }
    }

    setSelectedProducts(next)
    setLastSelectedIndex(index)
  }

  const handleBulkStatusUpdate = (targetStatus: PifStatus) => {
    if (selectedProducts.size === 0) {
      toast.error('선택된 제품이 없습니다')
      return
    }

    statusMutation.mutate({
      productCodes: Array.from(selectedProducts),
      status: targetStatus,
    })
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

  const handleMsdsTypeBulkUpdate = () => {
    const value = msdsTypeInput.trim()

    if (!value) {
      toast.error('변경할 MSDS Type을 입력해주세요')
      return
    }

    if (selectedProducts.size === 0) {
      toast.error('선택된 제품이 없습니다')
      return
    }

    bulkUpdateMutation.mutate({
      productCodes: Array.from(selectedProducts),
      field: 'msds_type',
      value,
    })

    setIsMsdsTypePopoverOpen(false)
    setMsdsTypeInput('')
  }

  const handleFlammabilityBulkUpdate = () => {
    if (selectedProducts.size === 0) {
      toast.error('선택된 제품이 없습니다')
      return
    }

    bulkUpdateMutation.mutate({
      productCodes: Array.from(selectedProducts),
      field: 'msds_flammability',
      value: flammabilityInput,
    })

    setIsFlammabilityPopoverOpen(false)
  }

  const handleReevaluateSelectedFlammability = () => {
    if (selectedProducts.size === 0) {
      toast.error('선택된 제품이 없습니다')
      return
    }

    reevaluateFlammabilityMutation.mutate(Array.from(selectedProducts))
  }

  const handleSaveThresholds = () => {
    const cautionThreshold = Number.parseFloat(cautionThresholdInput)
    const flammableThreshold = Number.parseFloat(flammableThresholdInput)

    if (!Number.isFinite(cautionThreshold) || !Number.isFinite(flammableThreshold)) {
      toast.error('숫자 기준값을 입력해주세요')
      return
    }

    if (cautionThreshold < 0 || flammableThreshold <= cautionThreshold) {
      toast.error('기준값 확인: 인화성 기준은 주의 기준보다 커야 합니다')
      return
    }

    updateThresholdsMutation.mutate({ cautionThreshold, flammableThreshold })
  }

  const parseDelimitedLine = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      const next = line[i + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          i += 1
          continue
        }
        inQuotes = !inQuotes
        continue
      }

      if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
        continue
      }

      current += char
    }

    result.push(current.trim())
    return result
  }

  const handleMsdsCsvFile = async (file: File) => {
    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length < 2) {
      toast.error('CSV에 데이터 행이 없습니다')
      return
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const header = parseDelimitedLine(lines[0], delimiter).map((value) => value.toLowerCase())
    const productCodeIndex = header.indexOf('product_code')
    const msdsTypeIndex = header.indexOf('msds_type')

    if (productCodeIndex < 0 || msdsTypeIndex < 0) {
      toast.error('CSV 헤더는 product_code, msds_type 이어야 합니다')
      return
    }

    const items = lines
      .slice(1)
      .map((line) => parseDelimitedLine(line, delimiter))
      .map((cols) => ({
        product_code: cols[productCodeIndex] ?? '',
        msds_type: cols[msdsTypeIndex] ?? '',
      }))
      .filter((item) => item.product_code.trim().length > 0 && item.msds_type.trim().length > 0)

    if (items.length === 0) {
      toast.error('유효한 업데이트 행이 없습니다')
      return
    }

    bulkMsdsCsvMutation.mutate(items)
  }

  const handleMsdsCsvInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      await handleMsdsCsvFile(file)
    } catch {
      toast.error('CSV 파일 처리 중 오류가 발생했습니다')
    } finally {
      event.target.value = ''
    }
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
            placeholder="제품코드, 제품명, 관리번호, MSDS Type, 인화성 검색..."
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
        <div className="min-w-[170px]">
          <Select
            value={flammabilityFilter}
            onValueChange={(value) => {
              setFlammabilityFilter(value as 'all' | 'non_flammable' | 'caution' | 'flammable')
              setPage(1)
              setSelectedProducts(new Set())
              setLastSelectedIndex(null)
            }}
          >
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="인화성 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">인화성 전체</SelectItem>
              <SelectItem value="non_flammable">비인화성</SelectItem>
              <SelectItem value="caution">주의</SelectItem>
              <SelectItem value="flammable">인화성</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 border border-[#E5E5E5] bg-white p-3">
        <p className="text-xs text-[#666666]">
          MSDS Type 일괄 관리: CSV 헤더는 <span className="font-mono">product_code,msds_type</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto h-8 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={bulkMsdsCsvMutation.isPending}
        >
          {bulkMsdsCsvMutation.isPending ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              CSV 적용 중
            </>
          ) : (
            <>
              <Upload className="mr-1 h-3.5 w-3.5" />
              MSDS Type CSV 업로드
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleMsdsCsvInputChange}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 border border-[#E5E5E5] bg-white p-3">
        <div className="min-w-[220px]">
          <p className="mb-1 text-xs font-medium text-[#1A1A1A]">주의 기준 알코올 % (&gt;=)</p>
          <Input
            value={cautionThresholdInput}
            onChange={(event) => setCautionThresholdInput(event.target.value)}
            className="h-8 text-xs"
            placeholder="예: 1"
          />
        </div>
        <div className="min-w-[220px]">
          <p className="mb-1 text-xs font-medium text-[#1A1A1A]">인화성 기준 알코올 % (&gt;=)</p>
          <Input
            value={flammableThresholdInput}
            onChange={(event) => setFlammableThresholdInput(event.target.value)}
            className="h-8 text-xs"
            placeholder="예: 24"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 bg-[#1A1A1A] text-white hover:bg-[#333333]"
          onClick={handleSaveThresholds}
          disabled={updateThresholdsMutation.isPending}
        >
          {updateThresholdsMutation.isPending ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              저장 중
            </>
          ) : (
            '인화성 기준 저장'
          )}
        </Button>
        <p className="w-full text-[11px] text-[#666666]">
          인화성 기준 저장은 판정 임계값만 변경합니다. 저장 후 하단의
          <span className="mx-1 font-medium text-[#1A1A1A]">선택 품목 인화성 재평가</span>
          버튼을 눌러야 선택 제품의 알코올%/인화성 값이 새 기준으로 다시 계산됩니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={handleStatusTabChange}>
          <TabsList className="border border-[#E5E5E5] bg-white">
            <TabsTrigger value="active" className="text-xs">
              Active ({statusCounts.active.toLocaleString()})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">
              Inactive ({statusCounts.inactive.toLocaleString()})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666666]">
            {selectedCount.toLocaleString()}개 선택
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkStatusUpdate('active')}
            disabled={selectedCount === 0 || statusMutation.isPending}
            className="h-8 text-xs"
          >
            선택 제품 Active 처리
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkStatusUpdate('inactive')}
            disabled={selectedCount === 0 || statusMutation.isPending}
            className="h-8 text-xs"
          >
            선택 제품 Inactive 처리
          </Button>
        </div>
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
                    <TableHead
                      className="w-32 cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('product_code')}
                    >
                      <span className="inline-flex items-center gap-1">제품코드 {sortIndicator('product_code')}</span>
                    </TableHead>
                    <TableHead
                      className="w-24 cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('management_code')}
                    >
                      <span className="inline-flex items-center gap-1">관리번호 {sortIndicator('management_code')}</span>
                    </TableHead>
                    <TableHead
                      className="min-w-[220px] cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('korean_name')}
                    >
                      <span className="inline-flex items-center gap-1">제품명(국문) {sortIndicator('korean_name')}</span>
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
                    <TableHead
                      className="w-32 cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('msds_type')}
                    >
                      <span className="inline-flex items-center gap-1">MSDS Type {sortIndicator('msds_type')}</span>
                    </TableHead>
                    <TableHead
                      className="w-24 cursor-pointer text-right text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('msds_alcohol_content')}
                    >
                      <span className="inline-flex items-center gap-1">알코올% {sortIndicator('msds_alcohol_content')}</span>
                    </TableHead>
                    <TableHead
                      className="w-24 cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('msds_flammability')}
                    >
                      <span className="inline-flex items-center gap-1">인화성 {sortIndicator('msds_flammability')}</span>
                    </TableHead>
                    <TableHead
                      className="w-24 cursor-pointer text-xs font-semibold text-[#666666]"
                      onClick={() => handleToggleSort('created_date')}
                    >
                      <span className="inline-flex items-center gap-1">작성일자 {sortIndicator('created_date')}</span>
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666]">
                      작성자
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => {
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
                              handleToggleOne(product.product_code, value === true, index)
                            }
                            onClick={(event) =>
                              handleProductSelectionClick(event, product.product_code, index)
                            }
                            aria-label={`${product.product_code} 선택`}
                            className="mx-auto"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-[#1A1A1A]">
                          <Link
                            href={`/v2/pif/${encodeURIComponent(product.product_code)}`}
                            className="text-blue-600 hover:underline"
                          >
                            {product.product_code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          {renderDash(product.management_code)}
                        </TableCell>
                        <TableCell className="max-w-[260px] align-top text-xs text-[#1A1A1A]">
                          <span className="block whitespace-normal break-words leading-5" title={renderDash(product.korean_name)}>
                            {renderDash(product.korean_name)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#666666]">
                          {renderDash(product.semi_product_code)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#666666]">
                          {renderDash(product.p_product_code)}
                        </TableCell>
                        <TableCell className="max-w-[160px] align-top text-xs text-[#666666]">
                          <span className="block whitespace-normal break-words leading-5" title={renderDash(product.cosmetic_type)}>
                            {renderDash(product.cosmetic_type)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] align-top text-xs text-[#666666]">
                          <span className="block whitespace-normal break-words leading-5" title={renderDash(product.msds_type)}>
                            {renderDash(product.msds_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-[#666666]">
                          {product.msds_alcohol_content === null ? '-' : `${product.msds_alcohol_content.toFixed(2)}%`}
                        </TableCell>
                        <TableCell className="text-xs text-[#666666]">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${flammabilityBadgeClass(product.msds_flammability)}`}>
                            {flammabilityLabel(product.msds_flammability)}
                          </span>
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

            <Popover
              open={isMsdsTypePopoverOpen}
              onOpenChange={setIsMsdsTypePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
                >
                  MSDS Type 일괄 변경
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 border-[#E5E5E5] p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#1A1A1A]">새 MSDS Type 입력</p>
                  <Input
                    placeholder="예: Skin care cosmetics"
                    value={msdsTypeInput}
                    onChange={(event) => setMsdsTypeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleMsdsTypeBulkUpdate()
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMsdsTypePopoverOpen(false)}
                      className="h-8"
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleMsdsTypeBulkUpdate}
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

            <Popover
              open={isFlammabilityPopoverOpen}
              onOpenChange={setIsFlammabilityPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
                >
                  인화성 일괄 변경
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 border-[#E5E5E5] p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#1A1A1A]">새 인화성 등급</p>
                  <Select value={flammabilityInput} onValueChange={(value) => setFlammabilityInput(value as 'non_flammable' | 'caution' | 'flammable')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLAMMABILITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFlammabilityPopoverOpen(false)}
                      className="h-8"
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFlammabilityBulkUpdate}
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

            <Button
              size="sm"
              className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
              onClick={handleReevaluateSelectedFlammability}
              disabled={reevaluateFlammabilityMutation.isPending}
            >
              {reevaluateFlammabilityMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  재평가 중
                </>
              ) : (
                '선택 품목 인화성 재평가'
              )}
            </Button>

            <Button
              size="sm"
              className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
              onClick={() => handleBulkStatusUpdate('active')}
              disabled={statusMutation.isPending}
            >
              Active 처리
            </Button>

            <Button
              size="sm"
              className="h-8 bg-white text-[#1A1A1A] hover:bg-[#F1F1F1]"
              onClick={() => handleBulkStatusUpdate('inactive')}
              disabled={statusMutation.isPending}
            >
              Inactive 처리
            </Button>

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
