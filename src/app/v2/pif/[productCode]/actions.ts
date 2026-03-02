'use server'

import { createClient } from '@/lib/supabase/server'

export interface ProductDetailProduct {
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

export interface ProductDetailImage {
  id: string
  image_url: string
  display_order: number | null
}

export interface ProductRevision {
  id: string
  product_code: string
  revision_no: number
  revision_date: string | null
  revision_content: string | null
}

export interface ProductQcSpec {
  id: string
  product_code: string
  sequence_no: number | null
  test_item: string | null
  specification: string | null
  test_method: string | null
  result: string | null
  qc_type: string | null
  test_item_en: string | null
  specification_en: string | null
}

export interface ProductManufacturingProcess {
  id: string
  product_code: string
  product_name: string | null
  batch_number: string | null
  batch_unit: string | null
  dept_name: string | null
  actual_qty: string | null
  mfg_date: string | null
  operator: string | null
  notes_content: string | null
  total_time: string | null
  special_notes: string | null
}

export interface ProductManufacturingStep {
  id: string
  process_id: string
  step_num: number
  step_type: string | null
  step_name: string | null
  step_desc: string | null
  work_time: string | null
  checker: string | null
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

export interface NormalizedBomItem {
  baseCode: string
  materialname: string
  totalUsemount: number
  components: IngredientComponentRow[]
  coaUrls: string[]
}

export interface ProductInci {
  id: string
  product_code: string
  inci_ko: string | null
  inci_en: string | null
  inci_cpnp: string | null
  inci_fda: string | null
  designated_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductDetailData {
  product: ProductDetailProduct | null
  images: ProductDetailImage[]
  revisions: ProductRevision[]
  specs: ProductQcSpec[]
  process: {
    process: ProductManufacturingProcess | null
    steps: ProductManufacturingStep[]
  }
  bom: NormalizedBomItem[]
  inci: ProductInci | null
}

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function fetchBomWithComponents(
  supabase: SupabaseClient,
  semiProductCode: string | null
): Promise<NormalizedBomItem[]> {
  if (!semiProductCode) {
    return []
  }

  const { data: bomData, error: bomError } = await supabase
    .from('bom_master')
    .select('materialcode, materialname, usemount')
    .eq('prdcode', semiProductCode)
    .order('usemount', { ascending: false })

  if (bomError || !bomData || bomData.length === 0) {
    return []
  }

  const normalizedMap = new Map<
    string,
    {
      materialname: string
      totalUsemount: number
    }
  >()

  for (const item of bomData) {
    if (!item.materialcode) {
      continue
    }

    const baseCode = normalizeIngredientCode(item.materialcode)
    const existing = normalizedMap.get(baseCode)
    if (existing) {
      existing.totalUsemount += item.usemount ?? 0
      continue
    }

    normalizedMap.set(baseCode, {
      materialname: item.materialname ?? baseCode,
      totalUsemount: item.usemount ?? 0,
    })
  }

  const baseCodes = Array.from(normalizedMap.keys())
  if (baseCodes.length === 0) {
    return []
  }

  const [componentsResult, ingredientsResult] = await Promise.all([
    supabase
      .from('labdoc_ingredient_components')
      .select('*')
      .in('ingredient_code', baseCodes)
      .order('component_order', { ascending: true }),
    supabase
      .from('labdoc_ingredients')
      .select('ingredient_code, coa_urls')
      .in('ingredient_code', baseCodes),
  ])

  const componentsMap = new Map<string, IngredientComponentRow[]>()
  for (const component of componentsResult.data ?? []) {
    const existing = componentsMap.get(component.ingredient_code) ?? []
    existing.push(component as IngredientComponentRow)
    componentsMap.set(component.ingredient_code, existing)
  }

  const coaMap = new Map<string, string[]>()
  for (const ingredient of ingredientsResult.data ?? []) {
    const urls = Array.isArray(ingredient.coa_urls)
      ? ingredient.coa_urls.filter(
          (url): url is string => typeof url === 'string' && url.length > 0
        )
      : []
    coaMap.set(ingredient.ingredient_code, urls)
  }

  return Array.from(normalizedMap.entries())
    .map(([baseCode, value]) => ({
      baseCode,
      materialname: value.materialname,
      totalUsemount: value.totalUsemount,
      components: componentsMap.get(baseCode) ?? [],
      coaUrls: coaMap.get(baseCode) ?? [],
    }))
    .sort((a, b) => b.totalUsemount - a.totalUsemount)
}

export async function fetchProductDetail(
  productCode: string
): Promise<ProductDetailData> {
  const supabase = await createClient()

  const { data: product, error: productError } = await supabase
    .from('labdoc_products')
    .select('*')
    .eq('product_code', productCode)
    .maybeSingle()

  if (productError) {
    throw new Error(productError.message)
  }

  if (!product) {
    return {
      product: null,
      images: [],
      revisions: [],
      specs: [],
      process: { process: null, steps: [] },
      bom: [],
      inci: null,
    }
  }

  const [images, revisionsResult, specsResult, processResult, bom, inciResult] =
    await Promise.all([
      (async () => {
        const { data: riseProduct } = await supabase
          .from('rise_products')
          .select('id')
          .eq('code', productCode)
          .maybeSingle()

        const riseProductId = riseProduct?.id ?? null
        if (!riseProductId) {
          return [] as ProductDetailImage[]
        }

        const { data: productImages } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', riseProductId)
          .order('display_order', { ascending: true })

        return (productImages ?? []) as ProductDetailImage[]
      })(),
      supabase
        .from('labdoc_product_revisions')
        .select('*')
        .eq('product_code', productCode)
        .order('revision_no', { ascending: true }),
      supabase
        .from('labdoc_product_qc_specs')
        .select('*')
        .eq('product_code', productCode)
        .order('sequence_no', { ascending: true }),
      (async () => {
        const { data: process } = await supabase
          .from('labdoc_manufacturing_processes')
          .select('*')
          .eq('product_code', productCode)
          .maybeSingle()

        if (!process) {
          return {
            process: null,
            steps: [] as ProductManufacturingStep[],
          }
        }

        const { data: steps } = await supabase
          .from('labdoc_manufacturing_process_steps')
          .select('*')
          .eq('process_id', process.id)
          .order('step_num', { ascending: true })

        return {
          process: process as ProductManufacturingProcess,
          steps: (steps ?? []) as ProductManufacturingStep[],
        }
      })(),
      fetchBomWithComponents(supabase, product.semi_product_code),
      supabase
        .from('labdoc_product_inci')
        .select('*')
        .eq('product_code', productCode)
        .maybeSingle(),
    ])

  return {
    product: product as ProductDetailProduct,
    images,
    revisions: (revisionsResult.data ?? []) as ProductRevision[],
    specs: (specsResult.data ?? []) as ProductQcSpec[],
    process: processResult,
    bom,
    inci: (inciResult.data as ProductInci | null) ?? null,
  }
}
