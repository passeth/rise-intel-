'use server'

import { createClient } from '@/lib/supabase/server'

export interface ManageProduct {
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  semi_product_code: string | null
  p_product_code: string | null
  cosmetic_type: string | null
  created_date: string | null
  author: string | null
}

export interface ManageProductListResult {
  products: ManageProduct[]
  total: number
}

const SELECT_COLUMNS = [
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'semi_product_code',
  'p_product_code',
  'cosmetic_type',
  'created_date',
  'author',
].join(', ')

const BULK_EDITABLE_FIELDS = new Set(['cosmetic_type'])

export async function fetchManageProducts(
  search: string,
  page: number,
  pageSize: number
): Promise<ManageProductListResult> {
  const supabase = await createClient()

  const from = Math.max(0, page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('labdoc_products')
    .select(SELECT_COLUMNS, { count: 'exact' })

  const trimmedSearch = search.trim()
  if (trimmedSearch.length > 0) {
    const term = `%${trimmedSearch}%`
    query = query.or(
      `product_code.ilike.${term},korean_name.ilike.${term},management_code.ilike.${term}`
    )
  }

  const { data, count, error } = await query
    .order('management_code', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (error) {
    console.error('fetchManageProducts error:', error)
    return { products: [], total: 0 }
  }

  return {
    products: (data ?? []) as unknown as ManageProduct[],
    total: count ?? 0,
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
