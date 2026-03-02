'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

export interface ProductInci {
  id: string
  product_code: string
  inci_ko: string | null
  inci_en: string | null
  inci_cpnp: string | null
  inci_fda: string | null
  designated_at: string | null
  created_at: string
  updated_at: string
}

export interface InciCalculationItem {
  inci_name_ko: string
  inci_name_en: string
  cas_number: string | null
  total_percent: number
  is_above_1pct: boolean
}

// Fetch existing INCI data for a product
export async function fetchProductInci(
  productCode: string
): Promise<{ inci: ProductInci | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_product_inci')
    .select('*')
    .eq('product_code', productCode)
    .maybeSingle()

  if (error) {
    console.error('fetchProductInci error:', error)
    return { inci: null, error: error.message }
  }

  return { inci: data as ProductInci | null, error: null }
}

// Calculate INCI list from BOM → Components → INCI merge
export async function calculateInciFromBom(
  productCode: string
): Promise<{ items: InciCalculationItem[]; error: string | null }> {
  const supabase = await createClient()

  // 1. Get semi_product_code
  const { data: product, error: prodErr } = await supabase
    .from('labdoc_products')
    .select('semi_product_code')
    .eq('product_code', productCode)
    .single()

  if (prodErr || !product?.semi_product_code) {
    return { items: [], error: prodErr?.message || '반제품 코드가 없습니다' }
  }

  // 2. Get BOM for semi product
  const { data: bomData, error: bomErr } = await supabase
    .from('bom_master')
    .select('materialcode, materialname, usemount')
    .eq('prdcode', product.semi_product_code)
    .order('usemount', { ascending: false })

  if (bomErr || !bomData || bomData.length === 0) {
    return { items: [], error: bomErr?.message || 'BOM 데이터가 없습니다' }
  }

  // 3. Normalize ingredient codes (same as _lib/utils.ts)
  function normalizeCode(code: string): string {
    if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
      return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
    }
    return code
  }

  const normalizedMap = new Map<string, { materialname: string; totalUsemount: number }>()
  bomData.forEach((item: { materialcode: string | null; materialname: string | null; usemount: number | null }) => {
    if (!item.materialcode) return
    const baseCode = normalizeCode(item.materialcode)
    const existing = normalizedMap.get(baseCode)
    if (existing) {
      existing.totalUsemount += item.usemount ?? 0
    } else {
      normalizedMap.set(baseCode, {
        materialname: item.materialname ?? baseCode,
        totalUsemount: item.usemount ?? 0,
      })
    }
  })

  // 4. Get components for all base codes
  const baseCodes = Array.from(normalizedMap.keys())
  const { data: componentsData } = await supabase
    .from('labdoc_ingredient_components')
    .select('*')
    .in('ingredient_code', baseCodes)
    .order('component_order', { ascending: true })

  // 5. Merge: each raw material's usemount × component's composition_ratio / 100
  //    Sum up same INCI names across all raw materials
  const inciMergeMap = new Map<
    string,
    { inci_name_ko: string; inci_name_en: string; cas_number: string | null; total_percent: number }
  >()

  for (const [baseCode, bomInfo] of normalizedMap) {
    const rawWtPercent = bomInfo.totalUsemount / 1000 // usemount is ×100000, divide by 1000 → %
    const comps = (componentsData ?? []).filter(
      (c: { ingredient_code: string }) => c.ingredient_code === baseCode
    )

    if (comps.length === 0) {
      // No component breakdown — treat as single ingredient
      const key = bomInfo.materialname
      const existing = inciMergeMap.get(key)
      if (existing) {
        existing.total_percent += rawWtPercent
      } else {
        inciMergeMap.set(key, {
          inci_name_ko: bomInfo.materialname,
          inci_name_en: bomInfo.materialname,
          cas_number: null,
          total_percent: rawWtPercent,
        })
      }
    } else {
      for (const comp of comps) {
        const ratio = comp.composition_ratio ?? 100
        const inciPercent = (rawWtPercent * ratio) / 100
        const key = comp.inci_name_en || comp.inci_name_kr || `unknown-${comp.id}`

        const existing = inciMergeMap.get(key)
        if (existing) {
          existing.total_percent += inciPercent
        } else {
          inciMergeMap.set(key, {
            inci_name_ko: comp.inci_name_kr || comp.inci_name_en || bomInfo.materialname,
            inci_name_en: comp.inci_name_en || comp.inci_name_kr || bomInfo.materialname,
            cas_number: comp.cas_number || null,
            total_percent: inciPercent,
          })
        }
      }
    }
  }

  // 6. Sort by total_percent descending
  const items: InciCalculationItem[] = Array.from(inciMergeMap.values())
    .sort((a, b) => b.total_percent - a.total_percent)
    .map((item) => ({
      ...item,
      is_above_1pct: item.total_percent >= 1.0,
    }))

  return { items, error: null }
}

// Save (upsert) INCI data
export async function saveProductInci(data: {
  product_code: string
  inci_ko: string
  inci_en: string
  inci_cpnp?: string
  inci_fda?: string
  designated_at?: string
  author?: string
}): Promise<{ inci: ProductInci | null; error?: string }> {
  const supabase = await createClient()

  const { data: result, error } = await fromTable(supabase, 'labdoc_product_inci')
    .upsert(
      {
        product_code: data.product_code,
        inci_ko: data.inci_ko || null,
        inci_en: data.inci_en || null,
        inci_cpnp: data.inci_cpnp || null,
        inci_fda: data.inci_fda || null,
        designated_at: data.designated_at || null,
        author: data.author || null,
      },
      { onConflict: 'product_code' }
    )
    .select()
    .single()

  if (error) {
    console.error('saveProductInci error:', error)
    return { inci: null, error: error.message }
  }

  return { inci: result as ProductInci }
}

// Delete INCI data
export async function deleteProductInci(
  productCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await fromTable(supabase, 'labdoc_product_inci')
    .delete()
    .eq('product_code', productCode)

  if (error) {
    console.error('deleteProductInci error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
