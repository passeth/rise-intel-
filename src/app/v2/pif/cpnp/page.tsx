'use client'

import { useMemo, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPifProducts, type PifProduct } from '@/app/v2/pif/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Package,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { CPNP_DOCUMENT_TYPES } from './constants'
import { CpnpDocumentHtmlPreview } from './document-preview'
import { fetchCpnpGenerationHistory, fetchCpnpProductData } from './data'
import type {
  CpnpDocumentResult,
  CpnpDocumentType,
  CpnpGenerationRequest,
  CpnpGenerationResponse,
  CpnpProductResult,
} from './types'

const PAGE_SIZE = 20

type PreviewDocument = {
  url: string
  title: string
  type: CpnpDocumentType
  productCode?: string
  productName?: string
}

function renderDash(value: string | null): string {
  if (!value || value.trim().length === 0) {
    return '-'
  }

  return value
}

function getPaginationPages(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const maxVisible = 7
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
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

function ProductTableEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="py-16 text-center">
      <Package size={48} className="mx-auto mb-3 text-[#E5E5E5]" />
      <p className="text-sm text-[#999999]">
        {hasSearch ? '검색 결과가 없습니다' : '등록된 품목이 없습니다'}
      </p>
    </div>
  )
}

export default function V2PifCpnpPage() {
  const queryClient = useQueryClient()
  const autoDocumentTypes = useMemo(
    () =>
      CPNP_DOCUMENT_TYPES.filter((documentType) => documentType.autoGeneratable).map(
        (documentType) => documentType.type
      ),
    []
  )
  const documentTypeInfoMap = useMemo(
    () => new Map(CPNP_DOCUMENT_TYPES.map((documentType) => [documentType.type, documentType])),
    []
  )

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedDocuments, setSelectedDocuments] = useState<Set<CpnpDocumentType>>(
    () => new Set(autoDocumentTypes)
  )
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null)

  const historyQuery = useQuery({
    queryKey: ['cpnp-history'],
    queryFn: () => fetchCpnpGenerationHistory(1, 20),
  })

  const previewDataQuery = useQuery({
    queryKey: ['cpnp-preview-data', previewDocument?.productCode],
    queryFn: () => fetchCpnpProductData(previewDocument?.productCode ?? ''),
    enabled: Boolean(previewDocument?.productCode),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['cpnp-products', search, page],
    queryFn: () => fetchPifProducts(search, page, PAGE_SIZE),
  })

  const mutation = useMutation({
    mutationFn: async (payload: CpnpGenerationRequest): Promise<CpnpGenerationResponse> => {
      const response = await fetch('/api/cpnp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as
        | CpnpGenerationResponse
        | {
            error?: string
          }

      if (!response.ok) {
        const errorMessage =
          typeof json === 'object' && json !== null && 'error' in json
            ? (json.error as string | undefined)
            : undefined
        throw new Error(errorMessage ?? '서류 생성 요청에 실패했습니다')
      }

      return json as CpnpGenerationResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpnp-history'] })
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? ` (${error.message})` : ''
      toast.error(`서류 생성 중 오류가 발생했습니다${errorMessage}`)
    },
  })

  const products = data?.products ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const selectedProductCount = selectedProducts.size
  const selectedDocumentCount = selectedDocuments.size
  const canGenerate = selectedProductCount > 0 && selectedDocumentCount > 0
  const shouldShowActionBar = selectedProductCount > 0 || selectedDocumentCount > 0

  const successfulUrls = useMemo(() => {
    if (!mutation.data) return []

    return mutation.data.results.flatMap((result) =>
      result.documents.flatMap((documentResult) =>
        documentResult.url ? [documentResult.url] : []
      )
    )
  }, [mutation.data])

  const allSelectedOnPage =
    products.length > 0 &&
    products.every((product) => selectedProducts.has(product.product_code))
  const someSelectedOnPage = products.some((product) =>
    selectedProducts.has(product.product_code)
  )

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

  const handleToggleAllProducts = (checked: boolean) => {
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

  const handleToggleProduct = (productCode: string, checked: boolean) => {
    const next = new Set(selectedProducts)

    if (checked) {
      next.add(productCode)
    } else {
      next.delete(productCode)
    }

    setSelectedProducts(next)
  }

  const handleToggleDocument = (documentType: CpnpDocumentType, checked: boolean) => {
    const next = new Set(selectedDocuments)

    if (checked) {
      next.add(documentType)
    } else {
      next.delete(documentType)
    }

    setSelectedDocuments(next)
  }

  const handleSelectAllDocuments = () => {
    setSelectedDocuments(new Set(CPNP_DOCUMENT_TYPES.map((documentType) => documentType.type)))
  }

  const handleSelectAutoDocuments = () => {
    setSelectedDocuments(new Set(autoDocumentTypes))
  }

  const handleClearSelection = () => {
    setSelectedProducts(new Set())
    setSelectedDocuments(new Set())
  }

  const handleGenerate = () => {
    mutation.mutate({
      productCodes: Array.from(selectedProducts),
      documents: Array.from(selectedDocuments),
    })
  }

  const handleOpenAll = () => {
    for (const url of successfulUrls) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handlePreviewDocument = (document: PreviewDocument) => {
    setPreviewDocument(document)
  }

  const renderDocumentResult = (
    documentResult: CpnpDocumentResult,
    productResult: CpnpProductResult
  ) => {
    const documentTypeInfo = documentTypeInfoMap.get(documentResult.type)
    const Icon = documentTypeInfo?.icon ?? FileText
    const documentTitle = documentTypeInfo?.label ?? documentResult.type

    return (
      <div
        key={`${documentResult.type}-${documentResult.url ?? documentResult.error ?? 'none'}`}
        className="flex flex-wrap items-center gap-2 rounded-md border border-[#EFEFEF] bg-[#FCFCFC] px-3 py-2"
      >
        <Icon size={14} className="text-[#666666]" />
        <span className="text-xs font-medium text-[#1A1A1A]">
          {documentTitle}
        </span>

        {documentResult.url ? (
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                handlePreviewDocument({
                  url: documentResult.url!,
                  title: documentTitle,
                  type: documentResult.type,
                  productCode: productResult.productCode,
                  productName: productResult.productName,
                })
              }
              className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Eye size={12} className="mr-1" />
              미리보기
            </Button>
            <a
              href={documentResult.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
              aria-label={`${documentTitle} 새 탭에서 열기`}
            >
              <ExternalLink size={12} />
            </a>
          </div>
        ) : documentResult.error ? (
          <span className="ml-auto text-xs font-medium text-red-600">{documentResult.error}</span>
        ) : (
          <span className="ml-auto text-xs text-[#999999]">-</span>
        )}
      </div>
    )
  }

  const renderProductResult = (productResult: CpnpProductResult) => {
    const productSucceededCount = productResult.documents.filter((documentResult) => documentResult.url).length
    const productFailedCount = productResult.documents.length - productSucceededCount

    return (
      <details
        key={productResult.productCode}
        className="group rounded-md border border-[#E5E5E5] bg-white"
        open
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3">
          <span className="font-mono text-xs font-semibold text-[#1A1A1A]">{productResult.productCode}</span>
          <span className="text-xs text-[#666666]">{productResult.productName}</span>
          <Badge className="ml-auto h-5 bg-green-100 px-2 text-[10px] text-green-700 hover:bg-green-100">
            성공 {productSucceededCount}
          </Badge>
          <Badge className="h-5 bg-red-100 px-2 text-[10px] text-red-700 hover:bg-red-100">
            실패 {productFailedCount}
          </Badge>
        </summary>

        <div className="space-y-2 border-t border-[#E5E5E5] px-4 py-3">
          {productResult.documents.map((documentResult) =>
            renderDocumentResult(documentResult, productResult)
          )}
        </div>
      </details>
    )
  }

  const formatGeneratedAt = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('ko-KR')
  }

  const renderHistoryStatus = (status: string | null) => {
    const normalized = status?.toLowerCase() ?? 'unknown'

    if (normalized === 'generated' || normalized === 'success') {
      return (
        <Badge className="h-5 bg-green-100 px-2 text-[10px] text-green-700 hover:bg-green-100">
          성공
        </Badge>
      )
    }

    if (normalized === 'partial') {
      return (
        <Badge className="h-5 bg-amber-100 px-2 text-[10px] text-amber-700 hover:bg-amber-100">
          부분성공
        </Badge>
      )
    }

    return (
      <Badge className="h-5 bg-red-100 px-2 text-[10px] text-red-700 hover:bg-red-100">실패</Badge>
    )
  }

  const renderProductRows = (list: PifProduct[]) => {
    return list.map((product) => {
      const checked = selectedProducts.has(product.product_code)

      return (
        <TableRow
          key={product.product_code}
          className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50"
        >
          <TableCell className="text-center">
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => handleToggleProduct(product.product_code, value === true)}
              aria-label={`${product.product_code} 선택`}
              className="mx-auto"
            />
          </TableCell>
          <TableCell className="font-mono text-xs font-medium text-[#1A1A1A]">
            {product.product_code}
          </TableCell>
          <TableCell className="font-mono text-xs text-[#666666]">
            {renderDash(product.management_code)}
          </TableCell>
          <TableCell className="text-xs text-[#1A1A1A]">
            {renderDash(product.korean_name)}
          </TableCell>
          <TableCell className="text-xs text-[#666666]">
            {renderDash(product.english_name)}
          </TableCell>
          <TableCell className="font-mono text-xs text-[#666666]">
            {renderDash(product.semi_product_code)}
          </TableCell>
        </TableRow>
      )
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#666666]">
          <span>PIF</span>
          <span className="text-[#999999]">&gt;</span>
          <span>CPNP</span>
          <span className="text-[#999999]">&gt;</span>
          <span className="font-medium text-[#1A1A1A]">서류 생성</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">CPNP 서류 생성</h1>
        <p className="mt-1 text-sm text-[#999999]">
          품목을 선택하고 생성할 서류를 선택하세요
        </p>
      </div>

      {mutation.isSuccess && mutation.data && (
        <section className="mb-4 border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E5E5] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">생성 완료</h2>
            <Badge
              className={`h-5 px-2 text-[10px] ${
                mutation.data.status === 'success'
                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                  : mutation.data.status === 'partial'
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                    : 'bg-red-100 text-red-700 hover:bg-red-100'
              }`}
            >
              {mutation.data.status === 'success'
                ? '전체 성공'
                : mutation.data.status === 'partial'
                  ? '부분 성공'
                  : '전체 실패'}
            </Badge>
            <p className="text-xs text-[#666666]">
              총 {mutation.data.results.length}개 제품 처리, 성공 파일 {successfulUrls.length}건
            </p>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleOpenAll}
                disabled={successfulUrls.length === 0}
                className="h-8 border-[#DADADA] text-xs"
              >
                새 탭에서 모두 열기
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => mutation.reset()}
                className="h-8 text-xs text-[#666666] hover:bg-[#F5F5F5]"
              >
                닫기
              </Button>
            </div>
          </div>

          <div className="space-y-2 p-3">{mutation.data.results.map(renderProductResult)}</div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.85fr_1fr]">
        <section className="border border-[#E5E5E5] bg-white shadow-sm">
          <div className="border-b border-[#E5E5E5] p-4">
            <div className="flex items-center gap-2">
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
          </div>

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
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={allSelectedOnPage ? true : someSelectedOnPage ? 'indeterminate' : false}
                          onCheckedChange={(value) => handleToggleAllProducts(value === true)}
                          aria-label="전체 선택"
                          className="mx-auto"
                        />
                      </TableHead>
                      <TableHead className="w-28 text-xs font-semibold text-[#666666]">
                        제품코드
                      </TableHead>
                      <TableHead className="w-28 text-xs font-semibold text-[#666666]">
                        관리번호
                      </TableHead>
                      <TableHead className="min-w-[180px] text-xs font-semibold text-[#666666]">
                        제품명(국문)
                      </TableHead>
                      <TableHead className="min-w-[180px] text-xs font-semibold text-[#666666]">
                        제품명(영문)
                      </TableHead>
                      <TableHead className="w-28 text-xs font-semibold text-[#666666]">
                        반제품코드
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderProductRows(products)}</TableBody>
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

        <aside className="h-fit border border-[#E5E5E5] bg-white shadow-sm lg:sticky lg:top-24">
          <div className="border-b border-[#E5E5E5] bg-[#F9F9F9] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">생성 서류 선택</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSelectAllDocuments}
                className="h-7 border-[#DADADA] text-xs"
              >
                전체 선택
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSelectAutoDocuments}
                className="h-7 border-[#DADADA] text-xs"
              >
                자동 생성만
              </Button>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {CPNP_DOCUMENT_TYPES.map((documentType) => {
              const checked = selectedDocuments.has(documentType.type)
              const Icon = documentType.icon

              return (
                <label
                  key={documentType.type}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-[#E5E5E5] px-3 py-2 transition-colors hover:bg-[#F9F9F9]"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      handleToggleDocument(documentType.type, value === true)
                    }
                    className="mt-0.5"
                    aria-label={`${documentType.label} 선택`}
                  />
                  <div className="mt-0.5 text-[#666666]">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#1A1A1A]">{documentType.label}</p>
                      <Badge
                        variant="secondary"
                        className={
                          documentType.autoGeneratable
                            ? 'h-5 bg-green-100 px-2 text-[10px] text-green-700 hover:bg-green-100'
                            : 'h-5 bg-gray-100 px-2 text-[10px] text-gray-600 hover:bg-gray-100'
                        }
                      >
                        {documentType.autoGeneratable ? '자동' : '수동'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#888888]">{documentType.description}</p>
                  </div>
                  {checked && <Check size={14} className="mt-1 text-green-600" />}
                </label>
              )
            })}
          </div>
        </aside>
      </div>

      {shouldShowActionBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#333333] bg-[#1A1A1A] px-4 py-3 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.2)]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-blue-300" />
              <span>
                {selectedProductCount}개 제품 x {selectedDocumentCount}개 서류 선택됨
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="ml-auto h-8 text-white hover:bg-[#333333] hover:text-white"
            >
              <X className="mr-1 h-3.5 w-3.5" /> 선택 해제
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={!canGenerate || mutation.isPending}
              className="h-8 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              서류 생성
            </Button>
          </div>
        </div>
      )}

      <section className="mt-6 border border-[#E5E5E5] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#E5E5E5] bg-[#F9F9F9] px-4 py-3">
          <History size={14} className="text-[#666666]" />
          <h2 className="text-sm font-semibold text-[#1A1A1A]">최근 생성 이력</h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => historyQuery.refetch()}
            className="ml-auto h-7 text-xs text-[#666666] hover:bg-white"
          >
            새로고침
          </Button>
        </div>

        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[#999999]" />
          </div>
        ) : historyQuery.isError ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-red-600">
            <AlertCircle size={16} />
            <span>이력 조회 중 오류가 발생했습니다</span>
          </div>
        ) : !historyQuery.data || historyQuery.data.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#999999]">생성 이력이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full border-collapse">
              <TableHeader className="bg-[#F9F9F9]">
                <TableRow className="border-b border-[#E5E5E5]">
                  <TableHead className="text-xs font-semibold text-[#666666]">생성일시</TableHead>
                  <TableHead className="text-xs font-semibold text-[#666666]">제품코드</TableHead>
                  <TableHead className="text-xs font-semibold text-[#666666]">서류유형</TableHead>
                  <TableHead className="text-xs font-semibold text-[#666666]">상태</TableHead>
                  <TableHead className="text-xs font-semibold text-[#666666]">다운로드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyQuery.data.map((historyItem, index) => {
                  const documentTypeInfo = documentTypeInfoMap.get(
                    historyItem.document_type as CpnpDocumentType
                  )

                  return (
                    <TableRow
                      key={`${historyItem.product_code}-${historyItem.document_type}-${historyItem.generated_at}-${index}`}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/50"
                    >
                      <TableCell className="font-mono text-xs text-[#666666]">
                        {formatGeneratedAt(historyItem.generated_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-[#1A1A1A]">
                        {historyItem.product_code}
                      </TableCell>
                      <TableCell className="text-xs text-[#1A1A1A]">
                        {documentTypeInfo?.label ?? historyItem.document_type}
                      </TableCell>
                      <TableCell className="text-xs">{renderHistoryStatus(historyItem.status)}</TableCell>
                      <TableCell className="text-xs">
                        {historyItem.pdf_url ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handlePreviewDocument({
                                  url: historyItem.pdf_url!,
                                  title: documentTypeInfo?.label ?? historyItem.document_type,
                                  type: historyItem.document_type as CpnpDocumentType,
                                  productCode: historyItem.product_code,
                                })
                              }
                              className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Eye size={12} className="mr-1" />
                              보기
                            </Button>
                            <a
                              href={historyItem.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center rounded-md px-2 text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
                              aria-label={`${documentTypeInfo?.label ?? historyItem.document_type} 새 탭에서 열기`}
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[#999999]">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {mutation.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-[#E5E5E5] bg-white px-6 py-8 text-center shadow-xl">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
            <h3 className="text-base font-semibold text-[#1A1A1A]">서류 생성 중...</h3>
            <p className="mt-2 text-sm text-[#666666]">
              {selectedProductCount}개 제품 x {selectedDocumentCount}개 서류 생성 중
            </p>
          </div>
        </div>
      )}

      <Dialog
        open={previewDocument !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDocument(null)
          }
        }}
      >
        <DialogContent className="flex h-[min(860px,calc(100vh-2rem))] w-[min(1220px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-md border-[#DADADA] p-0">
          <DialogHeader className="border-b border-[#E5E5E5] bg-white px-5 py-3 pr-12">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge className="h-5 bg-[#1A1A1A] px-2 text-[10px] text-white hover:bg-[#1A1A1A]">
                HTML
              </Badge>
              <DialogTitle className="truncate text-sm font-semibold text-[#1A1A1A]">
                {previewDocument?.title ?? '문서 미리보기'}
              </DialogTitle>
              {previewDocument?.productCode && (
                <span className="font-mono text-xs text-[#666666]">
                  {previewDocument.productCode}
                </span>
              )}
              {previewDocument?.url && (
                <a
                  href={previewDocument.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-[#DADADA] px-2 text-xs font-medium text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
                >
                  새 탭 <ExternalLink size={12} />
                </a>
              )}
            </div>
            <DialogDescription className="sr-only">
              생성된 문서 내용을 HTML 미리보기로 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-[#4A4A4A] p-6">
            {previewDataQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                문서 데이터를 불러오는 중...
              </div>
            ) : previewDataQuery.isError ? (
              <div className="flex h-full items-center justify-center text-sm text-white">
                문서 데이터를 불러오지 못했습니다.
              </div>
            ) : previewDocument && previewDataQuery.data ? (
              <CpnpDocumentHtmlPreview type={previewDocument.type} data={previewDataQuery.data} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white">
                미리볼 문서가 없습니다
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
