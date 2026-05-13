'use server'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_FLAMMABILITY_THRESHOLDS,
  getAlcoholRiskLevel,
  isAlcoholComponentName,
  normalizeFlammabilityThresholds,
  normalizeIngredientCodeForMsds,
  parseNumericValue,
} from '@/lib/msds/flammability'

export type PifStatus = 'active' | 'inactive'

export interface ManageProduct {
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  semi_product_code: string | null
  p_product_code: string | null
  cosmetic_type: string | null
  msds_alcohol_content: number | null
  msds_flammability: string | null
  msds_type: string | null
  created_date: string | null
  author: string | null
  pif_status: PifStatus
}

export interface ManageProductListResult {
  products: ManageProduct[]
  total: number
  statusCounts: Record<PifStatus, number>
}

export type ManageSortField =
  | 'management_code'
  | 'product_code'
  | 'korean_name'
  | 'msds_type'
  | 'msds_alcohol_content'
  | 'msds_flammability'
  | 'created_date'

export type ManageSortDirection = 'asc' | 'desc'

export interface ManageListOptions {
  status?: PifStatus
  flammabilityFilter?: 'all' | 'non_flammable' | 'caution' | 'flammable'
  sortField?: ManageSortField
  sortDirection?: ManageSortDirection
}

const SELECT_COLUMNS = [
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'semi_product_code',
  'p_product_code',
  'cosmetic_type',
  'msds_alcohol_content',
  'msds_flammability',
  'msds_type',
  'created_date',
  'author',
  'pif_status',
].join(', ')

const SELECT_COLUMNS_LEGACY = [
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'semi_product_code',
  'p_product_code',
  'cosmetic_type',
  'msds_alcohol_content',
  'msds_flammability',
  'msds_type',
  'created_date',
  'author',
].join(', ')

const BULK_EDITABLE_FIELDS = new Set(['cosmetic_type', 'msds_type', 'msds_flammability'])

function normalizeStatus(value: unknown): PifStatus {
  return value === 'inactive' ? 'inactive' : 'active'
}

function mapManageProduct(row: Record<string, unknown>): ManageProduct {
  return {
    product_code: String(row.product_code),
    management_code: row.management_code as string | null,
    korean_name: row.korean_name as string | null,
    english_name: row.english_name as string | null,
    semi_product_code: row.semi_product_code as string | null,
    p_product_code: row.p_product_code as string | null,
    cosmetic_type: row.cosmetic_type as string | null,
    msds_alcohol_content: row.msds_alcohol_content as number | null,
    msds_flammability: row.msds_flammability as string | null,
    msds_type: row.msds_type as string | null,
    created_date: row.created_date as string | null,
    author: row.author as string | null,
    pif_status: normalizeStatus(row.pif_status),
  }
}

async function fetchManageStatusCounts(): Promise<Record<PifStatus, number>> {
  const supabase = await createClient()
  const counts: Record<PifStatus, number> = { active: 0, inactive: 0 }

  const [active, inactive] = await Promise.all([
    supabase
      .from('labdoc_products')
      .select('product_code', { count: 'exact', head: true })
      .eq('pif_status', 'active'),
    supabase
      .from('labdoc_products')
      .select('product_code', { count: 'exact', head: true })
      .eq('pif_status', 'inactive'),
  ])

  if (!active.error) counts.active = active.count ?? 0
  if (!inactive.error) counts.inactive = inactive.count ?? 0

  return counts
}

export interface MsdsTypeBulkUpdateItem {
  product_code: string
  msds_type: string
}

export interface MsdsFlammabilitySettings {
  caution_threshold: number
  flammable_threshold: number
}

export async function fetchMsdsFlammabilitySettings(): Promise<MsdsFlammabilitySettings> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_msds_settings')
    .select('caution_threshold, flammable_threshold')
    .eq('setting_key', 'default')
    .single()

  if (error || !data) {
    return {
      caution_threshold: DEFAULT_FLAMMABILITY_THRESHOLDS.cautionThreshold,
      flammable_threshold: DEFAULT_FLAMMABILITY_THRESHOLDS.flammableThreshold,
    }
  }

  const thresholds = normalizeFlammabilityThresholds({
    cautionThreshold: parseNumericValue(data.caution_threshold),
    flammableThreshold: parseNumericValue(data.flammable_threshold),
  })

  return {
    caution_threshold: thresholds.cautionThreshold,
    flammable_threshold: thresholds.flammableThreshold,
  }
}

export async function updateMsdsFlammabilitySettings(
  cautionThreshold: number,
  flammableThreshold: number
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeFlammabilityThresholds({
    cautionThreshold,
    flammableThreshold,
  })

  if (normalized.flammableThreshold <= normalized.cautionThreshold) {
    return {
      success: false,
      error: '인화성 기준값은 주의 기준값보다 커야 합니다',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('labdoc_msds_settings')
    .upsert({
      setting_key: 'default',
      caution_threshold: normalized.cautionThreshold,
      flammable_threshold: normalized.flammableThreshold,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function fetchManageProducts(
  search: string,
  page: number,
  pageSize: number,
  options?: ManageListOptions
): Promise<ManageProductListResult> {
  const supabase = await createClient()

  const from = Math.max(0, page - 1) * pageSize
  const to = from + pageSize - 1

  const status = options?.status ?? 'active'
  const buildQuery = (withStatus: boolean, selectColumns = SELECT_COLUMNS) => {
    let nextQuery = supabase
      .from('labdoc_products')
      .select(selectColumns, { count: 'exact' })

    if (withStatus) {
      nextQuery = nextQuery.eq('pif_status', status)
    }

    return nextQuery
  }

  let query = buildQuery(true)

  const trimmedSearch = search.trim()
  if (trimmedSearch.length > 0) {
    const term = `%${trimmedSearch}%`
    query = query.or(
      `product_code.ilike.${term},korean_name.ilike.${term},management_code.ilike.${term},cosmetic_type.ilike.${term},msds_type.ilike.${term},msds_flammability.ilike.${term}`
    )
  }

  if (options?.flammabilityFilter && options.flammabilityFilter !== 'all') {
    query = query.eq('msds_flammability', options.flammabilityFilter)
  }

  const sortField = options?.sortField ?? 'management_code'
  const sortDirection = options?.sortDirection ?? 'asc'
  const statusCounts = await fetchManageStatusCounts()

  let { data, count, error } = await query
    .order(sortField, { ascending: sortDirection === 'asc', nullsFirst: false })
    .range(from, to)

  if (error && error.message.includes('pif_status')) {
    if (status === 'inactive') {
      return {
        products: [],
        total: 0,
        statusCounts,
      }
    }

    const fallback = await buildQuery(false, SELECT_COLUMNS_LEGACY)
      .order(sortField, { ascending: sortDirection === 'asc', nullsFirst: false })
      .range(from, to)
    data = fallback.data
    count = fallback.count
    error = fallback.error
  }

  if (error) {
    console.error('fetchManageProducts error:', error)
    return { products: [], total: 0, statusCounts }
  }

  return {
    products: (data ?? []).map((row) => mapManageProduct(row as unknown as Record<string, unknown>)),
    total: count ?? 0,
    statusCounts,
  }
}

export async function updateManageProductStatus(input: {
  productCodes: string[]
  status: PifStatus
}): Promise<{ success: boolean; error?: string; updatedCount: number }> {
  const uniqueProductCodes = Array.from(new Set(input.productCodes.filter(Boolean)))
  if (uniqueProductCodes.length === 0) {
    return { success: false, error: '선택된 제품이 없습니다', updatedCount: 0 }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('labdoc_products')
    .update({
      pif_status: input.status,
      updated_at: new Date().toISOString(),
    })
    .in('product_code', uniqueProductCodes)

  if (error) {
    console.error('updateManageProductStatus error:', error)
    return {
      success: false,
      error: error.message.includes('pif_status')
        ? 'DB 마이그레이션(sql/002_pif_status_and_product_functions.sql)이 먼저 필요합니다.'
        : error.message,
      updatedCount: 0,
    }
  }

  return {
    success: true,
    updatedCount: uniqueProductCodes.length,
  }
}

export async function bulkUpdateProducts(
  productCodes: string[],
  field: string,
  value: string | number | boolean | null
): Promise<{ success: boolean; error?: string; updatedCount: number }> {
  if (!BULK_EDITABLE_FIELDS.has(field)) {
    return {
      success: false,
      error: `일괄 수정할 수 없는 필드입니다: ${field}`,
      updatedCount: 0,
    }
  }

  const uniqueProductCodes = Array.from(new Set(productCodes.filter(Boolean)))
  if (uniqueProductCodes.length === 0) {
    return { success: true, updatedCount: 0 }
  }

  const supabase = await createClient()

  let updatedCount = 0
  let firstError: string | undefined

  for (const productCode of uniqueProductCodes) {
    const { error } = await supabase
      .from('labdoc_products')
      .update({
        [field]: value,
      })
      .eq('product_code', productCode)

    if (error) {
      console.error('bulkUpdateProducts error:', error)
      if (!firstError) {
        firstError = error.message
      }
      continue
    }

    updatedCount += 1
  }

  if (firstError) {
    return {
      success: false,
      error: firstError,
      updatedCount,
    }
  }

  return {
    success: true,
    updatedCount,
  }
}

export async function bulkUpdateMsdsTypes(
  items: MsdsTypeBulkUpdateItem[]
): Promise<{ success: boolean; error?: string; updatedCount: number; failedCodes: string[] }> {
  const normalizedItems = items
    .map((item) => ({
      product_code: item.product_code.trim(),
      msds_type: item.msds_type.trim(),
    }))
    .filter((item) => item.product_code.length > 0 && item.msds_type.length > 0)

  if (normalizedItems.length === 0) {
    return {
      success: false,
      error: '업데이트할 유효한 항목이 없습니다',
      updatedCount: 0,
      failedCodes: [],
    }
  }

  const supabase = await createClient()
  let updatedCount = 0
  const failedCodes: string[] = []
  let firstError: string | undefined

  for (const item of normalizedItems) {
    const { error } = await supabase
      .from('labdoc_products')
      .update({ msds_type: item.msds_type })
      .eq('product_code', item.product_code)

    if (error) {
      console.error('bulkUpdateMsdsTypes error:', error)
      failedCodes.push(item.product_code)
      if (!firstError) {
        firstError = error.message
      }
      continue
    }

    updatedCount += 1
  }

  if (failedCodes.length > 0) {
    return {
      success: false,
      error: firstError ?? '일부 항목 업데이트에 실패했습니다',
      updatedCount,
      failedCodes,
    }
  }

  return {
    success: true,
    updatedCount,
    failedCodes: [],
  }
}

type BomRow = {
  prdcode: string | null
  materialcode: string | null
  usemount: number | null
}

type ComponentRow = {
  ingredient_code: string
  inci_name_en: string | null
  composition_ratio: number | null
}

export async function reevaluateFlammabilityByProductCodes(
  productCodes: string[]
): Promise<{ success: boolean; error?: string; updatedCount: number }> {
  const uniqueProductCodes = Array.from(new Set(productCodes.map((code) => code.trim()).filter(Boolean)))
  if (uniqueProductCodes.length === 0) {
    return { success: true, updatedCount: 0 }
  }

  const supabase = await createClient()
  const thresholds = await fetchMsdsFlammabilitySettings()

  const { data: productRows, error: productError } = await supabase
    .from('labdoc_products')
    .select('product_code, semi_product_code')
    .in('product_code', uniqueProductCodes)

  if (productError) {
    console.error('reevaluateFlammabilityByProductCodes product fetch error:', productError)
    return { success: false, error: productError.message, updatedCount: 0 }
  }

  const semiCodes = Array.from(
    new Set((productRows ?? []).map((row) => row.semi_product_code).filter((code): code is string => Boolean(code)))
  )

  let bomRows: BomRow[] = []
  if (semiCodes.length > 0) {
    const { data: bomData, error: bomError } = await supabase
      .from('bom_master')
      .select('prdcode, materialcode, usemount')
      .in('prdcode', semiCodes)
      .eq('품목구분', '[원재료]')

    if (bomError) {
      console.error('reevaluateFlammabilityByProductCodes bom fetch error:', bomError)
      return { success: false, error: bomError.message, updatedCount: 0 }
    }
    bomRows = (bomData ?? []) as BomRow[]
  }

  const normalizedIngredientCodes = Array.from(
    new Set(
      bomRows
        .map((row) => row.materialcode)
        .filter((code): code is string => Boolean(code))
        .map((code) => normalizeIngredientCodeForMsds(code))
    )
  )

  let componentRows: ComponentRow[] = []
  if (normalizedIngredientCodes.length > 0) {
    const { data: compData, error: compError } = await supabase
      .from('labdoc_ingredient_components')
      .select('ingredient_code, inci_name_en, composition_ratio')
      .in('ingredient_code', normalizedIngredientCodes)

    if (compError) {
      console.error('reevaluateFlammabilityByProductCodes component fetch error:', compError)
      return { success: false, error: compError.message, updatedCount: 0 }
    }
    componentRows = (compData ?? []) as ComponentRow[]
  }

  const alcoholRatioByIngredient = new Map<string, number>()
  componentRows.forEach((component) => {
    if (!isAlcoholComponentName(component.inci_name_en)) {
      return
    }
    const ratio = parseNumericValue(component.composition_ratio)
    if (ratio <= 0) {
      return
    }
    const current = alcoholRatioByIngredient.get(component.ingredient_code) || 0
    alcoholRatioByIngredient.set(component.ingredient_code, current + ratio)
  })

  const bomBySemiCode = new Map<string, BomRow[]>()
  bomRows.forEach((row) => {
    if (!row.prdcode) {
      return
    }
    const current = bomBySemiCode.get(row.prdcode) ?? []
    current.push(row)
    bomBySemiCode.set(row.prdcode, current)
  })

  let updatedCount = 0

  for (const row of productRows ?? []) {
    let alcoholContent = 0

    if (row.semi_product_code) {
      const productBomRows = bomBySemiCode.get(row.semi_product_code) ?? []
      const totalUsemount = productBomRows.reduce((sum, bom) => sum + parseNumericValue(bom.usemount), 0)

      if (totalUsemount > 0) {
        const alcoholEquivalent = productBomRows.reduce((sum, bom) => {
          if (!bom.materialcode) {
            return sum
          }
          const normalizedCode = normalizeIngredientCodeForMsds(bom.materialcode)
          const alcoholRatio = alcoholRatioByIngredient.get(normalizedCode) || 0
          return sum + (parseNumericValue(bom.usemount) * alcoholRatio / 100)
        }, 0)
        alcoholContent = Number(((alcoholEquivalent / totalUsemount) * 100).toFixed(2))
      }
    }

    const riskLevel = getAlcoholRiskLevel(alcoholContent, {
      cautionThreshold: thresholds.caution_threshold,
      flammableThreshold: thresholds.flammable_threshold,
    })

    const { error: updateError } = await supabase
      .from('labdoc_products')
      .update({
        msds_alcohol_content: alcoholContent,
        msds_flammability: riskLevel,
      })
      .eq('product_code', row.product_code)

    if (updateError) {
      console.error('reevaluateFlammabilityByProductCodes update error:', updateError)
      return {
        success: false,
        error: updateError.message,
        updatedCount,
      }
    }

    updatedCount += 1
  }

  return {
    success: true,
    updatedCount,
  }
}
