'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  CpnpProductData,
  CpnpBomItem,
  CpnpIngredientComponent,
  CpnpQcSpec,
  CpnpEnglishSpec,
  CpnpAllergenRegulation,
  CpnpFragranceAllergen,
  CpnpIngredientDoc,
  CpnpInci,
} from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

async function fetchBomItems(
  supabase: SupabaseClient,
  semiProductCode: string | null
): Promise<CpnpBomItem[]> {
  if (!semiProductCode) return []

  const { data: bomData, error: bomError } = await supabase
    .from('bom_master')
    .select('materialcode, materialname, usemount')
    .eq('prdcode', semiProductCode)
    .order('usemount', { ascending: false })

  if (bomError || !bomData || bomData.length === 0) return []

  const normalizedMap = new Map<string, { materialname: string; totalUsemount: number; sequenceNo: number }>()
  let sequenceCounter = 0

  for (const item of bomData) {
    if (!item.materialcode) continue
    const baseCode = normalizeIngredientCode(item.materialcode)
    const existing = normalizedMap.get(baseCode)
    if (existing) {
      existing.totalUsemount += item.usemount ?? 0
    } else {
      normalizedMap.set(baseCode, {
        materialname: item.materialname ?? baseCode,
        totalUsemount: item.usemount ?? 0,
        sequenceNo: sequenceCounter++,
      })
    }
  }

  const baseCodes = Array.from(normalizedMap.keys())
  if (baseCodes.length === 0) return []

  const [componentsResult, ingredientsResult] = await Promise.all([
    supabase
      .from('labdoc_ingredient_components')
      .select('ingredient_code, inci_name_en, inci_name_kr, cas_number, composition_ratio, function, component_order')
      .in('ingredient_code', baseCodes)
      .order('component_order', { ascending: true }),
    supabase
      .from('labdoc_ingredients')
      .select('ingredient_code, ingredient_name')
      .in('ingredient_code', baseCodes),
  ])

  const componentsMap = new Map<string, CpnpIngredientComponent[]>()
  for (const row of componentsResult.data ?? []) {
    const list = componentsMap.get(row.ingredient_code) ?? []
    list.push({
      inci_name_en: row.inci_name_en,
      inci_name_kr: row.inci_name_kr,
      cas_number: row.cas_number,
      composition_ratio: row.composition_ratio,
      function: row.function,
      component_order: row.component_order,
    })
    componentsMap.set(row.ingredient_code, list)
  }

  const nameMap = new Map<string, string>()
  for (const row of ingredientsResult.data ?? []) {
    if (row.ingredient_name) nameMap.set(row.ingredient_code, row.ingredient_name)
  }

  return Array.from(normalizedMap.entries())
    .map(([baseCode, value]) => ({
      ingredient_code: baseCode,
      ingredient_name: nameMap.get(baseCode) ?? value.materialname,
      content_ratio: value.totalUsemount,
      sequence_no: value.sequenceNo,
      components: componentsMap.get(baseCode) ?? [],
    }))
    .sort((a, b) => b.content_ratio - a.content_ratio)
}

async function fetchIngredientDocs(
  supabase: SupabaseClient,
  ingredientCodes: string[]
): Promise<CpnpIngredientDoc[]> {
  if (ingredientCodes.length === 0) return []

  const { data } = await supabase
    .from('labdoc_ingredients')
    .select('ingredient_code, ingredient_name, coa_urls, msds_en_urls, composition_urls, fragrance_urls')
    .in('ingredient_code', ingredientCodes)

  return (data ?? []).map((row) => ({
    ingredient_code: row.ingredient_code,
    ingredient_name: row.ingredient_name ?? null,
    coa_urls: Array.isArray(row.coa_urls) ? (row.coa_urls as string[]) : null,
    msds_en_urls: Array.isArray(row.msds_en_urls) ? (row.msds_en_urls as string[]) : null,
    composition_urls: Array.isArray(row.composition_urls) ? (row.composition_urls as string[]) : null,
    fragrance_urls: Array.isArray(row.fragrance_urls) ? (row.fragrance_urls as string[]) : null,
  }))
}

async function fetchFragranceAllergens(
  supabase: SupabaseClient,
  ingredientCodes: string[]
): Promise<CpnpFragranceAllergen[]> {
  if (ingredientCodes.length === 0) return []

  const { data } = await supabase
    .from('labdoc_fragrance_allergen_contents')
    .select('fragrance_code, fragrance_name, allergen_name, cas_no, content_in_fragrance')
    .in('fragrance_code', ingredientCodes)

  return (data ?? []).map((row) => ({
    fragrance_code: row.fragrance_code,
    fragrance_name: row.fragrance_name ?? null,
    allergen_name: row.allergen_name,
    cas_no: row.cas_no ?? null,
    content_in_fragrance: row.content_in_fragrance ?? null,
  }))
}

export async function fetchCpnpProductData(productCode: string): Promise<CpnpProductData | null> {
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('labdoc_products')
    .select(
      'product_code, korean_name, english_name, management_code, label_volume, fill_volume, ph_standard, viscosity_standard, appearance, cosmetic_type, semi_product_code, shelf_life, storage_method'
    )
    .eq('product_code', productCode)
    .single()

  if (!product) return null

  const bom = await fetchBomItems(supabase, product.semi_product_code)
  const ingredientCodes = bom.map((b) => b.ingredient_code)

  const [
    qcSpecsResult,
    englishSpecsResult,
    allergenRegulationsResult,
    fragranceAllergens,
    ingredientDocs,
    inciResult,
  ] = await Promise.all([
    supabase
      .from('labdoc_product_qc_specs')
      .select('test_item, test_item_en, specification, specification_en, test_method, qc_type, sequence_no')
      .eq('product_code', productCode)
      .order('sequence_no', { ascending: true }),
    supabase
      .from('labdoc_product_english_specs')
      .select('test_item, specification, result')
      .eq('product_code', productCode),
    supabase
      .from('labdoc_allergen_regulations')
      .select('id, allergen_name, inci_name, cas_no, threshold_leave_on, threshold_rinse_off'),
    fetchFragranceAllergens(supabase, ingredientCodes),
    fetchIngredientDocs(supabase, ingredientCodes),
    supabase
      .from('labdoc_product_inci')
      .select('inci_ko, inci_en, inci_cpnp')
      .eq('product_code', productCode)
      .maybeSingle(),
  ])

  const qcSpecs: CpnpQcSpec[] = (qcSpecsResult.data ?? []).map((row) => ({
    test_item: row.test_item,
    test_item_en: row.test_item_en,
    specification: row.specification,
    specification_en: row.specification_en,
    test_method: row.test_method,
    qc_type: row.qc_type,
    sequence_no: row.sequence_no,
  }))

  const englishSpecs: CpnpEnglishSpec[] = (englishSpecsResult.data ?? []).map((row) => ({
    test_item: row.test_item,
    specification: row.specification,
    result: row.result,
  }))

  const allergenRegulations: CpnpAllergenRegulation[] = (allergenRegulationsResult.data ?? []).map((row) => ({
    id: row.id,
    allergen_name: row.allergen_name,
    inci_name: row.inci_name ?? null,
    cas_no: row.cas_no ?? null,
    threshold_leave_on: row.threshold_leave_on ?? null,
    threshold_rinse_off: row.threshold_rinse_off ?? null,
  }))

  const inci: CpnpInci | null = inciResult.data
    ? {
        inci_ko: inciResult.data.inci_ko ?? null,
        inci_en: inciResult.data.inci_en ?? null,
        inci_cpnp: inciResult.data.inci_cpnp ?? null,
      }
    : null

  return {
    product,
    bom,
    qcSpecs,
    englishSpecs,
    allergenRegulations,
    fragranceAllergens,
    ingredientDocs,
    inci,
  }
}

export async function fetchCpnpProductDataBatch(
  productCodes: string[]
): Promise<Map<string, CpnpProductData | null>> {
  const results = await Promise.all(
    productCodes.map(async (code) => [code, await fetchCpnpProductData(code)] as const)
  )
  return new Map(results)
}

export interface CpnpGenerationHistoryItem {
  product_code: string
  document_type: string
  generated_at: string
  pdf_url: string | null
  status: string | null
  metadata: Record<string, unknown> | null
}

export async function fetchCpnpGenerationHistory(
  page = 1,
  limit = 20
): Promise<CpnpGenerationHistoryItem[]> {
  const supabase = await createClient()
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20
  const from = (safePage - 1) * safeLimit
  const to = from + safeLimit - 1

  const queryUnknownTable = supabase.from as unknown as (table: string) => {
    select: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        range: (
          from: number,
          to: number
        ) => Promise<{
          data: unknown[] | null
          error: { message: string } | null
          count: number | null
        }>
      }
    }
  }

  const { data, error } = await queryUnknownTable('cpnp_document_generations')
    .select('product_code, document_type, generated_at, pdf_url, status, metadata')
    .order('generated_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => {
    const item = row as Record<string, unknown>

    return {
      product_code:
        typeof item.product_code === 'string' ? item.product_code : String(item.product_code ?? ''),
      document_type:
        typeof item.document_type === 'string'
          ? item.document_type
          : String(item.document_type ?? ''),
      generated_at:
        typeof item.generated_at === 'string' ? item.generated_at : String(item.generated_at ?? ''),
      pdf_url: typeof item.pdf_url === 'string' ? item.pdf_url : null,
      status: typeof item.status === 'string' ? item.status : null,
      metadata:
        item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : null,
    }
  })
}
