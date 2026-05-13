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
  pif_status?: string | null
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

export interface ProductRelatedProduct {
  product_code: string
  management_code: string | null
  korean_name: string | null
  english_name: string | null
  label_volume: string | null
  fill_volume: string | null
  semi_product_code: string | null
  p_product_code: string | null
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
  default_function?: string | null
  function_source?: 'master' | 'product'
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
  productFunction: string | null
  defaultFunction: string | null
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

export interface ProductInciItem {
  id: string
  product_code: string
  merge_key: string
  inci_name_ko: string | null
  inci_name_en: string
  cas_no: string | null
  function_name: string | null
  wt_percent: number
  is_below_one_percent: boolean
  sort_group: string
  calculated_order: number
  declared_order: number
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
  inciItems: ProductInciItem[]
  relatedProducts: ProductRelatedProduct[]
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
  productCode: string,
  semiProductCode: string | null
): Promise<NormalizedBomItem[]> {
  if (!semiProductCode) {
    return []
  }

  const { data: bomData, error: bomError } = await supabase
    .from('bom_master')
    .select('materialcode, materialname, usemount')
    .eq('prdcode', semiProductCode)
    .eq('품목구분', '[원재료]')
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

  const [componentsResult, ingredientsResult, ingredientFunctionsResult, componentFunctionsResult] = await Promise.all([
    supabase
      .from('labdoc_ingredient_components')
      .select('*')
      .in('ingredient_code', baseCodes)
      .order('component_order', { ascending: true }),
    supabase
      .from('labdoc_ingredients')
      .select('ingredient_code, coa_urls')
      .in('ingredient_code', baseCodes),
    supabase
      .from('labdoc_product_ingredient_functions')
      .select('ingredient_code, function')
      .eq('product_code', productCode)
      .in('ingredient_code', baseCodes),
    supabase
      .from('labdoc_product_component_functions')
      .select('component_id, function')
      .eq('product_code', productCode),
  ])

  const productFunctionMap = new Map<string, string | null>()
  if (!ingredientFunctionsResult.error) {
    for (const row of ingredientFunctionsResult.data ?? []) {
      productFunctionMap.set(row.ingredient_code, row.function)
    }
  }

  const componentFunctionMap = new Map<string, string | null>()
  if (!componentFunctionsResult.error) {
    for (const row of componentFunctionsResult.data ?? []) {
      componentFunctionMap.set(row.component_id, row.function)
    }
  }

  const componentsMap = new Map<string, IngredientComponentRow[]>()
  for (const component of componentsResult.data ?? []) {
    const defaultFunction = component.function
    const productFunction = componentFunctionMap.get(component.id)
    const effectiveFunction =
      productFunction !== undefined ? productFunction : defaultFunction
    const existing = componentsMap.get(component.ingredient_code) ?? []
    existing.push({
      ...(component as IngredientComponentRow),
      function: effectiveFunction,
      default_function: defaultFunction,
      function_source: productFunction !== undefined ? 'product' : 'master',
    })
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
    .map(([baseCode, value]) => {
      const components = componentsMap.get(baseCode) ?? []
      const defaultFunction =
        Array.from(new Set(components.map((component) => component.default_function).filter(Boolean)))
          .join(', ') || null
      return {
        baseCode,
        materialname: value.materialname,
        totalUsemount: value.totalUsemount,
        components,
        coaUrls: coaMap.get(baseCode) ?? [],
        productFunction: productFunctionMap.get(baseCode) ?? defaultFunction,
        defaultFunction,
      }
    })
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
      inciItems: [],
      relatedProducts: [],
    }
  }

  const [images, revisionsResult, specsResult, processResult, bom, inciResult, inciItemsResult, relatedProductsResult] =
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
      fetchBomWithComponents(supabase, productCode, product.semi_product_code),
      supabase
        .from('labdoc_product_inci')
        .select('*')
        .eq('product_code', productCode)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('labdoc_product_inci_items')
        .select('id, product_code, merge_key, inci_name_ko, inci_name_en, cas_no, function_name, wt_percent, is_below_one_percent, sort_group, calculated_order, declared_order')
        .eq('product_code', productCode)
        .order('declared_order', { ascending: true }),
      product.management_code
        ? supabase
            .from('labdoc_products')
            .select('product_code, management_code, korean_name, english_name, label_volume, fill_volume, semi_product_code, p_product_code')
            .eq('management_code', product.management_code)
            .order('product_code', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ])

  return {
    product: product as ProductDetailProduct,
    images,
    revisions: (revisionsResult.data ?? []) as ProductRevision[],
    specs: (specsResult.data ?? []) as ProductQcSpec[],
    process: processResult,
    bom,
    inci: (inciResult.data as ProductInci | null) ?? null,
    inciItems: ((inciItemsResult.data ?? []) as unknown) as ProductInciItem[],
    relatedProducts: (relatedProductsResult.data ?? []) as ProductRelatedProduct[],
  }
}

const DERIVED_PRODUCT_RESET_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'ingredients_en_pdf_url',
  'ingredients_en_csv_url',
  'formula_breakdown_pdf_url',
  'formula_breakdown_csv_url',
  'inci_summary_pdf_url',
  'inci_summary_csv_url',
])

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text && text.length > 0 ? text : null
}

function cloneRowForProduct(
  row: Record<string, unknown>,
  productCode: string,
  now: string,
  extra?: Record<string, unknown>
) {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id') continue
    next[key] = value
  }
  next.product_code = productCode
  if ('created_at' in row) next.created_at = now
  if ('updated_at' in row) next.updated_at = now
  return { ...next, ...extra }
}

export async function createDerivedProduct(input: {
  sourceProductCode: string
  newProductCode: string
  koreanName?: string | null
  englishName?: string | null
  labelVolume?: string | null
  fillVolume?: string | null
  packagingUnit?: string | null
  pProductCode?: string | null
  copyImages?: boolean
}): Promise<{ success: boolean; productCode?: string; error?: string }> {
  const supabase = await createClient()
  const sourceProductCode = input.sourceProductCode.trim()
  const newProductCode = input.newProductCode.trim()
  const now = new Date().toISOString()

  if (!sourceProductCode || !newProductCode) {
    return { success: false, error: '원본 제품코드와 신규 제품코드는 필수입니다' }
  }

  if (sourceProductCode === newProductCode) {
    return { success: false, error: '신규 제품코드는 원본 제품코드와 달라야 합니다' }
  }

  const { data: existingProduct, error: existingError } = await supabase
    .from('labdoc_products')
    .select('product_code')
    .eq('product_code', newProductCode)
    .maybeSingle()

  if (existingError) {
    return { success: false, error: existingError.message }
  }

  if (existingProduct) {
    return { success: false, error: `${newProductCode} 제품코드가 이미 존재합니다` }
  }

  const { data: existingRiseProduct } = await supabase
    .from('rise_products')
    .select('id')
    .eq('code', newProductCode)
    .maybeSingle()

  const { data: sourceProduct, error: sourceError } = await supabase
    .from('labdoc_products')
    .select('*')
    .eq('product_code', sourceProductCode)
    .maybeSingle()

  if (sourceError) {
    return { success: false, error: sourceError.message }
  }

  if (!sourceProduct) {
    return { success: false, error: '원본 제품을 찾을 수 없습니다' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicSupabase = supabase as any

  const productPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(sourceProduct)) {
    if (DERIVED_PRODUCT_RESET_FIELDS.has(key)) continue
    productPayload[key] = value
  }

  productPayload.product_code = newProductCode
  productPayload.korean_name = cleanText(input.koreanName) ?? sourceProduct.korean_name
  productPayload.english_name = cleanText(input.englishName) ?? sourceProduct.english_name
  productPayload.label_volume = cleanText(input.labelVolume)
  productPayload.fill_volume = cleanText(input.fillVolume)
  productPayload.packaging_unit = cleanText(input.packagingUnit) ?? sourceProduct.packaging_unit
  productPayload.p_product_code = cleanText(input.pProductCode)
  productPayload.created_at = now
  productPayload.updated_at = now

  const { error: insertProductError } = await dynamicSupabase
    .from('labdoc_products')
    .insert(productPayload)

  if (insertProductError) {
    console.error('createDerivedProduct product error:', insertProductError)
    return { success: false, error: insertProductError.message }
  }

  async function copyProductCodeTable(tableName: string, extra?: Record<string, unknown>) {
    const { data, error } = await dynamicSupabase
      .from(tableName)
      .select('*')
      .eq('product_code', sourceProductCode)

    if (error) {
      if (error.message?.includes('Could not find the table')) return
      throw new Error(`${tableName}: ${error.message}`)
    }

    const rows = ((data ?? []) as Record<string, unknown>[]).map((row) =>
      cloneRowForProduct(row, newProductCode, now, extra)
    )
    if (rows.length === 0) return

    const { error: insertError } = await dynamicSupabase.from(tableName).insert(rows)
    if (insertError) {
      throw new Error(`${tableName}: ${insertError.message}`)
    }
  }

  try {
    await copyProductCodeTable('labdoc_product_revisions')
    await copyProductCodeTable('labdoc_product_qc_specs')
    await copyProductCodeTable('labdoc_product_inci')
    await copyProductCodeTable('labdoc_product_inci_items')
    await copyProductCodeTable('labdoc_product_work_specs', {
      product_name: productPayload.korean_name,
      label_volume: productPayload.label_volume,
      fill_volume: productPayload.fill_volume,
    })
    await copyProductCodeTable('labdoc_product_subsidiary_materials', {
      management_code: sourceProduct.management_code,
    })
    await copyProductCodeTable('labdoc_product_ingredient_functions')
    await copyProductCodeTable('labdoc_product_component_functions')

    const { data: sourceProcesses, error: processesError } = await dynamicSupabase
      .from('labdoc_manufacturing_processes')
      .select('*')
      .eq('product_code', sourceProductCode)

    if (processesError) {
      throw new Error(`labdoc_manufacturing_processes: ${processesError.message}`)
    }

    for (const process of (sourceProcesses ?? []) as Record<string, unknown>[]) {
      const oldProcessId = process.id
      const processPayload = cloneRowForProduct(process, newProductCode, now, {
        product_name: productPayload.korean_name,
      })
      const { data: insertedProcess, error: insertProcessError } = await dynamicSupabase
        .from('labdoc_manufacturing_processes')
        .insert(processPayload)
        .select('id')
        .single()

      if (insertProcessError) {
        throw new Error(`labdoc_manufacturing_processes: ${insertProcessError.message}`)
      }

      const { data: steps, error: stepsError } = await dynamicSupabase
        .from('labdoc_manufacturing_process_steps')
        .select('*')
        .eq('process_id', oldProcessId)

      if (stepsError) {
        throw new Error(`labdoc_manufacturing_process_steps: ${stepsError.message}`)
      }

      const stepRows = ((steps ?? []) as Record<string, unknown>[]).map((step) => {
        const next: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(step)) {
          if (key === 'id') continue
          next[key] = value
        }
        next.process_id = insertedProcess.id
        if ('created_at' in step) next.created_at = now
        return next
      })

      if (stepRows.length > 0) {
        const { error: insertStepsError } = await dynamicSupabase
          .from('labdoc_manufacturing_process_steps')
          .insert(stepRows)
        if (insertStepsError) {
          throw new Error(`labdoc_manufacturing_process_steps: ${insertStepsError.message}`)
        }
      }
    }

    const { data: sourceRiseProduct } = await supabase
      .from('rise_products')
      .select('*')
      .eq('code', sourceProductCode)
      .maybeSingle()

    if (sourceRiseProduct && !existingRiseProduct) {
      const riseProductPayload: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(sourceRiseProduct)) {
        if (key === 'id') continue
        riseProductPayload[key] = value
      }
      riseProductPayload.code = newProductCode
      riseProductPayload.name = productPayload.korean_name ?? sourceRiseProduct.name
      riseProductPayload.specification = productPayload.label_volume ?? sourceRiseProduct.specification

      const { data: newRiseProduct, error: riseProductError } = await dynamicSupabase
        .from('rise_products')
        .insert(riseProductPayload)
        .select('id')
        .single()

      if (riseProductError) {
        throw new Error(`rise_products: ${riseProductError.message}`)
      }

      if (input.copyImages) {
        const { data: sourceImages, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', sourceRiseProduct.id ?? '')

        if (imagesError) {
          throw new Error(`product_images: ${imagesError.message}`)
        }

        const imageRows = (sourceImages ?? []).map((image) => {
          const next: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(image)) {
            if (key === 'id') continue
            next[key] = value
          }
          next.product_id = newRiseProduct.id
          if ('created_at' in image) next.created_at = now
          if ('updated_at' in image) next.updated_at = now
          return next
        })

        if (imageRows.length > 0) {
          const { error: imageInsertError } = await dynamicSupabase.from('product_images').insert(imageRows)
          if (imageInsertError) {
            throw new Error(`product_images: ${imageInsertError.message}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('createDerivedProduct copy error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '파생 품목 데이터 복사 중 오류가 발생했습니다',
    }
  }

  return { success: true, productCode: newProductCode }
}

const STANDARD_EDITABLE_FIELDS = new Set([
  'product_code',
  'management_code',
  'korean_name',
  'english_name',
  'cosmetic_type',
  'appearance',
  'usage_instructions',
  'functional_claim',
  'storage_method',
  'label_volume',
  'fill_volume',
  'shelf_life',
  'ph_standard',
  'viscosity_standard',
  'specific_gravity',
  'packaging_unit',
  'dosage',
  'usage_precautions',
  'remarks',
])

export async function updateProductStandard(input: {
  productCode: string
  values: Record<string, string | number | null>
}): Promise<{ success: boolean; productCode: string; error?: string }> {
  const supabase = await createClient()
  const nextProductCodeValue = input.values.product_code
  const nextProductCode =
    typeof nextProductCodeValue === 'string' && nextProductCodeValue.trim().length > 0
      ? nextProductCodeValue.trim()
      : input.productCode

  const updatePayload: Record<string, string | number | null> = {}
  for (const [field, value] of Object.entries(input.values)) {
    if (STANDARD_EDITABLE_FIELDS.has(field)) {
      updatePayload[field] = value
    }
  }
  updatePayload.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('labdoc_products')
    .update(updatePayload)
    .eq('product_code', input.productCode)

  if (error) {
    console.error('updateProductStandard error:', error)
    return { success: false, productCode: input.productCode, error: error.message }
  }

  if (nextProductCode !== input.productCode) {
    const relatedTables = [
      'labdoc_product_revisions',
      'labdoc_product_qc_specs',
      'labdoc_product_inci',
      'labdoc_manufacturing_processes',
      'labdoc_product_subsidiary_materials',
      'labdoc_test_certificates',
      'labdoc_product_msds_properties',
      'labdoc_product_ingredient_functions',
      'labdoc_product_component_functions',
    ] as const

    for (const table of relatedTables) {
      const result = await supabase
        .from(table)
        .update({ product_code: nextProductCode })
        .eq('product_code', input.productCode)
      if (result.error && !result.error.message.includes('Could not find the table')) {
        console.warn(`Failed to propagate product_code to ${table}:`, result.error.message)
      }
    }

    await supabase
      .from('rise_products')
      .update({ code: nextProductCode })
      .eq('code', input.productCode)
  }

  return { success: true, productCode: nextProductCode }
}

export async function updateProductFunction(input: {
  productCode: string
  ingredientCode: string
  componentId?: string
  functionValue: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const functionValue = input.functionValue?.trim() || null

  if (input.componentId) {
    const { error } = await supabase
      .from('labdoc_product_component_functions')
      .upsert({
        product_code: input.productCode,
        ingredient_code: input.ingredientCode,
        component_id: input.componentId,
        function: functionValue,
        updated_at: now,
      }, { onConflict: 'product_code,component_id' })

    if (error) {
      console.error('updateProductFunction component error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  const { error } = await supabase
    .from('labdoc_product_ingredient_functions')
    .upsert({
      product_code: input.productCode,
      ingredient_code: input.ingredientCode,
      function: functionValue,
      updated_at: now,
    }, { onConflict: 'product_code,ingredient_code' })

  if (error) {
    console.error('updateProductFunction ingredient error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateProductFunctions(input: {
  productCode: string
  entries: Array<{
    ingredientCode: string
    componentId?: string
    functionValue: string | null
  }>
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const componentEntries = new Map<string, {
    ingredientCode: string
    componentId: string
    functionValue: string | null
  }>()
  const ingredientEntries = new Map<string, {
    ingredientCode: string
    functionValue: string | null
  }>()

  for (const entry of input.entries) {
    const functionValue = entry.functionValue?.trim() || null
    if (entry.componentId) {
      componentEntries.set(entry.componentId, {
        ingredientCode: entry.ingredientCode,
        componentId: entry.componentId,
        functionValue,
      })
      continue
    }

    ingredientEntries.set(entry.ingredientCode, {
      ingredientCode: entry.ingredientCode,
      functionValue,
    })
  }

  if (componentEntries.size > 0) {
    const { error } = await supabase
      .from('labdoc_product_component_functions')
      .upsert(
        Array.from(componentEntries.values()).map((entry) => ({
          product_code: input.productCode,
          ingredient_code: entry.ingredientCode,
          component_id: entry.componentId,
          function: entry.functionValue,
          updated_at: now,
        })),
        { onConflict: 'product_code,component_id' }
      )

    if (error) {
      console.error('updateProductFunctions component error:', error)
      return { success: false, error: error.message }
    }
  }

  if (ingredientEntries.size > 0) {
    const { error } = await supabase
      .from('labdoc_product_ingredient_functions')
      .upsert(
        Array.from(ingredientEntries.values()).map((entry) => ({
          product_code: input.productCode,
          ingredient_code: entry.ingredientCode,
          function: entry.functionValue,
          updated_at: now,
        })),
        { onConflict: 'product_code,ingredient_code' }
      )

    if (error) {
      console.error('updateProductFunctions ingredient error:', error)
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}


export async function updateProductInciItemOrders(input: {
  productCode: string
  items: Array<{ id: string; declaredOrder: number }>
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromInciItems = (supabase as any).from('labdoc_product_inci_items')
  const now = new Date().toISOString()

  for (const item of input.items) {
    const { error } = await fromInciItems
      .update({ declared_order: item.declaredOrder, updated_at: now })
      .eq('product_code', input.productCode)
      .eq('id', item.id)

    if (error) {
      console.error('updateProductInciItemOrders item error:', error)
      return { success: false, error: error.message }
    }
  }

  const { data: rows, error: fetchError } = await fromInciItems
    .select('inci_name_ko, inci_name_en')
    .eq('product_code', input.productCode)
    .order('declared_order', { ascending: true })

  if (fetchError) {
    console.error('updateProductInciItemOrders fetch error:', fetchError)
    return { success: false, error: fetchError.message }
  }

  const inciKo = (rows ?? [])
    .map((row: { inci_name_ko?: string | null; inci_name_en?: string | null }) => row.inci_name_ko || row.inci_name_en)
    .filter(Boolean)
    .join(', ')
  const inciEn = (rows ?? [])
    .map((row: { inci_name_en?: string | null }) => row.inci_name_en)
    .filter(Boolean)
    .join(', ')

  const { error: inciError } = await supabase
    .from('labdoc_product_inci')
    .update({
      inci_ko: inciKo || null,
      inci_en: inciEn || null,
      inci_cpnp: inciEn || null,
      inci_fda: inciEn || null,
      updated_at: now,
    })
    .eq('product_code', input.productCode)

  if (inciError) {
    console.error('updateProductInciItemOrders inci error:', inciError)
    return { success: false, error: inciError.message }
  }

  return { success: true }
}
