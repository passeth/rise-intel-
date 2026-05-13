'use server'

import { createClient } from '@/lib/supabase/server'

export type PifStatus = 'active' | 'inactive'

export interface PifProduct {
  id: string
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  label_volume: string | null
  cosmetic_type: string | null
  semi_product_code: string | null
  created_date: string | null
  pif_status: PifStatus
}

export interface PifProductListResult {
  products: PifProduct[]
  total: number
  statusCounts: Record<PifStatus, number>
}

const SELECT_COLUMNS = [
  'id',
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'label_volume',
  'cosmetic_type',
  'semi_product_code',
  'created_date',
  'pif_status',
].join(', ')

const SELECT_COLUMNS_LEGACY = [
  'id',
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'label_volume',
  'cosmetic_type',
  'semi_product_code',
  'created_date',
].join(', ')

const DEFAULT_PAGE_SIZE = 50

function normalizeStatus(value: unknown): PifStatus {
  return value === 'inactive' ? 'inactive' : 'active'
}

function mapProduct(row: Record<string, unknown>): PifProduct {
  return {
    id: String(row.id),
    product_code: String(row.product_code),
    management_code: row.management_code as string | null,
    korean_name: row.korean_name as string | null,
    english_name: row.english_name as string | null,
    label_volume: row.label_volume as string | null,
    cosmetic_type: row.cosmetic_type as string | null,
    semi_product_code: row.semi_product_code as string | null,
    created_date: row.created_date as string | null,
    pif_status: normalizeStatus(row.pif_status),
  }
}

async function fetchStatusCounts(): Promise<Record<PifStatus, number>> {
  const supabase = await createClient()
  const counts: Record<PifStatus, number> = { active: 0, inactive: 0 }

  const [active, inactive] = await Promise.all([
    supabase
      .from('labdoc_products')
      .select('id', { count: 'exact', head: true })
      .eq('pif_status', 'active'),
    supabase
      .from('labdoc_products')
      .select('id', { count: 'exact', head: true })
      .eq('pif_status', 'inactive'),
  ])

  if (!active.error) counts.active = active.count ?? 0
  if (!inactive.error) counts.inactive = inactive.count ?? 0
  return counts
}

export async function fetchPifProducts(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  status: PifStatus = 'active'
): Promise<PifProductListResult> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('pif_status', status)

  if (search) {
    const term = `%${search}%`
    query = query.or(
      `product_code.ilike.${term},korean_name.ilike.${term},english_name.ilike.${term},management_code.ilike.${term}`
    )
  }

  const { data, count, error } = await query
    .order('management_code', { ascending: true, nullsFirst: false })
    .order('product_code', { ascending: true })
    .range(from, to)

  if (error && error.message.includes('pif_status')) {
    const legacyCount = await supabase
      .from('labdoc_products')
      .select('id', { count: 'exact', head: true })

    if (status === 'inactive') {
      return {
        products: [],
        total: 0,
        statusCounts: { active: legacyCount.count ?? 0, inactive: 0 },
      }
    }

    let legacyQuery = supabase
      .from('labdoc_products')
      .select(SELECT_COLUMNS_LEGACY, { count: 'exact' })

    if (search) {
      const term = `%${search}%`
      legacyQuery = legacyQuery.or(
        `product_code.ilike.${term},korean_name.ilike.${term},english_name.ilike.${term},management_code.ilike.${term}`
      )
    }

    const legacy = await legacyQuery
      .order('management_code', { ascending: true, nullsFirst: false })
      .order('product_code', { ascending: true })
      .range(from, to)

    if (legacy.error) {
      console.error('fetchPifProducts legacy error:', legacy.error)
      return { products: [], total: 0, statusCounts: { active: 0, inactive: 0 } }
    }

    return {
      products: (legacy.data ?? []).map((row) => mapProduct(row as unknown as Record<string, unknown>)),
      total: legacy.count ?? 0,
      statusCounts: { active: legacyCount.count ?? legacy.count ?? 0, inactive: 0 },
    }
  }

  if (error) {
    console.error('fetchPifProducts error:', error)
    return { products: [], total: 0, statusCounts: { active: 0, inactive: 0 } }
  }

  return {
    products: (data ?? []).map((row) => mapProduct(row as unknown as Record<string, unknown>)),
    total: count ?? 0,
    statusCounts: await fetchStatusCounts(),
  }
}

export interface UpdatePifProductInput {
  product_code: string
  field: string
  value: string | number | null
}

const EDITABLE_FIELDS = new Set([
  'management_code',
  'korean_name',
  'english_name',
  'label_volume',
  'cosmetic_type',
])

export async function updatePifProduct(
  input: UpdatePifProductInput
): Promise<{ success: boolean; error?: string }> {
  if (!EDITABLE_FIELDS.has(input.field)) {
    return { success: false, error: `수정할 수 없는 필드입니다: ${input.field}` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('labdoc_products')
    .update({
      [input.field]: input.value,
      updated_at: new Date().toISOString(),
    })
    .eq('product_code', input.product_code)

  if (error) {
    console.error('updatePifProduct error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updatePifProductStatus(input: {
  productCodes: string[]
  status: PifStatus
}): Promise<{ success: boolean; updated: number; error?: string }> {
  const productCodes = Array.from(new Set(input.productCodes.filter(Boolean)))
  if (productCodes.length === 0) {
    return { success: false, updated: 0, error: '선택된 제품이 없습니다' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('labdoc_products')
    .update({ pif_status: input.status, updated_at: new Date().toISOString() })
    .in('product_code', productCodes)

  if (error) {
    console.error('updatePifProductStatus error:', error)
    return {
      success: false,
      updated: 0,
      error: error.message.includes('pif_status')
        ? 'DB 마이그레이션(sql/002_pif_status_and_product_functions.sql)이 먼저 필요합니다.'
        : error.message,
    }
  }

  return { success: true, updated: productCodes.length }
}
