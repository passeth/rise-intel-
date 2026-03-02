'use server'

import { createClient } from '@/lib/supabase/server'

// 리스팅 페이지 전체 컬럼
export interface LabProductDetail {
  id: string
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  label_volume: string | null
  fill_volume: string | null
  specific_gravity: number | null
  ph_standard: string | null
  viscosity_standard: string | null
  recommended_age: string | null
  raw_material_report: number | null
  standardized_name: number | null
  responsible_seller: number | null
  allergen_korean: string | null
  shelf_life: string | null
  recycling_grade: string | null
  label_position: string | null
  cosmetic_type: string | null
  semi_product_code: string | null
  created_date: string | null
}

export interface LabProductListResult {
  products: LabProductDetail[]
  total: number
}

const SELECT_COLUMNS = [
  'id',
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'label_volume',
  'fill_volume',
  'specific_gravity',
  'ph_standard',
  'viscosity_standard',
  'recommended_age',
  'raw_material_report',
  'standardized_name',
  'responsible_seller',
  'allergen_korean',
  'shelf_life',
  'recycling_grade',
  'label_position',
  'cosmetic_type',
  'semi_product_code',
  'created_date',
].join(', ')

const PAGE_SIZE = 50

export async function fetchLabProducts(
  search: string = '',
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<LabProductListResult> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS, { count: 'exact' })

  if (search) {
    const searchTerm = `%${search}%`
    query = query.or(
      `product_code.ilike.${searchTerm},korean_name.ilike.${searchTerm},english_name.ilike.${searchTerm},management_code.ilike.${searchTerm}`
    )
  }

  const { data, count, error } = await query
    .order('management_code', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (error) {
    console.error('fetchLabProducts error:', error)
    return { products: [], total: 0 }
  }

  return {
    products: (data ?? []) as unknown as LabProductDetail[],
    total: count ?? 0,
  }
}

// 단일 필드 업데이트
export interface UpdateLabProductInput {
  product_code: string
  field: string
  value: string | number | null
}

export interface UpdateLabProductResult {
  success: boolean
  error?: string
}

// 수정 가능한 필드 화이트리스트
const EDITABLE_FIELDS = new Set([
  'management_code',
  'korean_name',
  'english_name',
  'label_volume',
  'fill_volume',
  'specific_gravity',
  'ph_standard',
  'viscosity_standard',
  'recommended_age',
  'raw_material_report',
  'standardized_name',
  'responsible_seller',
  'allergen_korean',
  'shelf_life',
  'recycling_grade',
  'label_position',
  // 제품표준서 추가 필드
  'appearance',
  'cosmetic_type',
  'usage_instructions',
  'dosage',
  'functional_claim',
  'usage_precautions',
  'packaging_unit',
  'storage_method',
])

export async function updateLabProduct(
  input: UpdateLabProductInput
): Promise<UpdateLabProductResult> {
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
    console.error('updateLabProduct error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
