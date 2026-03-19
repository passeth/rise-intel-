'use client'

import { Fragment, useMemo, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchSupplierDocumentStatus,
  type MissingDocDetail,
  type SupplierDocumentStatus,
} from '@/app/v2/pif/documents/actions'
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Package,
  Search,
} from 'lucide-react'

const PAGE_SIZE = 20

type CoverageTone = 'green' | 'yellow' | 'red'

type DocType = {
  key: 'COA' | 'MSDS' | 'Composition' | 'IFRA'
  label: string
  countKey: 'coa_count' | 'msds_count' | 'composition_count' | 'ifra_count'
}

const DOC_TYPES: DocType[] = [
  { key: 'COA', label: 'COA', countKey: 'coa_count' },
  { key: 'MSDS', label: 'MSDS', countKey: 'msds_count' },
  { key: 'Composition', label: 'Composition', countKey: 'composition_count' },
  { key: 'IFRA', label: 'IFRA', countKey: 'ifra_count' },
]

function getPaginationPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const maxVisible = 7
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function renderDash(value: string | null): string {
  if (!value || value.trim().length === 0) {
    return '-'
  }

  return value
}

function toCoverage(count: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return (count / total) * 100
}

function getCoverageTone(coverage: number): CoverageTone {
  if (coverage >= 80) {
    return 'green'
  }

  if (coverage >= 50) {
    return 'yellow'
  }

  return 'red'
}

function getCoverageClasses(coverage: number): string {
  const tone = getCoverageTone(coverage)

  if (tone === 'green') {
    return 'bg-green-50 text-green-600'
  }

  if (tone === 'yellow') {
    return 'bg-yellow-50 text-yellow-600'
  }

  return 'bg-red-50 text-red-600'
}

function hasDocument(detail: MissingDocDetail, documentType: DocType['key']): boolean {
  return !detail.missing.includes(documentType)
}

function SummaryCard({
  title,
  value,
  coverage,
}: {
  title: string
  value: string
  coverage?: number
}) {
  return (
    <article className="border border-[#E5E5E5] bg-white p-4 shadow-sm">
      <p className="text-xs text-[#999999]">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
        {typeof coverage === 'number' && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCoverageClasses(
              coverage
            )}`}
          >
            {getCoverageTone(coverage) === 'green'
              ? '양호'
              : getCoverageTone(coverage) === 'yellow'
                ? '보통'
                : '주의'}
          </span>
        )}
      </div>
    </article>
  )
}

function ProductTableEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="py-16 text-center">
      <Package size={48} className="mx-auto mb-3 text-[#E5E5E5]" />
      <p className="text-sm text-[#999999]">
        {hasSearch ? '검색 결과가 없습니다' : '조회 가능한 품목이 없습니다'}
      </p>
    </div>
  )
}

function DocumentCoverageCell({ count, total }: { count: number; total: number }) {
  const coverage = toCoverage(count, total)

  return (
    <TableCell className="text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[#1A1A1A]">
          {count}/{total}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCoverageClasses(
            coverage
          )}`}
        >
          {Math.round(coverage)}%
        </span>
      </div>
    </TableCell>
  )
}

function ExpandedIngredientDetail({ details }: { details: MissingDocDetail[] }) {
  if (details.length === 0) {
    return (
      <div className="rounded-md border border-[#E5E5E5] bg-white p-4">
        <p className="text-xs text-green-700">모든 원료의 업체 서류가 충족되었습니다.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[#E5E5E5] bg-white">
      <div className="border-b border-[#E5E5E5] bg-[#F9F9F9] px-3 py-2">
        <p className="text-xs font-semibold text-[#666666]">서류 미비 원료 상세</p>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full border-collapse">
          <TableHeader className="bg-white">
            <TableRow className="border-b border-[#E5E5E5]">
              <TableHead className="w-36 text-xs font-semibold text-[#666666]">원료코드</TableHead>
              <TableHead className="min-w-[220px] text-xs font-semibold text-[#666666]">
                원료명
              </TableHead>
              <TableHead className="w-20 text-center text-xs font-semibold text-[#666666]">COA</TableHead>
              <TableHead className="w-20 text-center text-xs font-semibold text-[#666666]">MSDS</TableHead>
              <TableHead className="w-28 text-center text-xs font-semibold text-[#666666]">
                Composition
              </TableHead>
              <TableHead className="w-20 text-center text-xs font-semibold text-[#666666]">IFRA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.map((detail) => (
              <TableRow key={detail.ingredient_code} className="border-b border-[#E5E5E5]">
                <TableCell className="font-mono text-xs text-[#1A1A1A]">
                  {detail.ingredient_code}
                </TableCell>
                <TableCell className="text-xs text-[#1A1A1A]">
                  {renderDash(detail.ingredient_name)}
                </TableCell>
                {DOC_TYPES.map((documentType) => {
                  const hasDoc = hasDocument(detail, documentType.key)

                  return (
                    <TableCell key={documentType.key} className="text-center text-xs">
                      <span
                        className={`font-semibold ${hasDoc ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {hasDoc ? '✓' : '✗'}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function V2PifDocumentStatusPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-doc-status', search, page],
    queryFn: () => fetchSupplierDocumentStatus(search, page, PAGE_SIZE),
  })

  const products = data?.items ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const summary = useMemo(() => {
    const aggregate = products.reduce(
      (acc, product) => {
        acc.totalIngredients += product.total_ingredients
        acc.coa += product.coa_count
        acc.msds += product.msds_count
        acc.composition += product.composition_count
        return acc
      },
      {
        totalIngredients: 0,
        coa: 0,
        msds: 0,
        composition: 0,
      }
    )

    return {
      totalProducts: totalCount,
      averageCoaCoverage: toCoverage(aggregate.coa, aggregate.totalIngredients),
      averageMsdsCoverage: toCoverage(aggregate.msds, aggregate.totalIngredients),
      averageCompositionCoverage: toCoverage(
        aggregate.composition,
        aggregate.totalIngredients
      ),
    }
  }, [products, totalCount])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
    setExpandedProducts(new Set())
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleExpanded = (productCode: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)

      if (next.has(productCode)) {
        next.delete(productCode)
      } else {
        next.add(productCode)
      }

      return next
    })
  }

  const renderRows = (list: SupplierDocumentStatus[]) => {
    return list.map((product) => {
      const isExpanded = expandedProducts.has(product.product_code)

      return (
        <Fragment key={product.product_code}>
          <TableRow
            className="cursor-pointer border-b border-[#E5E5E5] transition-colors hover:bg-[#F9F9F9]/50"
            onClick={() => toggleExpanded(product.product_code)}
          >
            <TableCell className="w-10 text-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleExpanded(product.product_code)
                }}
                aria-label={`${product.product_code} 상세 ${isExpanded ? '접기' : '펼치기'}`}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            </TableCell>
            <TableCell className="font-mono text-xs font-medium text-[#1A1A1A]">
              {product.product_code}
            </TableCell>
            <TableCell className="text-xs text-[#1A1A1A]">{renderDash(product.korean_name)}</TableCell>
            <TableCell className="text-xs text-[#666666]">{product.total_ingredients}</TableCell>
            <DocumentCoverageCell
              count={product.coa_count}
              total={product.total_ingredients}
            />
            <DocumentCoverageCell
              count={product.msds_count}
              total={product.total_ingredients}
            />
            <DocumentCoverageCell
              count={product.composition_count}
              total={product.total_ingredients}
            />
            <DocumentCoverageCell
              count={product.ifra_count}
              total={product.total_ingredients}
            />
            <TableCell className="text-xs">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCoverageClasses(
                  product.overall_coverage
                )}`}
              >
                {Math.round(product.overall_coverage)}%
              </span>
            </TableCell>
          </TableRow>

          {isExpanded && (
            <TableRow className="border-b border-[#E5E5E5] bg-[#FCFCFC]">
              <TableCell colSpan={9} className="px-4 py-4">
                <ExpandedIngredientDetail details={product.missing_details} />
              </TableCell>
            </TableRow>
          )}
        </Fragment>
      )
    })
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#666666]">
          <span>PIF</span>
          <span className="text-[#999999]">&gt;</span>
          <span>업체 서류</span>
          <span className="text-[#999999]">&gt;</span>
          <span className="font-medium text-[#1A1A1A]">현황</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">업체 서류 현황</h1>
        <p className="mt-1 text-sm text-[#999999]">
          품목별 원료 업체 서류 보유 현황을 확인합니다
        </p>
      </div>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="전체 품목" value={summary.totalProducts.toLocaleString()} />
        <SummaryCard
          title="COA 평균"
          value={formatPercent(summary.averageCoaCoverage)}
          coverage={summary.averageCoaCoverage}
        />
        <SummaryCard
          title="MSDS 평균"
          value={formatPercent(summary.averageMsdsCoverage)}
          coverage={summary.averageMsdsCoverage}
        />
        <SummaryCard
          title="Composition 평균"
          value={formatPercent(summary.averageCompositionCoverage)}
          coverage={summary.averageCompositionCoverage}
        />
      </section>

      <section className="mb-4 border border-[#E5E5E5] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
            />
            <Input
              placeholder="제품코드, 제품명 검색..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
          >
            검색
          </Button>
        </div>
      </section>

      <section className="border border-[#E5E5E5] bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : products.length === 0 ? (
          <ProductTableEmptyState hasSearch={search.length > 0} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader className="bg-[#F9F9F9]">
                  <TableRow className="border-b border-[#E5E5E5]">
                    <TableHead className="w-10 text-center" />
                    <TableHead className="w-28 text-xs font-semibold text-[#666666]">
                      제품코드
                    </TableHead>
                    <TableHead className="min-w-[180px] text-xs font-semibold text-[#666666]">
                      제품명
                    </TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666]">
                      원료수
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666]">COA</TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666]">MSDS</TableHead>
                    <TableHead className="w-32 text-xs font-semibold text-[#666666]">
                      Composition
                    </TableHead>
                    <TableHead className="w-28 text-xs font-semibold text-[#666666]">IFRA</TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666]">전체</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(products)}</TableBody>
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
                  {getPaginationPages(page, totalPages).map((value, index) =>
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
      </section>
    </div>
  )
}
