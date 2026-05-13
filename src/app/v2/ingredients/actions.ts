'use server'

import { createClient } from '@/lib/supabase/server'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

// ── Types ──

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
  allergen_marking_type: AllergenMarkingType | null
  coa_urls: string[]
  composition_urls: string[]
  msds_en_urls: string[]
  msds_kr_urls: string[]
  fragrance_urls: string[]
  other_urls: string[]
  components: IngredientComponent[]
}

export type AllergenMarkingType = 'fragrance' | 'essential_oil' | 'others'
export type SortField = 'ingredient_code' | 'ingredient_name' | 'manufacturer'
export type SortDirection = 'asc' | 'desc'

export interface LabIngredientListResult {
  ingredients: LabIngredientRow[]
  total: number
}

// ── Constants ──

const SELECT_COLUMNS = [
  'id',
  'ingredient_code',
  'ingredient_name',
  'manufacturer',
  'origin_country',
  'allergen_marking_type',
  'coa_urls',
  'composition_urls',
  'msds_en_urls',
  'msds_kr_urls',
  'fragrance_urls',
  'other_urls',
].join(', ')

const LEGACY_SELECT_COLUMNS = [
  'id',
  'ingredient_code',
  'ingredient_name',
  'manufacturer',
  'origin_country',
  'coa_urls',
  'composition_urls',
  'msds_en_urls',
  'msds_kr_urls',
  'fragrance_urls',
  'other_urls',
].join(', ')

const COMPONENT_COLUMNS = [
  'id',
  'ingredient_code',
  'inci_name_en',
  'inci_name_kr',
  'cas_number',
  'composition_ratio',
  'function',
  'component_order',
].join(', ')

const DEFAULT_PAGE_SIZE = 50
const ALLERGEN_MARKING_TYPES = new Set<AllergenMarkingType>([
  'fragrance',
  'essential_oil',
  'others',
])

function normalizeAllergenMarkingType(value: unknown): AllergenMarkingType | null {
  return typeof value === 'string' && ALLERGEN_MARKING_TYPES.has(value as AllergenMarkingType)
    ? (value as AllergenMarkingType)
    : null
}

// ── Fetch Ingredients List ──

export async function fetchIngredients(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortField: SortField = 'ingredient_code',
  sortDir: SortDirection = 'asc'
): Promise<LabIngredientListResult> {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const ascending = sortDir === 'asc'


  const buildQuery = (includeAllergenField: boolean) => {
    let query = fromTable(supabase, 'labdoc_ingredients')
      .select(includeAllergenField ? SELECT_COLUMNS : LEGACY_SELECT_COLUMNS, { count: 'exact' })

    if (search) {
      const term = `%${search}%`
      query = query.or(
        `ingredient_code.ilike.${term},ingredient_name.ilike.${term},manufacturer.ilike.${term}`
      )
    }

    return query
  }

  let { data: ingredients, count, error } = await buildQuery(true)
    .order(sortField, { ascending })
    .range(from, to)

  if (error && error.message.includes('allergen_marking_type')) {
    const fallback = await buildQuery(false)
      .order(sortField, { ascending })
      .range(from, to)
    ingredients = fallback.data
    count = fallback.count
    error = fallback.error
  }

  if (error) {
    console.error('fetchIngredients error:', error)
    return { ingredients: [], total: 0 }
  }

  if (!ingredients || ingredients.length === 0) {
    return { ingredients: [], total: count ?? 0 }
  }


  const codes = ingredients.map((i: SupabaseAny) => i.ingredient_code)

  const { data: components, error: compError } = await fromTable(supabase, 'labdoc_ingredient_components')
    .select(COMPONENT_COLUMNS)
    .in('ingredient_code', codes)
    .order('component_order', { ascending: true })

  if (compError) {
    console.error('fetchIngredientComponents error:', compError)
  }


  const componentMap = new Map<string, IngredientComponent[]>()
  ;(components ?? []).forEach((c: SupabaseAny) => {
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


  const merged: LabIngredientRow[] = ingredients.map((i: SupabaseAny) => ({
    id: i.id,
    ingredient_code: i.ingredient_code,
    ingredient_name: i.ingredient_name,
    manufacturer: i.manufacturer,
    origin_country: i.origin_country,
    allergen_marking_type: normalizeAllergenMarkingType(i.allergen_marking_type),
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

// ── Fetch Single Ingredient Detail ──

export interface IngredientDetail {
  id: string
  ingredient_code: string
  ingredient_name: string
  manufacturer: string | null
  origin_country: string | null
  allergen_marking_type: AllergenMarkingType | null
  coa_urls: string[]
  composition_urls: string[]
  msds_en_urls: string[]
  msds_kr_urls: string[]
  fragrance_urls: string[]
  other_urls: string[]
}

export async function fetchIngredientDetail(
  ingredientCode: string
): Promise<IngredientDetail | null> {
  const supabase = await createClient()

  let { data, error } = await fromTable(supabase, 'labdoc_ingredients')
    .select(SELECT_COLUMNS)
    .eq('ingredient_code', ingredientCode)
    .maybeSingle()

  if (error && error.message.includes('allergen_marking_type')) {
    const fallback = await fromTable(supabase, 'labdoc_ingredients')
      .select(LEGACY_SELECT_COLUMNS)
      .eq('ingredient_code', ingredientCode)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('fetchIngredientDetail error:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    ingredient_code: data.ingredient_code,
    ingredient_name: data.ingredient_name,
    manufacturer: data.manufacturer,
    origin_country: data.origin_country,
    allergen_marking_type: normalizeAllergenMarkingType(data.allergen_marking_type),
    coa_urls: (data.coa_urls ?? []) as string[],
    composition_urls: (data.composition_urls ?? []) as string[],
    msds_en_urls: (data.msds_en_urls ?? []) as string[],
    msds_kr_urls: (data.msds_kr_urls ?? []) as string[],
    fragrance_urls: (data.fragrance_urls ?? []) as string[],
    other_urls: (data.other_urls ?? []) as string[],
  }
}

export async function updateIngredientAllergenMarking(input: {
  ingredientCodes: string[]
  markingType: AllergenMarkingType | null
}): Promise<{ success: boolean; error?: string }> {
  const ingredientCodes = Array.from(
    new Set(input.ingredientCodes.map((code) => code.trim()).filter(Boolean))
  )

  if (ingredientCodes.length === 0) {
    return { success: false, error: '선택된 원료가 없습니다.' }
  }

  const markingType =
    input.markingType && ALLERGEN_MARKING_TYPES.has(input.markingType)
      ? input.markingType
      : null

  const supabase = await createClient()
  const { error } = await fromTable(supabase, 'labdoc_ingredients')
    .update({
      allergen_marking_type: markingType,
      updated_at: new Date().toISOString(),
    })
    .in('ingredient_code', ingredientCodes)

  if (error) {
    console.error('updateIngredientAllergenMarking error:', error)
    return {
      success: false,
      error: error.message.includes('allergen_marking_type')
        ? 'DB 마이그레이션(sql/006_ingredient_allergen_marking_type.sql)이 먼저 필요합니다.'
        : error.message,
    }
  }

  return { success: true }
}

// ── Fetch Components for a Single Ingredient ──

export async function fetchIngredientComponents(
  ingredientCode: string
): Promise<IngredientComponent[]> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_components')
    .select(COMPONENT_COLUMNS)
    .eq('ingredient_code', ingredientCode)
    .order('component_order', { ascending: true })

  if (error) {
    console.error('fetchIngredientComponents error:', error)
    return []
  }

  return (data ?? []).map((c: SupabaseAny) => ({
    id: c.id,
    inci_name_en: c.inci_name_en,
    inci_name_kr: c.inci_name_kr,
    cas_number: c.cas_number,
    composition_ratio: c.composition_ratio,
    function: c.function,
    component_order: c.component_order,
  }))
}

// ── Fetch Ingredient Specs ──

export interface IngredientSpec {
  id: string
  ingredient_code: string
  ingredient_name: string | null
  spec_item: string
  spec_standard: string | null
}

export async function fetchIngredientSpecs(
  ingredientCode: string
): Promise<IngredientSpec[]> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_specs')
    .select('id, ingredient_code, ingredient_name, spec_item, spec_standard')
    .eq('ingredient_code', ingredientCode)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchIngredientSpecs error:', error)
    return []
  }

  return (data ?? []) as IngredientSpec[]
}
