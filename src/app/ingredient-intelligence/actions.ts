'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ──

export interface IngredientListItem {
  inci_name_normalized: string
  korean_name: string | null
  incidecoder_slug: string | null
  // INCIDecoder data
  name: string | null
  rating: string | null
  functions: string[] | null
  // Bridge data
  mfds_registered: boolean | null
  mfds_restricted: string | null
  // Data source flags
  has_incidecoder: boolean
  has_vectors: boolean
  has_vp: boolean
}

/**
 * Fetch all ingredient intelligence data in one batch.
 * 816 rows is small enough for client-side filtering/pagination.
 * Cached by TanStack Query for instant filter/search UX.
 */
export async function fetchAllIngredients(): Promise<{
  ingredients: IngredientListItem[]
  categories: string[]
}> {
  const supabase = await createClient()

  // Parallel fetches: categories + all matches
  const [categoriesResult, matchesResult] = await Promise.all([
    supabase
      .from('lab_categories')
      .select('name')
      .order('name'),
    supabase
      .from('lab_inci_matches')
      .select('inci_name_normalized, korean_name, incidecoder_slug, vectors_ingredient_id, vp_ingredient_id, mfds_registered, mfds_restricted')
      .order('inci_name_normalized'),
  ])

  const categories = (categoriesResult.data ?? []).map((c) => c.name)
  const matches = matchesResult.data ?? []

  // Batch-fetch INCIDecoder data for matched slugs
  const slugs = matches
    .map((m) => m.incidecoder_slug)
    .filter((s): s is string => s !== null)

  const ingredientMap = new Map<string, { name: string; rating: string | null; functions: string[] | null }>()

  if (slugs.length > 0) {
    const { data: ingredients } = await supabase
      .from('lab_ingredients')
      .select('slug, name, rating, functions')
      .in('slug', slugs)

    ;(ingredients ?? []).forEach((i) => {
      ingredientMap.set(i.slug, {
        name: i.name,
        rating: i.rating,
        functions: i.functions,
      })
    })
  }

  // Merge results
  const results: IngredientListItem[] = matches.map((m) => {
    const ing = m.incidecoder_slug ? ingredientMap.get(m.incidecoder_slug) : null
    return {
      inci_name_normalized: m.inci_name_normalized,
      korean_name: m.korean_name,
      incidecoder_slug: m.incidecoder_slug,
      name: ing?.name ?? null,
      rating: ing?.rating ?? null,
      functions: ing?.functions ?? null,
      mfds_registered: m.mfds_registered,
      mfds_restricted: m.mfds_restricted,
      has_incidecoder: m.incidecoder_slug !== null,
      has_vectors: m.vectors_ingredient_id !== null,
      has_vp: m.vp_ingredient_id !== null,
    }
  })

  return { ingredients: results, categories }
}

/**
 * Fetch report counts per ingredient (for badge display on master page).
 * Returns a Map of inci_name_normalized → count.
 */
export async function fetchReportCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_research_reports')
    .select('subject_identifier')
    .eq('subject_type', 'ingredient')
    .eq('report_status', 'completed')

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  data.forEach((row) => {
    const key = row.subject_identifier
    counts[key] = (counts[key] ?? 0) + 1
  })

  return counts
}
