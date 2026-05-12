'use server'

import { createClient } from '@/lib/supabase/server'

export interface QuickLinkInput {
  productCode: string
  semiProductCode: string
  koreanName?: string
  englishName?: string
}

export async function quickLinkBom(input: QuickLinkInput) {
  const supabase = await createClient()

  // Validate semi_product_code exists in bom_master
  const { data: bomCheck, error: bomErr } = await supabase
    .from('bom_master')
    .select('prdcode')
    .eq('prdcode', input.semiProductCode)
    .limit(1)

  if (bomErr) {
    return { success: false, error: bomErr.message }
  }

  if (!bomCheck || bomCheck.length === 0) {
    return { success: false, error: `BOM 데이터를 찾을 수 없습니다: ${input.semiProductCode}` }
  }

  // Check if labdoc_products already exists
  const { data: existing } = await supabase
    .from('labdoc_products')
    .select('id')
    .eq('product_code', input.productCode)
    .maybeSingle()

  if (existing) {
    // Update semi_product_code only
    const { error } = await supabase
      .from('labdoc_products')
      .update({
        semi_product_code: input.semiProductCode,
        updated_at: new Date().toISOString(),
      })
      .eq('product_code', input.productCode)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // Create minimal labdoc_products record
  const { error } = await supabase
    .from('labdoc_products')
    .insert({
      product_code: input.productCode,
      semi_product_code: input.semiProductCode,
      korean_name: input.koreanName || null,
      english_name: input.englishName || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (error) {
    if (error.code === '23505') return { success: false, error: '이미 존재하는 제품코드입니다.' }
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Search bom_master prdcode for autocomplete
export async function searchBomPrdcodes(query: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('bom_master')
    .select('prdcode')
    .ilike('prdcode', `%${query}%`)
    .limit(50)

  if (!data) return []

  const unique = [...new Set(data.map((r) => r.prdcode as string))]
  return unique.slice(0, 20)
}
