'use server'

import { createClient } from '@/lib/supabase/server'

export interface SupplierDocumentStatus {
  product_code: string
  korean_name: string | null
  english_name: string | null
  total_ingredients: number
  coa_count: number
  msds_count: number
  composition_count: number
  ifra_count: number
  coa_coverage: number
  msds_coverage: number
  composition_coverage: number
  ifra_coverage: number
  overall_coverage: number
  missing_details: MissingDocDetail[]
}

export interface MissingDocDetail {
  ingredient_code: string
  ingredient_name: string | null
  missing: string[]
}

export interface SupplierDocumentStatusResult {
  items: SupplierDocumentStatus[]
  total: number
}

interface ProductRow {
  product_code: string
  korean_name: string | null
  english_name: string | null
  management_code: string | null
  semi_product_code: string | null
}

interface BomRow {
  prdcode: string
  materialcode: string | null
  materialname: string | null
}

interface IngredientDocRow {
  ingredient_code: string
  ingredient_name: string | null
  coa_urls: unknown
  msds_en_urls: unknown
  composition_urls: unknown
  fragrance_urls: unknown
}

interface IngredientDocStatus {
  ingredient_name: string | null
  hasCoa: boolean
  hasMsds: boolean
  hasComposition: boolean
  hasIfra: boolean
}

const SELECT_COLUMNS = [
  'product_code',
  'korean_name',
  'english_name',
  'management_code',
  'semi_product_code',
].join(', ')

const DEFAULT_PAGE_SIZE = 50

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

function hasUploadedUrls(value: unknown): boolean {
  return Array.isArray(value) && value.some((url) => typeof url === 'string' && url.trim().length > 0)
}

function toCoverage(count: number, total: number): number {
  if (total === 0) return 0
  return Number(((count / total) * 100).toFixed(1))
}

export async function fetchSupplierDocumentStatus(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<SupplierDocumentStatusResult> {
  const supabase = await createClient()

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  let query = supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS, { count: 'exact' })

  if (search) {
    const term = `%${search}%`
    query = query.or(
      `product_code.ilike.${term},korean_name.ilike.${term},english_name.ilike.${term},management_code.ilike.${term}`
    )
  }

  const { data: productsData, count, error: productsError } = await query
    .order('management_code', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (productsError) {
    console.error('fetchSupplierDocumentStatus products error:', productsError)
    return { items: [], total: 0 }
  }

  const products = (productsData ?? []) as unknown as ProductRow[]
  if (products.length === 0) {
    return { items: [], total: count ?? 0 }
  }

  return {
    items: await buildSupplierDocumentStatusItems(supabase, products),
    total: count ?? 0,
  }
}

export async function fetchSupplierDocumentStatusForProduct(
  productCode: string
): Promise<SupplierDocumentStatus | null> {
  const trimmedProductCode = productCode.trim()
  if (!trimmedProductCode) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS)
    .eq('product_code', trimmedProductCode)
    .maybeSingle()

  if (error) {
    console.error('fetchSupplierDocumentStatusForProduct product error:', error)
    return null
  }

  if (!data) {
    return null
  }

  const [item] = await buildSupplierDocumentStatusItems(supabase, [data as unknown as ProductRow])
  return item ?? null
}

async function buildSupplierDocumentStatusItems(
  supabase: SupabaseServerClient,
  products: ProductRow[]
): Promise<SupplierDocumentStatus[]> {
  const semiProductCodes = Array.from(
    new Set(products.map((product) => product.semi_product_code).filter((code): code is string => Boolean(code)))
  )

  const bomBySemiProductCode = new Map<string, Set<string>>()
  const bomIngredientNameBySemiProductCode = new Map<string, Map<string, string>>()

  if (semiProductCodes.length > 0) {
    const { data: bomData, error: bomError } = await supabase
      .from('bom_master')
      .select('prdcode, materialcode, materialname')
      .in('prdcode', semiProductCodes)
      .eq('품목구분', '[원재료]')

    if (bomError) {
      console.error('fetchSupplierDocumentStatus bom error:', bomError)
    } else {
      for (const row of (bomData ?? []) as BomRow[]) {
        if (!row.prdcode || !row.materialcode) continue

        const normalizedCode = normalizeIngredientCode(row.materialcode)
        if (!normalizedCode) continue

        const codeSet = bomBySemiProductCode.get(row.prdcode) ?? new Set<string>()
        codeSet.add(normalizedCode)
        bomBySemiProductCode.set(row.prdcode, codeSet)

        const nameMap = bomIngredientNameBySemiProductCode.get(row.prdcode) ?? new Map<string, string>()
        if (row.materialname && !nameMap.has(normalizedCode)) {
          nameMap.set(normalizedCode, row.materialname)
        }
        bomIngredientNameBySemiProductCode.set(row.prdcode, nameMap)
      }
    }
  }

  const allIngredientCodes = Array.from(
    new Set(Array.from(bomBySemiProductCode.values()).flatMap((set) => Array.from(set.values())))
  )

  const ingredientStatusByCode = new Map<string, IngredientDocStatus>()

  if (allIngredientCodes.length > 0) {
    const { data: ingredientData, error: ingredientsError } = await supabase
      .from('labdoc_ingredients')
      .select('ingredient_code, ingredient_name, coa_urls, msds_en_urls, composition_urls, fragrance_urls')
      .in('ingredient_code', allIngredientCodes)

    if (ingredientsError) {
      console.error('fetchSupplierDocumentStatus ingredients error:', ingredientsError)
    } else {
      for (const row of (ingredientData ?? []) as IngredientDocRow[]) {
        ingredientStatusByCode.set(row.ingredient_code, {
          ingredient_name: row.ingredient_name ?? null,
          hasCoa: hasUploadedUrls(row.coa_urls),
          hasMsds: hasUploadedUrls(row.msds_en_urls),
          hasComposition: hasUploadedUrls(row.composition_urls),
          hasIfra: hasUploadedUrls(row.fragrance_urls),
        })
      }
    }
  }

  const items: SupplierDocumentStatus[] = products.map((product) => {
    const ingredientCodes = product.semi_product_code
      ? Array.from(bomBySemiProductCode.get(product.semi_product_code) ?? [])
      : []
    const totalIngredients = ingredientCodes.length

    let coaCount = 0
    let msdsCount = 0
    let compositionCount = 0
    let ifraCount = 0

    const missingDetails: MissingDocDetail[] = []
    const bomNameMap = product.semi_product_code
      ? bomIngredientNameBySemiProductCode.get(product.semi_product_code) ?? new Map<string, string>()
      : new Map<string, string>()

    for (const ingredientCode of ingredientCodes) {
      const status = ingredientStatusByCode.get(ingredientCode)

      const hasCoa = status?.hasCoa ?? false
      const hasMsds = status?.hasMsds ?? false
      const hasComposition = status?.hasComposition ?? false
      const hasIfra = status?.hasIfra ?? false

      if (hasCoa) coaCount += 1
      if (hasMsds) msdsCount += 1
      if (hasComposition) compositionCount += 1
      if (hasIfra) ifraCount += 1

      const missing: string[] = []
      if (!hasCoa) missing.push('COA')
      if (!hasMsds) missing.push('MSDS')
      if (!hasComposition) missing.push('Composition')
      if (!hasIfra) missing.push('IFRA')

      if (missing.length > 0) {
        missingDetails.push({
          ingredient_code: ingredientCode,
          ingredient_name: status?.ingredient_name ?? bomNameMap.get(ingredientCode) ?? null,
          missing,
        })
      }
    }

    const coaCoverage = toCoverage(coaCount, totalIngredients)
    const msdsCoverage = toCoverage(msdsCount, totalIngredients)
    const compositionCoverage = toCoverage(compositionCount, totalIngredients)
    const ifraCoverage = toCoverage(ifraCount, totalIngredients)
    const overallCoverage =
      totalIngredients === 0
        ? 0
        : Number(((coaCoverage + msdsCoverage + compositionCoverage + ifraCoverage) / 4).toFixed(1))

    return {
      product_code: product.product_code,
      korean_name: product.korean_name,
      english_name: product.english_name,
      total_ingredients: totalIngredients,
      coa_count: coaCount,
      msds_count: msdsCount,
      composition_count: compositionCount,
      ifra_count: ifraCount,
      coa_coverage: coaCoverage,
      msds_coverage: msdsCoverage,
      composition_coverage: compositionCoverage,
      ifra_coverage: ifraCoverage,
      overall_coverage: overallCoverage,
      missing_details: missingDetails,
    }
  })
  return items
}
