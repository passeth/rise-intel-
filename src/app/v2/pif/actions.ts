'use server'

import { createClient } from '@/lib/supabase/server'



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
}

export interface PifProductListResult {
  products: PifProduct[]
  total: number
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
].join(', ')

const DEFAULT_PAGE_SIZE = 50

export async function fetchPifProducts(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PifProductListResult> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS, { count: 'exact' })

  if (search) {
    const term = `%${search}%`
    query = query.or(
      `product_code.ilike.${term},korean_name.ilike.${term},english_name.ilike.${term},management_code.ilike.${term}`
    )
  }

  const { data, count, error } = await query
    .order('management_code', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (error) {
    console.error('fetchPifProducts error:', error)
    return { products: [], total: 0 }
  }

  return {
    products: (data ?? []) as unknown as PifProduct[],
    total: count ?? 0,
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
