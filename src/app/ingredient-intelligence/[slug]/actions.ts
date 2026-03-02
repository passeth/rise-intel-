'use server'

import { createClient } from '@/lib/supabase/server'
import type { ResearchReport } from '../_lib/report-types'

// ── Types ──

export interface IngredientProfile {
  // Bridge data
  inci_name_normalized: string
  korean_name: string | null
  mfds_registered: boolean | null
  mfds_restricted: string | null
  match_method: string
  incidecoder_slug: string | null
  vectors_ingredient_id: number | null
  vp_ingredient_id: number | null

  // INCIDecoder data
  name: string | null
  rating: string | null
  functions: string[] | null
  also_called: string[] | null
  quick_facts: string[] | null
  details: string | null
  cosing_cas_number: string | null
  cosing_ec_number: string | null
  cosing_description: string | null

  // AI data (vectors_ingredient)
  efficacy_kr: string | null
  key_mechanisms: string | null
  clinical_studies_summary: string | null
  inci_definition: string | null
  cosmetic_applications: string | null

  // Legacy data (vp_ingredient)
  skin_benefits: string | null
  vp_clinical_studies: string | null
  ingredient_kr: string | null
}

export interface InternalUsageItem {
  ingredient_code: string
  ingredient_name: string
  manufacturer: string | null
  composition_ratio: number | null
  function: string | null
}

export interface BomProductItem {
  product_code: string
  korean_name: string | null
  english_name: string | null
  ingredient_code: string
  content_ratio: number | null
}

export interface MarketStats {
  total_products: number
  usage_rate: number // percentage
  top_brands: { brand: string; count: number; sample_url: string | null }[]
}

export interface RegulationItem {
  regulation_source: string
  regulation_type: string
  max_concentration: string | null
  restricted_body_parts: string | null
  conditions: string | null
  warnings: string | null
  annex: string | null
}

export interface SafetyData {
  avg_irritancy: number | null
  avg_comedogenicity: number | null
  sample_count: number
}

// ── Fetch Profile ──

export async function fetchIngredientProfile(slug: string): Promise<IngredientProfile | null> {
  const supabase = await createClient()

  // Slug could be an incidecoder_slug OR an inci_name_normalized
  // Try slug first (from URL)
  const { data: matchBySlug } = await supabase
    .from('lab_inci_matches')
    .select('inci_name_normalized, korean_name, mfds_registered, mfds_restricted, match_method, incidecoder_slug, vectors_ingredient_id, vp_ingredient_id')
    .eq('incidecoder_slug', slug)
    .maybeSingle()

  let match = matchBySlug

  // If not found by slug, try by normalized name
  if (!match) {
    const { data: matchByName } = await supabase
      .from('lab_inci_matches')
      .select('inci_name_normalized, korean_name, mfds_registered, mfds_restricted, match_method, incidecoder_slug, vectors_ingredient_id, vp_ingredient_id')
      .eq('inci_name_normalized', slug.toUpperCase().trim())
      .maybeSingle()
    match = matchByName
  }

  if (!match) return null

  // Get INCIDecoder data
  let inciData: {
    name: string; rating: string | null; functions: string[] | null;
    also_called: string[] | null; quick_facts: string[] | null; details: string | null;
    cosing_cas_number: string | null; cosing_ec_number: string | null;
    cosing_description: string | null;
  } | null = null

  if (match.incidecoder_slug) {
    const { data } = await supabase
      .from('lab_ingredients')
      .select('name, rating, functions, also_called, quick_facts, details, cosing_cas_number, cosing_ec_number, cosing_description')
      .eq('slug', match.incidecoder_slug)
      .maybeSingle()
    inciData = data
  }

  // Get vectors_ingredient data
  let vectorsData: {
    efficacy_kr: string | null; key_mechanisms: string | null;
    clinical_studies_summary: string | null; inci_definition: string | null;
    cosmetic_applications: string | null;
  } | null = null

  if (match.vectors_ingredient_id) {
    const { data } = await supabase
      .from('vectors_ingredient')
      .select('efficacy_kr, key_mechanisms, clinical_studies_summary, inci_definition, cosmetic_applications_and_commercial_products')
      .eq('id', match.vectors_ingredient_id)
      .maybeSingle()
    if (data) {
      vectorsData = {
        efficacy_kr: data.efficacy_kr,
        key_mechanisms: data.key_mechanisms,
        clinical_studies_summary: data.clinical_studies_summary,
        inci_definition: data.inci_definition,
        cosmetic_applications: data.cosmetic_applications_and_commercial_products,
      }
    }
  }

  // Get vp_ingredient data
  let vpData: {
    skin_benefits: string | null; clinical_studies_summary: string | null;
    ingredient_kr: string | null;
  } | null = null

  if (match.vp_ingredient_id) {
    const { data } = await supabase
      .from('vp_ingredient')
      .select('skin_benefits, clinical_studies_summary, ingredient_kr')
      .eq('id', match.vp_ingredient_id)
      .maybeSingle()
    vpData = data
  }

  return {
    inci_name_normalized: match.inci_name_normalized,
    korean_name: match.korean_name,
    mfds_registered: match.mfds_registered,
    mfds_restricted: match.mfds_restricted,
    match_method: match.match_method,
    incidecoder_slug: match.incidecoder_slug,
    vectors_ingredient_id: match.vectors_ingredient_id,
    vp_ingredient_id: match.vp_ingredient_id,

    name: inciData?.name ?? null,
    rating: inciData?.rating ?? null,
    functions: inciData?.functions ?? null,
    also_called: inciData?.also_called ?? null,
    quick_facts: inciData?.quick_facts ?? null,
    details: inciData?.details ?? null,
    cosing_cas_number: inciData?.cosing_cas_number ?? null,
    cosing_ec_number: inciData?.cosing_ec_number ?? null,
    cosing_description: inciData?.cosing_description ?? null,

    efficacy_kr: vectorsData?.efficacy_kr ?? null,
    key_mechanisms: vectorsData?.key_mechanisms ?? null,
    clinical_studies_summary: vectorsData?.clinical_studies_summary ?? null,
    inci_definition: vectorsData?.inci_definition ?? null,
    cosmetic_applications: vectorsData?.cosmetic_applications ?? null,

    skin_benefits: vpData?.skin_benefits ?? null,
    vp_clinical_studies: vpData?.clinical_studies_summary ?? null,
    ingredient_kr: vpData?.ingredient_kr ?? null,
  }
}

// ── Fetch Internal Usage ──

export async function fetchInternalUsage(inciNameNormalized: string): Promise<InternalUsageItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredient_components')
    .select(`
      ingredient_code,
      composition_ratio,
      function
    `)
    .ilike('inci_name_en', inciNameNormalized)

  if (error || !data) return []

  // Get ingredient names for the codes
  const codes = [...new Set(data.map((d) => d.ingredient_code))]
  const { data: ingredients } = await supabase
    .from('labdoc_ingredients')
    .select('ingredient_code, ingredient_name, manufacturer')
    .in('ingredient_code', codes)

  const ingredientMap = new Map<string, { ingredient_name: string; manufacturer: string | null }>()
  ;(ingredients ?? []).forEach((i) => {
    ingredientMap.set(i.ingredient_code, {
      ingredient_name: i.ingredient_name,
      manufacturer: i.manufacturer,
    })
  })

  return data.map((d) => {
    const ing = ingredientMap.get(d.ingredient_code)
    return {
      ingredient_code: d.ingredient_code,
      ingredient_name: ing?.ingredient_name ?? d.ingredient_code,
      manufacturer: ing?.manufacturer ?? null,
      composition_ratio: d.composition_ratio,
      function: d.function,
    }
  })
}

// ── Fetch BOM Products (products using raw materials that contain this INCI) ──

export async function fetchBomProducts(ingredientCodes: string[]): Promise<BomProductItem[]> {
  if (ingredientCodes.length === 0) return []

  const supabase = await createClient()

  // Get all products that use any of these ingredient_codes via BOM
  const { data: bomRows, error } = await supabase
    .from('labdoc_product_bom')
    .select('product_code, ingredient_code, content_ratio')
    .in('ingredient_code', ingredientCodes)

  if (error || !bomRows || bomRows.length === 0) return []

  // Deduplicate product codes
  const productCodes = [...new Set(bomRows.map((b) => b.product_code))]

  // Fetch product details
  const { data: products } = await supabase
    .from('labdoc_products')
    .select('product_code, korean_name, english_name')
    .in('product_code', productCodes.slice(0, 200))

  const productMap = new Map<string, { korean_name: string | null; english_name: string | null }>()
  ;(products ?? []).forEach((p) => {
    productMap.set(p.product_code, { korean_name: p.korean_name, english_name: p.english_name })
  })

  // Build result: one row per unique product_code (aggregate ingredient_codes if needed)
  const seen = new Set<string>()
  const result: BomProductItem[] = []

  for (const bom of bomRows) {
    if (seen.has(bom.product_code)) continue
    seen.add(bom.product_code)
    const prod = productMap.get(bom.product_code)
    result.push({
      product_code: bom.product_code,
      korean_name: prod?.korean_name ?? null,
      english_name: prod?.english_name ?? null,
      ingredient_code: bom.ingredient_code,
      content_ratio: bom.content_ratio ? Number(bom.content_ratio) : null,
    })
  }

  return result.sort((a, b) => (b.content_ratio ?? 0) - (a.content_ratio ?? 0))
}

// ── Fetch Market Stats ──

export async function fetchMarketStats(incidecoderSlug: string): Promise<MarketStats> {
  const supabase = await createClient()

  // Total product count using this ingredient
  const { count: productCount } = await supabase
    .from('lab_ingredient_product')
    .select('*', { count: 'exact', head: true })
    .eq('ingredient_slug', incidecoderSlug)

  // Total products overall
  const { count: totalProducts } = await supabase
    .from('lab_products')
    .select('*', { count: 'exact', head: true })

  // Top brands
  const { data: brandProducts } = await supabase
    .from('lab_ingredient_product')
    .select('product_slug')
    .eq('ingredient_slug', incidecoderSlug)
    .limit(500)

  let topBrands: { brand: string; count: number; sample_url: string | null }[] = []

  if (brandProducts && brandProducts.length > 0) {
    const productSlugs = brandProducts.map((bp) => bp.product_slug)
    const { data: products } = await supabase
      .from('lab_products')
      .select('slug, brand, source_url')
      .in('slug', productSlugs.slice(0, 200)) // limit batch

    // Group by brand: count + pick first source_url as sample
    const brandData = new Map<string, { count: number; sample_url: string | null }>()
    ;(products ?? []).forEach((p) => {
      if (p.brand) {
        const existing = brandData.get(p.brand)
        if (existing) {
          existing.count++
          if (!existing.sample_url && p.source_url) existing.sample_url = p.source_url
        } else {
          brandData.set(p.brand, { count: 1, sample_url: p.source_url ?? null })
        }
      }
    })

    topBrands = Array.from(brandData.entries())
      .map(([brand, data]) => ({ brand, count: data.count, sample_url: data.sample_url }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  return {
    total_products: productCount ?? 0,
    usage_rate: totalProducts ? ((productCount ?? 0) / totalProducts) * 100 : 0,
    top_brands: topBrands,
  }
}

// ── Fetch Safety Data ──

export async function fetchSafetyData(incidecoderSlug: string): Promise<SafetyData> {
  const supabase = await createClient()

  // Get products that contain this ingredient
  const { data: productLinks } = await supabase
    .from('lab_ingredient_product')
    .select('product_slug')
    .eq('ingredient_slug', incidecoderSlug)
    .limit(100)

  if (!productLinks || productLinks.length === 0) {
    return { avg_irritancy: null, avg_comedogenicity: null, sample_count: 0 }
  }

  const productSlugs = productLinks.map((pl) => pl.product_slug)
  const { data: products } = await supabase
    .from('lab_products')
    .select('skim_through')
    .in('slug', productSlugs.slice(0, 50))

  let totalIrritancy = 0
  let totalComedogenicity = 0
  let count = 0

  ;(products ?? []).forEach((p) => {
    if (p.skim_through && Array.isArray(p.skim_through)) {
      const skimArray = p.skim_through as Array<{
        name: string
        irritancy: number | null
        comedogenicity: number | null
      }>
      const match = skimArray.find(
        (s) => s.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === incidecoderSlug.replace(/-/g, '')
      )
      if (match) {
        if (match.irritancy != null) totalIrritancy += match.irritancy
        if (match.comedogenicity != null) totalComedogenicity += match.comedogenicity
        count++
      }
    }
  })

  return {
    avg_irritancy: count > 0 ? totalIrritancy / count : null,
    avg_comedogenicity: count > 0 ? totalComedogenicity / count : null,
    sample_count: count,
  }
}

// ── Fetch Regulations ──

export async function fetchRegulations(inciNameNormalized: string, casNumber?: string | null): Promise<RegulationItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('lab_regulations')
    .select('regulation_source, regulation_type, max_concentration, restricted_body_parts, conditions, warnings, annex')

  // Search by INCI name OR CAS number
  if (casNumber) {
    query = query.or(`inci_name.ilike.${inciNameNormalized},cas_number.eq.${casNumber}`)
  } else {
    query = query.ilike('inci_name', inciNameNormalized)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error('fetchRegulations error:', error)
    return []
  }

  return data ?? []
}

// ── Fetch Co-occurrence ──

export async function fetchCooccurrence(incidecoderSlug: string): Promise<{ slug: string; name: string; rating: string | null; count: number }[]> {
  const supabase = await createClient()

  // Get products containing this ingredient
  const { data: productLinks } = await supabase
    .from('lab_ingredient_product')
    .select('product_slug')
    .eq('ingredient_slug', incidecoderSlug)
    .limit(200)

  if (!productLinks || productLinks.length === 0) return []

  const productSlugs = productLinks.map((pl) => pl.product_slug)

  // Get all ingredients in those products
  const { data: coIngredients } = await supabase
    .from('lab_ingredient_product')
    .select('ingredient_slug')
    .in('product_slug', productSlugs.slice(0, 100))
    .neq('ingredient_slug', incidecoderSlug)

  if (!coIngredients) return []

  // Count occurrences
  const counts = new Map<string, number>()
  coIngredients.forEach((ci) => {
    counts.set(ci.ingredient_slug, (counts.get(ci.ingredient_slug) ?? 0) + 1)
  })

  // Get top 10
  const topSlugs = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Fetch ingredient names
  const slugList = topSlugs.map(([slug]) => slug)
  const { data: ingredientNames } = await supabase
    .from('lab_ingredients')
    .select('slug, name, rating')
    .in('slug', slugList)

  const nameMap = new Map<string, { name: string; rating: string | null }>()
  ;(ingredientNames ?? []).forEach((i) => {
    nameMap.set(i.slug, { name: i.name, rating: i.rating })
  })

  return topSlugs.map(([slug, count]) => ({
    slug,
    name: nameMap.get(slug)?.name ?? slug,
    rating: nameMap.get(slug)?.rating ?? null,
    count,
  }))
}

// ── Research Reports CRUD ──

export async function fetchReportsByIngredient(inciNameNormalized: string): Promise<ResearchReport[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_research_reports')
    .select('*')
    .eq('subject_type', 'ingredient')
    .eq('subject_identifier', inciNameNormalized)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchReportsByIngredient error:', error)
    return []
  }

  return (data ?? []) as ResearchReport[]
}

export async function fetchReportById(reportId: string): Promise<ResearchReport | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_research_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()

  if (error) {
    console.error('fetchReportById error:', error)
    return null
  }

  return data as ResearchReport | null
}

export async function searchIngredients(query: string): Promise<{ inci_name_normalized: string; korean_name: string | null }[]> {
  if (!query || query.length < 2) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lab_inci_matches')
    .select('inci_name_normalized, korean_name')
    .or(`inci_name_normalized.ilike.%${query}%,korean_name.ilike.%${query}%`)
    .limit(20)

  if (error || !data) return []
  return data
}

export async function deleteReport(reportId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lab_research_reports')
    .delete()
    .eq('id', reportId)

  if (error) {
    console.error('deleteReport error:', error)
    return false
  }

  return true
}
