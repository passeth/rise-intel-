'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Database, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fetchCosmeticIngredientRegistry,
  type CosmeticIngredientRegistryRow,
} from './actions'

const PAGE_SIZE = 50

function renderDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text.length > 0 ? text : '-'
}

function getPageRange(page: number, pageSize: number, total: number) {
  if (total === 0) return '0-0'
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `${start.toLocaleString()}-${end.toLocaleString()}`
}

function RegistryRow({ row }: { row: CosmeticIngredientRegistryRow }) {
  return (
    <TableRow className="border-[#E5E5E5] hover:bg-[#F9F9F9]">
      <TableCell className="w-20 font-mono text-xs text-[#666666]">
        {row.source_no}
      </TableCell>
      <TableCell className="min-w-48 font-medium text-[#1A1A1A]">
        {row.ingr_kor_name}
      </TableCell>
      <TableCell className="min-w-64 text-[#1A1A1A]">
        {renderDash(row.ingr_eng_name)}
      </TableCell>
      <TableCell className="min-w-40 font-mono text-xs text-[#666666]">
        {renderDash(row.cas_no)}
      </TableCell>
      <TableCell className="min-w-56 text-[#666666]">
        {renderDash(row.ingr_synonym)}
      </TableCell>
      <TableCell className="min-w-[360px] max-w-[520px] text-[#666666]">
        <div className="line-clamp-2" title={row.origin_major_kor_name ?? undefined}>
          {renderDash(row.origin_major_kor_name)}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function CosmeticIngredientRegistryPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cosmetic-ingredient-registry', search, page],
    queryFn: () => fetchCosmeticIngredientRegistry(search, page, PAGE_SIZE),
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const submitSearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#666666]">
            <Database className="h-4 w-4" />
            화장품원료 정보조회
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[#1A1A1A]">
            화장품원료 정보조회 테이블
          </h1>
          <p className="mt-1 text-sm text-[#999999]">
            MFDS 원료 표준명, 영문명, CAS No, 기원 및 이명 데이터를 조회합니다.
          </p>
        </div>

        <form
          className="flex w-full gap-2 md:w-[420px]"
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="표준명, 영문명, CAS No, 이명 검색"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button type="submit" className="h-9 text-xs">
            검색
          </Button>
        </form>
      </div>

      <div className="flex items-center justify-between rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666]">
        <span>
          총 <strong className="text-[#1A1A1A]">{total.toLocaleString()}</strong>건
          {search && <span className="ml-2">검색어: “{search}”</span>}
        </span>
        <span>
          {getPageRange(page, PAGE_SIZE, total)} / {total.toLocaleString()}
          {isFetching && !isLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-[#E5E5E5] bg-white">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#F9F9F9]">
              <TableRow className="border-[#E5E5E5]">
                <TableHead className="w-20 text-xs font-medium text-[#666666]">No</TableHead>
                <TableHead className="min-w-48 text-xs font-medium text-[#666666]">표준명</TableHead>
                <TableHead className="min-w-64 text-xs font-medium text-[#666666]">영문명</TableHead>
                <TableHead className="min-w-40 text-xs font-medium text-[#666666]">CAS No</TableHead>
                <TableHead className="min-w-56 text-xs font-medium text-[#666666]">이명</TableHead>
                <TableHead className="min-w-[360px] text-xs font-medium text-[#666666]">기원 및 정의</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-[#999999]">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-sm text-[#999999]">
                    조회 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => <RegistryRow key={row.id} row={row} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          className="h-8 text-xs"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          이전
        </Button>
        <div className="min-w-24 text-center text-xs text-[#666666]">
          {page.toLocaleString()} / {totalPages.toLocaleString()}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isFetching}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          className="h-8 text-xs"
        >
          다음
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
