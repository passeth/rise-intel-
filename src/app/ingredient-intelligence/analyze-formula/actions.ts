'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ──

export interface ParsedIngredient {
  position: number
  name: string
  matched: boolean
  inci_name_normalized: string | null
  korean_name: string | null
}

export interface LabProductOption {
  slug: string
  product_name: string
  brand: string | null
}

export interface VpFormulaOption {
  id: number
  formula_name_kr: string
  formula_name_en: string
  category_main: string | null
  formulation_type: string | null
}

// ── Search Lab Products (INCIDecoder) ──

export async function searchLabProducts(query: string): Promise<LabProductOption[]> {
  if (!query || query.length < 2) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_products')
    .select('slug, product_name, brand')
    .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
    .not('ingredients_list', 'is', null)
    .limit(20)

  if (error || !data) return []
  return data.map((p) => ({
    slug: p.slug,
    product_name: p.product_name ?? p.slug,
    brand: p.brand,
  }))
}

// ── Load Lab Product Ingredients ──

export async function loadLabProductIngredients(slug: string): Promise<{ name: string; position: number }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_products')
    .select('ingredients_list')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data?.ingredients_list) return []

  // ingredients_list is JSONB stored as string or object
  let parsed: Array<{ position: number; name: string; slug?: string; rating?: string | null }>
  if (typeof data.ingredients_list === 'string') {
    try {
      parsed = JSON.parse(data.ingredients_list)
    } catch {
      return []
    }
  } else {
    parsed = data.ingredients_list as Array<{ position: number; name: string }>
  }

  // Deduplicate by name (scraped data has duplicates)
  const seen = new Set<string>()
  const result: { name: string; position: number }[] = []
  for (const item of parsed) {
    const key = item.name.toUpperCase().trim()
    // Skip obvious scraping artifacts
    if (key.startsWith('READ ALL') || key.includes('>>')) continue
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ name: item.name, position: result.length + 1 })
    }
  }

  return result
}

// ── Search VP Formulas ──

export async function searchVpFormulas(query: string): Promise<VpFormulaOption[]> {
  if (!query || query.length < 2) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vp_formula')
    .select('id, formula_name_kr, formula_name_en, category_main, formulation_type')
    .or(`formula_name_kr.ilike.%${query}%,formula_name_en.ilike.%${query}%`)
    .limit(20)

  if (error || !data) return []
  return data.map((f) => ({
    id: f.id,
    formula_name_kr: f.formula_name_kr ?? '',
    formula_name_en: f.formula_name_en ?? '',
    category_main: f.category_main,
    formulation_type: f.formulation_type,
  }))
}

// ── Load VP Formula Ingredients ──

export async function loadVpFormulaIngredients(formulaId: number): Promise<{ name: string; position: number; concentration?: number | null }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vp_formula_ingredients')
    .select('inci_name, ingredient_name_en, concentration_typical, addition_order')
    .eq('formula_id', formulaId)
    .order('addition_order', { ascending: true })

  if (error || !data) return []

  return data.map((fi, idx) => ({
    name: fi.inci_name || fi.ingredient_name_en || `Unknown #${idx + 1}`,
    position: fi.addition_order ?? idx + 1,
    concentration: fi.concentration_typical ? Number(fi.concentration_typical) : null,
  }))
}

// ── Match Ingredients Against lab_inci_matches ──

export async function matchIngredients(names: string[]): Promise<ParsedIngredient[]> {
  if (names.length === 0) return []
  const supabase = await createClient()

  // Normalize names for matching
  const normalized = names.map((n) => n.toUpperCase().trim())

  // Batch query — get all matches at once
  const { data: matches, error } = await supabase
    .from('lab_inci_matches')
    .select('inci_name_normalized, korean_name')
    .in('inci_name_normalized', normalized)

  if (error) {
    console.error('matchIngredients error:', error)
  }

  const matchMap = new Map<string, { inci_name_normalized: string; korean_name: string | null }>()
  ;(matches ?? []).forEach((m) => {
    matchMap.set(m.inci_name_normalized, m)
  })

  return names.map((name, idx) => {
    const key = name.toUpperCase().trim()
    const match = matchMap.get(key)
    return {
      position: idx + 1,
      name,
      matched: !!match,
      inci_name_normalized: match?.inci_name_normalized ?? null,
      korean_name: match?.korean_name ?? null,
    }
  })
}

// ── Formula Analysis History ──

export interface FormulaAnalysisRecord {
  id: string
  subject_name: string | null
  report_title: string
  report_status: string
  report_markdown: string | null
  report_summary: string | null
  related_ingredients: string[] | null
  generation_time_ms: number | null
  model_used: string | null
  created_at: string
}

export async function fetchFormulaAnalysisHistory(): Promise<FormulaAnalysisRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_research_reports')
    .select('id, subject_name, report_title, report_status, report_markdown, report_summary, related_ingredients, generation_time_ms, model_used, created_at')
    .eq('report_type', 'formula_analysis')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('fetchFormulaAnalysisHistory error:', error)
    return []
  }

  return (data ?? []) as FormulaAnalysisRecord[]
}

export async function deleteFormulaAnalysis(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lab_research_reports')
    .delete()
    .eq('id', id)
    .eq('report_type', 'formula_analysis')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
