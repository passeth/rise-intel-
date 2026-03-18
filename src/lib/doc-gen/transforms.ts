import type { NormalizedBomItem, IngredientComponentRow } from '@/app/products/[productCode]/docs/_lib/utils'
import type { IngredientsEnRow, FragranceAllergenRow, BreakdownRow, InciSummaryRow } from './types'

const FRAGRANCE_ALLERGEN_CAS = new Set([
  '5989-27-5', '80-56-8', '127-91-3', '5989-54-8', '99-87-6', '470-82-6',
  '78-70-6', '106-22-9', '106-24-1', '7540-51-4', '5392-40-5', '91-64-5',
  '97-53-0', '97-54-1', '104-55-2', '103-41-3', '118-58-1', '100-51-6',
  '120-51-4', '122-40-7', '101-86-0', '105-13-5', '80-54-6', '4602-84-0',
  '31906-04-4', '90-17-5', '111-12-6', '107-75-5', '6259-76-3', '1222-05-5',
  '21145-77-7', '141-10-6',
])

export function transformIngredientsEn(bomItems: NormalizedBomItem[]): {
  rows: IngredientsEnRow[]
  allergens: FragranceAllergenRow[]
} {
  if (bomItems.length === 0) return { rows: [], allergens: [] }

  const rows: IngredientsEnRow[] = []
  bomItems.forEach((item) => {
    const inciNames = item.components.map((c) => c.inci_name_en).filter(Boolean).join(', ')
    const functions = [...new Set(item.components.map((c) => c.function).filter(Boolean))].join(', ')
    const casNumbers = [...new Set(item.components.map((c) => c.cas_number).filter(Boolean))].join(', ')
    const firstComp = item.components[0]
    rows.push({
      no: 0,
      ingredientName: inciNames || item.materialname,
      wtPercent: item.totalUsemount / 1000,
      source: 'ICID',
      casNo: casNumbers || firstComp?.cas_number || '—',
      function: functions || firstComp?.function || '—',
    })
  })
  const sorted = rows
    .sort((a, b) => b.wtPercent - a.wtPercent)
    .map((item, idx) => ({ ...item, no: idx + 1 }))

  const allergenMap = new Map<string, { name: string; casNo: string; wtPercent: number }>()
  bomItems.forEach((item) => {
    const rawWtPercent = item.totalUsemount / 1000
    item.components.forEach((comp) => {
      if (comp.cas_number && FRAGRANCE_ALLERGEN_CAS.has(comp.cas_number)) {
        const ratio = comp.composition_ratio ?? 100
        const calc = (rawWtPercent * ratio) / 100
        if (calc >= 0.001) {
          const existing = allergenMap.get(comp.cas_number)
          if (existing) {
            existing.wtPercent += calc
          } else {
            allergenMap.set(comp.cas_number, {
              name: comp.inci_name_en || 'Unknown',
              casNo: comp.cas_number,
              wtPercent: calc,
            })
          }
        }
      }
    })
  })
  const allergens = Array.from(allergenMap.values())
    .sort((a, b) => b.wtPercent - a.wtPercent)
    .map((a, idx) => ({ no: idx + 1, inciName: a.name, casNo: a.casNo, wtPercent: a.wtPercent }))

  return { rows: sorted, allergens }
}

export function transformBreakdown(bomItems: NormalizedBomItem[]): {
  rows: BreakdownRow[]
  total: number
} {
  if (bomItems.length === 0) return { rows: [], total: 0 }

  const rows: BreakdownRow[] = []
  let rawNo = 0
  bomItems.forEach((item) => {
    rawNo++
    const rawWtPercent = item.totalUsemount / 1000
    const components: IngredientComponentRow[] =
      item.components.length > 0
        ? item.components
        : [
            {
              id: 'default',
              ingredient_code: item.baseCode,
              inci_name_en: item.materialname,
              inci_name_kr: null,
              cas_number: null,
              composition_ratio: 100,
              function: null,
              component_order: 0,
              country_of_origin: null,
              created_at: '',
            },
          ]
    components.forEach((comp, compIdx) => {
      const ratio = comp.composition_ratio ?? 100
      rows.push({
        no: rawNo,
        rawMaterial: item.materialname,
        wtPercent: rawWtPercent,
        componentInci: comp.inci_name_en || comp.inci_name_kr || '—',
        ratioInRaw: ratio,
        calculatedPercent: (rawWtPercent * ratio) / 100,
        isFirstOfGroup: compIdx === 0,
        groupSize: components.length,
      })
    })
  })

  const total = rows.reduce((sum, r) => sum + r.calculatedPercent, 0)
  return { rows, total }
}

export function transformInciSummary(bomItems: NormalizedBomItem[]): {
  rows: InciSummaryRow[]
  total: number
  count: number
} {
  if (bomItems.length === 0) return { rows: [], total: 0, count: 0 }

  const inciMap = new Map<string, { wtPercent: number; functions: Set<string>; casNumbers: Set<string> }>()
  bomItems.forEach((item) => {
    const rawWtPercent = item.totalUsemount / 1000
    if (item.components.length === 0) {
      const key = item.materialname.toUpperCase()
      const existing = inciMap.get(key)
      if (existing) existing.wtPercent += rawWtPercent
      else inciMap.set(key, { wtPercent: rawWtPercent, functions: new Set(), casNumbers: new Set() })
    } else {
      item.components.forEach((comp) => {
        const inciName = (comp.inci_name_en || comp.inci_name_kr || 'Unknown').toUpperCase()
        const ratio = comp.composition_ratio ?? 100
        const calculated = (rawWtPercent * ratio) / 100
        const existing = inciMap.get(inciName)
        if (existing) {
          existing.wtPercent += calculated
          if (comp.function) existing.functions.add(comp.function)
          if (comp.cas_number) existing.casNumbers.add(comp.cas_number)
        } else {
          inciMap.set(inciName, {
            wtPercent: calculated,
            functions: new Set(comp.function ? [comp.function] : []),
            casNumbers: new Set(comp.cas_number ? [comp.cas_number] : []),
          })
        }
      })
    }
  })

  const rows = Array.from(inciMap.entries())
    .map(([inciName, data]) => ({
      no: 0,
      inciName,
      wtPercent: data.wtPercent,
      function: Array.from(data.functions).join(', ') || '—',
      casNo: Array.from(data.casNumbers).join(', ') || '—',
    }))
    .sort((a, b) => b.wtPercent - a.wtPercent)
    .map((item, idx) => ({ ...item, no: idx + 1 }))

  const total = rows.reduce((sum, r) => sum + r.wtPercent, 0)
  return { rows, total, count: rows.length }
}
