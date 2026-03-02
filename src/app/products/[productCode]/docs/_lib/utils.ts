import { createClient } from '@/lib/supabase/client'

// 원료코드 정규화: MXD-0002A-1 → MXD-0002
export function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

export function getSupabase() {
  return createClient()
}

// 공통 타입
export interface BomRawItem {
  materialcode: string | null
  materialname: string | null
  usemount: number | null
}

export interface NormalizedBomItem {
  baseCode: string
  materialname: string
  totalUsemount: number
  components: IngredientComponentRow[]
}

export interface IngredientComponentRow {
  id: string
  ingredient_code: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number | null
  country_of_origin: string | null
  created_at: string | null
}

export interface LabProduct {
  id: string
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  appearance: string | null
  packaging_unit: string | null
  created_date: string | null
  author: string | null
  usage_instructions: string | null
  allergen_korean: string | null
  allergen_english: string | null
  storage_method: string | null
  shelf_life: string | null
  label_volume: string | null
  fill_volume: string | null
  specific_gravity: number | null
  ph_standard: string | null
  viscosity_standard: string | null
  functional_claim: string | null
  semi_product_code: string | null
  p_product_code: string | null
  cosmetic_type: string | null
  dosage: string | null
  usage_precautions: string | null
  remarks: string | null
}

// 공통 BOM + Components 페치 로직
export async function fetchProductWithBom(productCode: string) {
  const supabase = getSupabase()

  const { data: product, error: productErr } = await supabase
    .from('labdoc_products')
    .select('*')
    .eq('product_code', productCode)
    .single()

  if (productErr) {
    if (productErr.code === 'PGRST116') {
      return { product: null, bomItems: [], error: '품목을 찾을 수 없습니다' }
    }
    return { product: null, bomItems: [], error: productErr.message }
  }

  let bomItems: NormalizedBomItem[] = []

  if (product.semi_product_code) {
    const { data: bomData, error: bomErr } = await supabase
      .from('bom_master')
      .select('materialcode, materialname, usemount')
      .eq('prdcode', product.semi_product_code)
      .order('usemount', { ascending: false })

    if (!bomErr && bomData && bomData.length > 0) {
      const normalizedMap = new Map<string, { materialname: string; totalUsemount: number }>()

      ;(bomData as BomRawItem[]).forEach((item) => {
        if (!item.materialcode) return
        const baseCode = normalizeIngredientCode(item.materialcode)
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

      const baseCodes = Array.from(normalizedMap.keys())

      const { data: componentsData } = await supabase
        .from('labdoc_ingredient_components')
        .select('*')
        .in('ingredient_code', baseCodes)
        .order('component_order', { ascending: true })

      const componentsMap = new Map<string, IngredientComponentRow[]>()
      ;(componentsData ?? []).forEach((comp) => {
        const existing = componentsMap.get(comp.ingredient_code) ?? []
        existing.push(comp as IngredientComponentRow)
        componentsMap.set(comp.ingredient_code, existing)
      })

      bomItems = Array.from(normalizedMap.entries())
        .map(([baseCode, data]) => ({
          baseCode,
          materialname: data.materialname,
          totalUsemount: data.totalUsemount,
          components: componentsMap.get(baseCode) ?? [],
        }))
        .sort((a, b) => b.totalUsemount - a.totalUsemount)
    }
  }

  return { product: product as LabProduct, bomItems, error: null }
}
