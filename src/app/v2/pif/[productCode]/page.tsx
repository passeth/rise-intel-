'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState, type ComponentType } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

import {
  AlertCircle,
  Atom,
  Beaker,
  ChevronLeft,
  Factory,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  ImageIcon,
  Languages,
  List,
  ListChecks,
  Loader2,
  Package2,
  Scale,
  Search,
} from 'lucide-react'
import {
  fetchProductDetail,
  type NormalizedBomItem,
  type ProductDetailData,
  type ProductQcSpec,
} from './actions'
import { fetchPifProducts, type PifProduct } from '../actions'

const EMPTY_BOM: NormalizedBomItem[] = []
const EMPTY_SPECS: ProductQcSpec[] = []

type DocId =
  | 'standard'
  | 'ingredients-ko'
  | 'ingredients-en'
  | 'breakdown'
  | 'inci-merged'
  | 'certificate-en'
  | 'specs-semi'
  | 'specs-final'
  | 'msds'
  | 'manufacturing'

type DocItem = {
  id: DocId
  label: string
  icon: ComponentType<{ className?: string }>
}

type KoreanIngredientRow = {
  no: number
  code: string
  ingredientName: string
  wtPercent: number
  ref: string
}

type EnglishIngredientRow = {
  no: number
  code: string
  ingredientName: string
  wtPercent: number
  casNo: string
  functionName: string
}

type AllergenRow = {
  name: string
  casNo: string
  wtPercent: number
}

type InciMergedRow = {
  inciName: string
  casNo: string
  functionName: string
  wtPercent: number
}

const DOC_ITEMS: DocItem[] = [
  { id: 'standard', label: '제품표준서', icon: FileText },
  { id: 'ingredients-ko', label: '국문 성분표', icon: List },
  { id: 'ingredients-en', label: '영문 성분표', icon: Languages },
  { id: 'breakdown', label: '브레이크다운', icon: Atom },
  { id: 'inci-merged', label: 'INCI 합산', icon: Scale },
  { id: 'certificate-en', label: '영문 성적서', icon: FileSpreadsheet },
  { id: 'specs-semi', label: '반제품 기준', icon: Beaker },
  { id: 'specs-final', label: '완제품 기준', icon: FlaskConical },
  { id: 'msds', label: 'MSDS', icon: AlertCircle },
  { id: 'manufacturing', label: '제조공정 기록서', icon: Factory },
]

const FRAGRANCE_ALLERGEN_CAS = new Set([
  '5989-27-5',
  '80-56-8',
  '127-91-3',
  '5989-54-8',
  '99-87-6',
  '470-82-6',
  '78-70-6',
  '106-22-9',
  '106-24-1',
  '7540-51-4',
  '5392-40-5',
  '91-64-5',
  '97-53-0',
  '97-54-1',
  '104-55-2',
  '103-41-3',
  '118-58-1',
  '100-51-6',
  '120-51-4',
  '122-40-7',
  '101-86-0',
  '105-13-5',
  '80-54-6',
  '4602-84-0',
  '31906-04-4',
  '90-17-5',
  '111-12-6',
  '107-75-5',
  '6259-76-3',
  '1222-05-5',
  '21145-77-7',
  '141-10-6',
])

function toWeightPercent(totalUsemount: number): number {
  return totalUsemount / 1000
}

function isValidDocId(value: string): value is DocId {
  return DOC_ITEMS.some((doc) => doc.id === value)
}

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

function renderDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-'
  }
  const text = `${value}`.trim()
  return text.length > 0 ? text : '-'
}

export default function V2PifDetailPage() {
  const params = useParams<{ productCode: string }>()
  const router = useRouter()
  const decodedProductCode = decodeURIComponent(params.productCode)
  const [selectedDoc, setSelectedDoc] = useState<string>('standard')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PifProduct[]>([])
  const [searching, setSearching] = useState(false)

  // Product search handler
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const result = await fetchPifProducts(query, 1, 20)
      setSearchResults(result.products)
    } catch (e) {
      console.error('Search error:', e)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectProduct = (productCode: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    router.push(`/v2/pif/${productCode}`)
  }

  const { data, isLoading, isError, error } = useQuery<ProductDetailData>({
    queryKey: ['pif-product-detail', decodedProductCode],
    queryFn: () => fetchProductDetail(decodedProductCode),
  })

  const printMutation = useMutation({
    mutationFn: async () => {
      window.print()
    },
  })

  const product = data?.product ?? null
  const bom = data?.bom ?? EMPTY_BOM
  const specs = data?.specs ?? EMPTY_SPECS
  const images = data?.images ?? []
  const processRecord = data?.process.process ?? null
  const processSteps = data?.process.steps ?? []

  const koreanIngredients = useMemo<KoreanIngredientRow[]>(() => {
    return bom
      .map((item) => {
        const ingredientName = item.components
          .map((component) => component.inci_name_kr)
          .filter((name): name is string => Boolean(name && name.trim().length > 0))
          .join(', ')

        return {
          no: 0,
          code: item.baseCode,
          ingredientName: ingredientName || item.materialname,
          wtPercent: toWeightPercent(item.totalUsemount),
          ref: 'ICID',
        }
      })
      .sort((a, b) => b.wtPercent - a.wtPercent)
      .map((row, index) => ({ ...row, no: index + 1 }))
  }, [bom])

  const englishIngredients = useMemo<EnglishIngredientRow[]>(() => {
    return bom
      .map((item) => {
        const first = item.components[0]
        const ingredientName = item.components
          .map((component) => component.inci_name_en)
          .filter((name): name is string => Boolean(name && name.trim().length > 0))
          .join(', ')
        const casNo = Array.from(
          new Set(item.components.map((component) => component.cas_number).filter(Boolean))
        ).join(', ')
        const functionName = Array.from(
          new Set(item.components.map((component) => component.function).filter(Boolean))
        ).join(', ')

        return {
          no: 0,
          code: item.baseCode,
          ingredientName: ingredientName || item.materialname,
          wtPercent: toWeightPercent(item.totalUsemount),
          casNo: casNo || first?.cas_number || '-',
          functionName: functionName || first?.function || '-',
        }
      })
      .sort((a, b) => b.wtPercent - a.wtPercent)
      .map((row, index) => ({ ...row, no: index + 1 }))
  }, [bom])

  const fragranceAllergens = useMemo<AllergenRow[]>(() => {
    const merged = new Map<string, AllergenRow>()

    for (const item of bom) {
      const rawWtPercent = toWeightPercent(item.totalUsemount)
      for (const component of item.components) {
        if (!component.cas_number || !FRAGRANCE_ALLERGEN_CAS.has(component.cas_number)) {
          continue
        }
        const ratio = component.composition_ratio ?? 100
        const wtPercent = (rawWtPercent * ratio) / 100
        if (wtPercent < 0.001) {
          continue
        }

        const existing = merged.get(component.cas_number)
        if (existing) {
          existing.wtPercent += wtPercent
          continue
        }
        merged.set(component.cas_number, {
          name: component.inci_name_en || component.inci_name_kr || 'Unknown',
          casNo: component.cas_number,
          wtPercent,
        })
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent)
  }, [bom])

  const englishSpecs = useMemo(() => {
    return specs.filter((spec) => Boolean(spec.test_item_en && spec.specification_en))
  }, [specs])

  const semiSpecs = useMemo(() => {
    return specs.filter((spec) => spec.qc_type === '반제품')
  }, [specs])

  const finalSpecs = useMemo(() => {
    return specs.filter((spec) => spec.qc_type === '완제품')
  }, [specs])

  const physicalProps = useMemo(() => {
    const odorSpec = finalSpecs.find(
      (spec) => spec.test_item?.includes('향') || spec.test_item?.includes('Odor')
    )

    return {
      appearance: product?.appearance || '',
      ph: product?.ph_standard || '',
      specificGravity: product?.specific_gravity?.toString() || '',
      viscosity: product?.viscosity_standard || '',
      odor: odorSpec?.specification || 'Characteristic',
    }
  }, [finalSpecs, product])

  const inciMerged = useMemo<InciMergedRow[]>(() => {
    const merged = new Map<string, InciMergedRow>()

    for (const item of bom) {
      const rawWtPercent = toWeightPercent(item.totalUsemount)
      if (item.components.length === 0) {
        const key = item.materialname
        const existing = merged.get(key)
        if (existing) {
          existing.wtPercent += rawWtPercent
          continue
        }
        merged.set(key, {
          inciName: item.materialname,
          casNo: '-',
          functionName: '-',
          wtPercent: rawWtPercent,
        })
        continue
      }

      for (const component of item.components) {
        const ratio = component.composition_ratio ?? 100
        const ingredientWt = (rawWtPercent * ratio) / 100
        const key =
          component.inci_name_en ||
          component.inci_name_kr ||
          `${item.baseCode}-${component.id}`

        const existing = merged.get(key)
        if (existing) {
          existing.wtPercent += ingredientWt
          continue
        }

        merged.set(key, {
          inciName:
            component.inci_name_en || component.inci_name_kr || item.materialname,
          casNo: component.cas_number || '-',
          functionName: component.function || '-',
          wtPercent: ingredientWt,
        })
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent)
  }, [bom])

  const activeDoc: DocId = isValidDocId(selectedDoc) ? selectedDoc : 'standard'

  const toggleDocSelection = (docId: DocId, checked: boolean) => {
    const next = new Set(selectedDocs)
    if (checked) {
      next.add(docId)
    } else {
      next.delete(docId)
    }
    setSelectedDocs(next)
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-[#666666]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-2 text-[#666666]">
        <AlertCircle className="h-6 w-6" />
        <p className="text-sm">{error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-2 text-[#666666]">
        <Package2 className="h-6 w-6" />
        <p className="text-sm">해당 제품을 찾을 수 없습니다.</p>
        <Link href="/v2/pif" className="text-xs text-[#1A1A1A] underline underline-offset-2">
          제품 리스트로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Product Search Area */}
      <div className="px-4 py-2 border-b border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-3">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#666666] bg-[#F9F9F9] border border-[#E5E5E5] rounded hover:border-[#999999] transition-colors">
                <Search className="h-3.5 w-3.5" />
                <span>제품 검색...</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="h-4 w-4 shrink-0 opacity-50" />
                  <input
                    placeholder="제품 검색..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ml-2"
                  />
                  {searching && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <CommandList>
                  <CommandEmpty>검색 결과 없음</CommandEmpty>
                  <CommandGroup>
                    {searchResults.map((p) => (
                      <CommandItem
                        key={p.product_code}
                        value={p.product_code + ' ' + (p.korean_name || '')}
                        onSelect={() => handleSelectProduct(p.product_code)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{p.product_code}</span>
                          <span className="text-xs text-[#666666]">{p.korean_name || p.english_name || '-'}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <Link href="/v2/pif" className="inline-flex items-center gap-1 hover:text-[#1A1A1A]">
            <ChevronLeft className="h-3.5 w-3.5" />
            PIF
          </Link>
          <span className="text-[#999999]">&gt;</span>
          <Link href="/v2/pif" className="hover:text-[#1A1A1A]">
            제품 리스트
          </Link>
          <span className="text-[#999999]">&gt;</span>
          <span className="font-medium text-[#1A1A1A]">{decodedProductCode}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 bg-[#F9F9F9]">
        <aside className="w-80 min-w-80 border-r border-[#E5E5E5] bg-white flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="p-4 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-3 text-xs font-medium text-[#666666]">
                <ImageIcon className="h-3.5 w-3.5" />
                제품 이미지
              </div>
              {images.length === 0 ? (
                <div className="h-40 border border-[#E5E5E5] bg-[#F9F9F9] flex items-center justify-center text-xs text-[#999999]">
                  이미지 없음
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((image) => (
                    <a
                      key={image.id}
                      href={image.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative h-24 border border-[#E5E5E5] bg-[#F9F9F9]"
                    >
                      <Image
                        src={image.image_url}
                        alt="Product image"
                        fill
                        sizes="160px"
                        className="object-contain"
                        unoptimized
                      />
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="p-4 border-b border-[#E5E5E5]">
              <div className="text-xs font-medium text-[#666666] mb-3">기본 정보</div>
              <div className="border border-[#E5E5E5] divide-y divide-[#E5E5E5] text-xs">
                <InfoLine label="제품코드" value={product.product_code} />
                <InfoLine label="관리번호" value={product.management_code} />
                <InfoLine label="국문명" value={product.korean_name} />
                <InfoLine label="영문명" value={product.english_name} />
                <InfoLine label="화장품유형" value={product.cosmetic_type} />
                <InfoLine label="표시용량" value={product.label_volume} />
                <InfoLine label="충진용량" value={product.fill_volume} />
                <InfoLine label="사용기한" value={product.shelf_life} />
              </div>
            </section>

            <section className="p-2">
              <div className="px-2 py-2 text-xs font-medium text-[#666666]">문서</div>
              <div className="space-y-1">
                {DOC_ITEMS.map((doc) => {
                  const Icon = doc.icon
                  const checked = selectedDocs.has(doc.id)
                  const active = activeDoc === doc.id

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoc(doc.id)}
                      className={`w-full flex items-center gap-2 px-2 py-2 text-left border border-transparent text-xs transition-colors ${
                        active
                          ? 'bg-[#F9F9F9] border-[#E5E5E5] text-[#1A1A1A]'
                          : 'text-[#666666] hover:bg-[#F9F9F9]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="flex-1 truncate">{doc.label}</span>
                      <span
                        onClick={(event) => event.stopPropagation()}
                        className="flex h-4 w-4 items-center justify-center"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleDocSelection(doc.id, value === true)
                          }
                          aria-label={`${doc.label} 선택`}
                          className="h-3.5 w-3.5 rounded-sm"
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="border-t border-[#E5E5E5] p-3">
            <Button
              onClick={() => printMutation.mutate()}
              disabled={printMutation.isPending}
              className="w-full h-9 bg-[#1A1A1A] text-white hover:bg-[#333333] text-xs"
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" />
              일괄 PDF 발급
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-4 pb-3 border-b border-[#E5E5E5]">
              <h1 className="text-lg font-semibold text-[#1A1A1A]">{docLabel(activeDoc)}</h1>
              <p className="mt-1 text-xs text-[#666666]">
                {product.korean_name || product.product_code} / {product.product_code}
              </p>
            </div>
            <DocumentContent
              activeDoc={activeDoc}
              productDetail={data}
              koreanIngredients={koreanIngredients}
              englishIngredients={englishIngredients}
              fragranceAllergens={fragranceAllergens}
              inciMerged={inciMerged}
              englishSpecs={englishSpecs}
              semiSpecs={semiSpecs}
              finalSpecs={finalSpecs}
              physicalProps={physicalProps}
              processRecord={processRecord}
              processSteps={processSteps}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

function docLabel(docId: DocId): string {
  return DOC_ITEMS.find((doc) => doc.id === docId)?.label ?? '제품표준서'
}

function InfoLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2 px-2 py-1.5">
      <span className="text-[#999999]">{label}</span>
      <span className="text-[#1A1A1A] truncate">{renderDash(value)}</span>
    </div>
  )
}

function EmptyRow({ message, colSpan }: { message: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-[#999999] text-xs">
        {message}
      </td>
    </tr>
  )
}

function SpecTable({ specs }: { specs: ProductQcSpec[] }) {
  return (
    <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
      <table className="w-full text-xs">
        <thead className="bg-[#F9F9F9] text-[#666666]">
          <tr className="border-b border-[#E5E5E5]">
            <th className="px-3 py-2 w-12 text-center font-medium">No</th>
            <th className="px-3 py-2 text-left font-medium">시험항목</th>
            <th className="px-3 py-2 text-left font-medium">규격</th>
            <th className="px-3 py-2 text-left font-medium">시험방법</th>
          </tr>
        </thead>
        <tbody>
          {specs.length === 0 ? (
            <EmptyRow message="데이터가 없습니다." colSpan={4} />
          ) : (
            specs.map((spec) => (
              <tr key={spec.id} className="border-b border-[#E5E5E5] last:border-b-0">
                <td className="px-3 py-2 text-center text-[#666666]">
                  {spec.sequence_no ?? '-'}
                </td>
                <td className="px-3 py-2 text-[#1A1A1A]">{renderDash(spec.test_item)}</td>
                <td className="px-3 py-2 text-[#666666]">{renderDash(spec.specification)}</td>
                <td className="px-3 py-2 text-[#666666]">{renderDash(spec.test_method)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function DocumentContent({
  activeDoc,
  productDetail,
  koreanIngredients,
  englishIngredients,
  fragranceAllergens,
  inciMerged,
  englishSpecs,
  semiSpecs,
  finalSpecs,
  physicalProps,
  processRecord,
  processSteps,
}: {
  activeDoc: DocId
  productDetail: ProductDetailData | undefined
  koreanIngredients: KoreanIngredientRow[]
  englishIngredients: EnglishIngredientRow[]
  fragranceAllergens: AllergenRow[]
  inciMerged: InciMergedRow[]
  englishSpecs: ProductQcSpec[]
  semiSpecs: ProductQcSpec[]
  finalSpecs: ProductQcSpec[]
  physicalProps: {
    appearance: string
    ph: string
    specificGravity: string
    viscosity: string
    odor: string
  }
  processRecord: ProductDetailData['process']['process']
  processSteps: ProductDetailData['process']['steps']
}) {
  const product = productDetail?.product
  if (!product) {
    return null
  }

  if (activeDoc === 'ingredients-ko') {
    return (
      <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#F9F9F9] text-[#666666]">
            <tr className="border-b border-[#E5E5E5]">
              <th className="px-3 py-2 w-12 text-center font-medium">No</th>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              <th className="px-3 py-2 text-left font-medium">성분명</th>
              <th className="px-3 py-2 text-right font-medium">%(W/W)</th>
              <th className="px-3 py-2 text-center font-medium">Ref</th>
            </tr>
          </thead>
          <tbody>
            {koreanIngredients.length === 0 ? (
              <EmptyRow message="BOM 데이터가 없습니다." colSpan={5} />
            ) : (
              koreanIngredients.map((row) => (
                <tr key={row.code} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2 text-center text-[#666666]">{row.no}</td>
                  <td className="px-3 py-2 font-mono text-[#666666]">{row.code}</td>
                  <td className="px-3 py-2 text-[#1A1A1A]">{row.ingredientName}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                    {row.wtPercent.toFixed(5)}
                  </td>
                  <td className="px-3 py-2 text-center text-[#666666]">{row.ref}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (activeDoc === 'ingredients-en') {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F9F9F9] text-[#666666]">
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-3 py-2 w-12 text-center font-medium">No</th>
                <th className="px-3 py-2 text-left font-medium">INCI Name</th>
                <th className="px-3 py-2 text-right font-medium">%(W/W)</th>
                <th className="px-3 py-2 text-left font-medium">CAS No</th>
                <th className="px-3 py-2 text-left font-medium">Function</th>
              </tr>
            </thead>
            <tbody>
              {englishIngredients.length === 0 ? (
                <EmptyRow message="BOM 데이터가 없습니다." colSpan={5} />
              ) : (
                englishIngredients.map((row) => (
                  <tr key={row.code} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2 text-center text-[#666666]">{row.no}</td>
                    <td className="px-3 py-2 text-[#1A1A1A]">{row.ingredientName}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                      {row.wtPercent.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#666666]">{row.casNo}</td>
                    <td className="px-3 py-2 text-[#666666]">{row.functionName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
          <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
            Fragrance Allergens (EU)
          </div>
          <table className="w-full text-xs">
            <thead className="bg-white text-[#666666]">
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">CAS No</th>
                <th className="px-3 py-2 text-right font-medium">%(W/W)</th>
              </tr>
            </thead>
            <tbody>
              {fragranceAllergens.length === 0 ? (
                <EmptyRow message="검출된 향료 알레르겐이 없습니다." colSpan={3} />
              ) : (
                fragranceAllergens.map((allergen) => (
                  <tr key={allergen.casNo} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2 text-[#1A1A1A]">{allergen.name}</td>
                    <td className="px-3 py-2 font-mono text-[#666666]">{allergen.casNo}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                      {allergen.wtPercent.toFixed(6)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (activeDoc === 'breakdown') {
    return (
      <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#F9F9F9] text-[#666666]">
            <tr className="border-b border-[#E5E5E5]">
              <th className="px-3 py-2 text-left font-medium">Raw Material</th>
              <th className="px-3 py-2 text-left font-medium">INCI Name</th>
              <th className="px-3 py-2 text-right font-medium">Ratio (%)</th>
              <th className="px-3 py-2 text-left font-medium">CAS No</th>
            </tr>
          </thead>
          <tbody>
            {(productDetail?.bom ?? []).length === 0 ? (
              <EmptyRow message="BOM 데이터가 없습니다." colSpan={4} />
            ) : (
              (productDetail?.bom ?? []).map((item) => {
                if (item.components.length === 0) {
                  return (
                    <tr key={item.baseCode} className="border-b border-[#E5E5E5] last:border-b-0">
                      <td className="px-3 py-2 text-[#1A1A1A]">
                        {item.materialname} ({item.baseCode})
                      </td>
                      <td className="px-3 py-2 text-[#666666]">-</td>
                      <td className="px-3 py-2 text-right font-mono text-[#666666]">-</td>
                      <td className="px-3 py-2 text-[#666666]">-</td>
                    </tr>
                  )
                }

                return item.components.map((component, index) => (
                  <tr
                    key={`${item.baseCode}-${component.id}`}
                    className="border-b border-[#E5E5E5] last:border-b-0"
                  >
                    {index === 0 && (
                      <td rowSpan={item.components.length} className="px-3 py-2 align-top text-[#1A1A1A]">
                        <div>{item.materialname}</div>
                        <div className="font-mono text-[11px] text-[#999999] mt-0.5">{item.baseCode}</div>
                      </td>
                    )}
                    <td className="px-3 py-2 text-[#1A1A1A]">
                      {renderDash(component.inci_name_en || component.inci_name_kr)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                      {component.composition_ratio?.toFixed(4) ?? '-'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#666666]">{renderDash(component.cas_number)}</td>
                  </tr>
                ))
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (activeDoc === 'inci-merged') {
    return (
      <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#F9F9F9] text-[#666666]">
            <tr className="border-b border-[#E5E5E5]">
              <th className="px-3 py-2 w-12 text-center font-medium">No</th>
              <th className="px-3 py-2 text-left font-medium">INCI Name</th>
              <th className="px-3 py-2 text-left font-medium">CAS No</th>
              <th className="px-3 py-2 text-left font-medium">Function</th>
              <th className="px-3 py-2 text-right font-medium">%(W/W)</th>
            </tr>
          </thead>
          <tbody>
            {inciMerged.length === 0 ? (
              <EmptyRow message="INCI 데이터가 없습니다." colSpan={5} />
            ) : (
              inciMerged.map((row, index) => (
                <tr key={`${row.inciName}-${index}`} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2 text-center text-[#666666]">{index + 1}</td>
                  <td className="px-3 py-2 text-[#1A1A1A]">{row.inciName}</td>
                  <td className="px-3 py-2 font-mono text-[#666666]">{row.casNo}</td>
                  <td className="px-3 py-2 text-[#666666]">{row.functionName}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                    {row.wtPercent.toFixed(5)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (activeDoc === 'certificate-en') {
    return (
      <div className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <table className="w-full text-xs">
          <thead className="bg-[#F9F9F9] text-[#666666]">
            <tr className="border-b border-[#E5E5E5]">
              <th className="px-3 py-2 text-left font-medium">TEST ITEMS</th>
              <th className="px-3 py-2 text-left font-medium">SPECIFICATIONS</th>
              <th className="px-3 py-2 text-center font-medium">RESULTS</th>
            </tr>
          </thead>
          <tbody>
            {englishSpecs.length === 0 ? (
              <EmptyRow message="영문 성적서 데이터가 없습니다." colSpan={3} />
            ) : (
              englishSpecs.map((spec) => (
                <tr key={spec.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2 text-[#1A1A1A]">{renderDash(spec.test_item_en)}</td>
                  <td className="px-3 py-2 text-[#666666]">{renderDash(spec.specification_en)}</td>
                  <td className="px-3 py-2 text-center text-[#666666]">{renderDash(spec.result || 'Pass')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (activeDoc === 'specs-semi') {
    return <SpecTable specs={semiSpecs} />
  }

  if (activeDoc === 'specs-final') {
    return <SpecTable specs={finalSpecs} />
  }

  if (activeDoc === 'msds') {
    return (
      <div className="space-y-4">
        <section className="border border-[#E5E5E5] bg-white">
          <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
            1. PRODUCT IDENTIFICATION
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 text-xs">
            <MSDSRow label="Product Name" value={product.english_name} />
            <MSDSRow label="Product Code" value={product.product_code} />
            <MSDSRow label="Korean Name" value={product.korean_name} />
            <MSDSRow label="Cosmetic Type" value={product.cosmetic_type} />
          </div>
        </section>

        <section className="border border-[#E5E5E5] bg-white overflow-x-auto">
          <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
            3. COMPOSITION / INFORMATION ON INGREDIENTS
          </div>
          <table className="w-full text-xs">
            <thead className="text-[#666666]">
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-3 py-2 text-left font-medium">INCI Name</th>
                <th className="px-3 py-2 text-left font-medium">CAS No</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {englishIngredients.length === 0 ? (
                <EmptyRow message="성분 정보가 없습니다." colSpan={3} />
              ) : (
                englishIngredients.map((row) => (
                  <tr key={`${row.code}-msds`} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2 text-[#1A1A1A]">{row.ingredientName}</td>
                    <td className="px-3 py-2 font-mono text-[#666666]">{row.casNo}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#1A1A1A]">
                      {row.wtPercent.toFixed(5)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="border border-[#E5E5E5] bg-white">
          <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
            9. PHYSICAL AND CHEMICAL PROPERTIES
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 text-xs">
            <MSDSRow label="Appearance" value={physicalProps.appearance} />
            <MSDSRow label="Odor" value={physicalProps.odor} />
            <MSDSRow label="pH" value={physicalProps.ph} />
            <MSDSRow label="Specific Gravity" value={physicalProps.specificGravity} />
            <MSDSRow label="Viscosity" value={physicalProps.viscosity} />
          </div>
        </section>
      </div>
    )
  }

  if (activeDoc === 'manufacturing') {
    return (
      <div className="space-y-4">
        <section className="border border-[#E5E5E5] bg-white p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <MSDSRow label="배치단위" value={processRecord?.batch_unit || '-'} />
            <MSDSRow label="총소요시간" value={processRecord?.total_time || '-'} />
            <MSDSRow label="담당부서" value={processRecord?.dept_name || '-'} />
            <MSDSRow label="작성자" value={processRecord?.operator || '-'} />
          </div>
        </section>

        <section className="overflow-x-auto border border-[#E5E5E5] bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F9F9F9] text-[#666666]">
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-3 py-2 w-12 text-center font-medium">No</th>
                <th className="px-3 py-2 text-left font-medium">공정명</th>
                <th className="px-3 py-2 text-left font-medium">작업 내용</th>
                <th className="px-3 py-2 w-28 text-center font-medium">작업 시간</th>
              </tr>
            </thead>
            <tbody>
              {processSteps.length === 0 ? (
                <EmptyRow message="제조공정 데이터가 없습니다." colSpan={4} />
              ) : (
                processSteps.map((step) => (
                  <tr key={step.id} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2 text-center text-[#666666]">{step.step_num}</td>
                    <td className="px-3 py-2 text-[#1A1A1A]">{renderDash(step.step_name)}</td>
                    <td className="px-3 py-2 text-[#666666] whitespace-pre-line">
                      {renderDash(step.step_desc)}
                    </td>
                    <td className="px-3 py-2 text-center text-[#666666]">
                      {renderDash(step.work_time)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <table className="w-full text-xs">
          <tbody>
            <KVRow label="제품명" value={product.korean_name} />
            <KVRow label="영문명" value={product.english_name} />
            <KVRow label="제품코드" value={product.product_code} />
            <KVRow label="관리번호" value={product.management_code} />
            <KVRow label="유형" value={product.cosmetic_type} />
            <KVRow label="성상" value={product.appearance} />
            <KVRow label="사용법" value={product.usage_instructions} />
            <KVRow label="효능효과" value={product.functional_claim} />
            <KVRow label="보관방법" value={product.storage_method} />
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto border border-[#E5E5E5] bg-white">
        <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
          개정 이력
        </div>
        <table className="w-full text-xs">
          <thead className="text-[#666666]">
            <tr className="border-b border-[#E5E5E5]">
              <th className="px-3 py-2 w-16 text-center font-medium">No</th>
              <th className="px-3 py-2 w-28 text-center font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Content</th>
            </tr>
          </thead>
          <tbody>
            {(productDetail?.revisions ?? []).length === 0 ? (
              <EmptyRow message="개정 이력이 없습니다." colSpan={3} />
            ) : (
              (productDetail?.revisions ?? []).map((revision) => (
                <tr key={revision.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2 text-center text-[#666666]">
                    {revision.revision_no}
                  </td>
                  <td className="px-3 py-2 text-center text-[#666666]">
                    {formatDate(revision.revision_date)}
                  </td>
                  <td className="px-3 py-2 text-[#1A1A1A]">
                    {renderDash(revision.revision_content)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="border border-[#E5E5E5] bg-white">
        <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F9F9F9] text-xs font-medium text-[#666666]">
          전성분 관리
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 text-xs">
          <div>
            <div className="mb-1 text-[#666666]">국문 전성분</div>
            <div className="min-h-16 border border-[#E5E5E5] p-2 whitespace-pre-wrap text-[#1A1A1A]">
              {renderDash(productDetail?.inci?.inci_ko)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[#666666]">영문 전성분</div>
            <div className="min-h-16 border border-[#E5E5E5] p-2 whitespace-pre-wrap text-[#1A1A1A]">
              {renderDash(productDetail?.inci?.inci_en)}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function KVRow({
  label,
  value,
}: {
  label: string
  value: string | number | null
}) {
  return (
    <tr className="border-b border-[#E5E5E5] last:border-b-0">
      <th className="w-32 px-3 py-2 bg-[#F9F9F9] text-left text-[#666666] font-medium border-r border-[#E5E5E5]">
        {label}
      </th>
      <td className="px-3 py-2 text-[#1A1A1A]">{renderDash(value)}</td>
    </tr>
  )
}

function MSDSRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border border-[#E5E5E5] px-2 py-1.5">
      <span className="text-[#666666]">{label}</span>
      <span className="text-[#1A1A1A] text-right">{renderDash(value)}</span>
    </div>
  )
}
