import { createClient } from '@/lib/supabase/server'
import type { NormalizedBomItem, IngredientComponentRow, LabProduct, BomRawItem } from './utils'
import { normalizeIngredientCode } from './utils'

export { type NormalizedBomItem, type IngredientComponentRow, type LabProduct }

export async function fetchProductWithBomServer(productCode: string) {
  const supabase = await createClient()

  const { data: product, error: productErr } = await supabase
    .from('labdoc_products')
    .select('*')
    .eq('product_code', productCode)
    .single()

  if (productErr) {
    if (productErr.code === 'PGRST116') {
      return { product: null, bomItems: [] as NormalizedBomItem[], error: null, productNotFound: true }
    }
    return { product: null, bomItems: [] as NormalizedBomItem[], error: productErr.message, productNotFound: false }
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

  return { product: product as LabProduct, bomItems, error: null, productNotFound: false }
}
