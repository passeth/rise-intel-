'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

type ActionResult = { success: boolean; error?: string }

export interface CreateIngredientInput {
  ingredient_code: string
  ingredient_name: string
  manufacturer?: string | null
  origin_country?: string | null
}

export interface CreateIngredientComponentInput {
  inci_name_en: string
  inci_name_kr?: string | null
  cas_number?: string | null
  composition_ratio?: number | null
  function?: string | null
  component_order: number
}

export interface CreateIngredientSpecInput {
  spec_item: string
  spec_standard?: string | null
}

export async function checkIngredientCodeExists(code: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredients')
    .select('id')
    .eq('ingredient_code', code.trim())
    .maybeSingle()

  if (error) {
    console.error('checkIngredientCodeExists error:', error)
    return false
  }

  return !!data
}

export async function createIngredient(data: CreateIngredientInput): Promise<ActionResult> {
  const supabase = await createClient()

  const payload = {
    ingredient_code: data.ingredient_code.trim(),
    ingredient_name: data.ingredient_name.trim(),
    manufacturer: data.manufacturer?.trim() || null,
    origin_country: data.origin_country?.trim() || null,
  }

  const { error } = await fromTable(supabase, 'labdoc_ingredients').insert(payload)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 존재하는 원료코드입니다.' }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function createIngredientComponents(
  ingredientCode: string,
  components: CreateIngredientComponentInput[]
): Promise<ActionResult> {
  const supabase = await createClient()

  if (components.length === 0) return { success: true }

  const payload = components.map((component) => ({
    ingredient_code: ingredientCode,
    inci_name_en: component.inci_name_en.trim(),
    inci_name_kr: component.inci_name_kr?.trim() || null,
    cas_number: component.cas_number?.trim() || null,
    composition_ratio: component.composition_ratio ?? null,
    function: component.function?.trim() || null,
    component_order: component.component_order,
  }))

  const { error } = await fromTable(supabase, 'labdoc_ingredient_components').insert(payload)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function createIngredientSpecs(
  ingredientCode: string,
  specs: CreateIngredientSpecInput[]
): Promise<ActionResult> {
  const supabase = await createClient()

  if (specs.length === 0) return { success: true }

  const ingredientNameResult = await fromTable(supabase, 'labdoc_ingredients')
    .select('ingredient_name')
    .eq('ingredient_code', ingredientCode)
    .maybeSingle()

  if (ingredientNameResult.error) {
    return { success: false, error: ingredientNameResult.error.message }
  }

  const ingredientName = (ingredientNameResult.data?.ingredient_name as string | null) ?? null

  const payload = specs.map((spec) => ({
    ingredient_code: ingredientCode,
    ingredient_name: ingredientName,
    spec_item: spec.spec_item.trim(),
    spec_standard: spec.spec_standard?.trim() || null,
  }))

  const { error } = await fromTable(supabase, 'labdoc_ingredient_specs').insert(payload)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
