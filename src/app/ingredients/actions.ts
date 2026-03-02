'use server'

import { createClient } from '@/lib/supabase/server'

export interface IngredientComponent {
  id: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number
}

export interface LabIngredientRow {
  id: string
  ingredient_code: string
  ingredient_name: string
  manufacturer: string | null
  origin_country: string | null
  coa_urls: string[]
  composition_urls: string[]
  msds_en_urls: string[]
  msds_kr_urls: string[]
  fragrance_urls: string[]
  other_urls: string[]
  components: IngredientComponent[]
}

export type SortField = 'ingredient_code' | 'ingredient_name' | 'manufacturer'
export type SortDirection = 'asc' | 'desc'

export interface FetchLabIngredientsParams {
  search?: string
  page?: number
  pageSize?: number
  sortField?: SortField
  sortDir?: SortDirection
}

export interface LabIngredientListResult {
  ingredients: LabIngredientRow[]
  total: number
}

const PAGE_SIZE = 50

export async function fetchLabIngredients({
  search = '',
  page = 1,
  pageSize = PAGE_SIZE,
  sortField = 'ingredient_code',
  sortDir = 'asc',
}: FetchLabIngredientsParams = {}): Promise<LabIngredientListResult> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const ascending = sortDir === 'asc'

  // 1. Fetch ingredients with count
  let query = supabase
    .from('labdoc_ingredients')
    .select('id, ingredient_code, ingredient_name, manufacturer, origin_country, coa_urls, composition_urls, msds_en_urls, msds_kr_urls, fragrance_urls, other_urls', { count: 'exact' })

  if (search) {
    const searchTerm = `%${search}%`
    query = query.or(
      `ingredient_code.ilike.${searchTerm},ingredient_name.ilike.${searchTerm},manufacturer.ilike.${searchTerm}`
    )
  }

  const { data: ingredients, count, error } = await query
    .order(sortField, { ascending })
    .range(from, to)

  if (error) {
    console.error('fetchLabIngredients error:', error)
    return { ingredients: [], total: 0 }
  }

  if (!ingredients || ingredients.length === 0) {
    return { ingredients: [], total: count ?? 0 }
  }

  // 2. Fetch components for the page's ingredients
  const codes = ingredients.map((i) => i.ingredient_code)

  const { data: components, error: compError } = await supabase
    .from('labdoc_ingredient_components')
    .select('id, ingredient_code, inci_name_en, inci_name_kr, cas_number, composition_ratio, function, component_order')
    .in('ingredient_code', codes)
    .order('component_order', { ascending: true })

  if (compError) {
    console.error('fetchIngredientComponents error:', compError)
  }

  // 3. Group components by ingredient_code
  const componentMap = new Map<string, IngredientComponent[]>()
  ;(components ?? []).forEach((c) => {
    const existing = componentMap.get(c.ingredient_code) ?? []
    existing.push({
      id: c.id,
      inci_name_en: c.inci_name_en,
      inci_name_kr: c.inci_name_kr,
      cas_number: c.cas_number,
      composition_ratio: c.composition_ratio,
      function: c.function,
      component_order: c.component_order,
    })
    componentMap.set(c.ingredient_code, existing)
  })

  // 4. Merge
  const merged: LabIngredientRow[] = ingredients.map((i) => ({
    id: i.id,
    ingredient_code: i.ingredient_code,
    ingredient_name: i.ingredient_name,
    manufacturer: i.manufacturer,
    origin_country: i.origin_country,
    coa_urls: (i.coa_urls ?? []) as string[],
    composition_urls: (i.composition_urls ?? []) as string[],
    msds_en_urls: (i.msds_en_urls ?? []) as string[],
    msds_kr_urls: (i.msds_kr_urls ?? []) as string[],
    fragrance_urls: (i.fragrance_urls ?? []) as string[],
    other_urls: (i.other_urls ?? []) as string[],
    components: componentMap.get(i.ingredient_code) ?? [],
  }))

  return {
    ingredients: merged,
    total: count ?? 0,
  }
}
