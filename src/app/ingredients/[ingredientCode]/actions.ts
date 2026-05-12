'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

// ── Types ──

export interface IngredientDetail {
  id: string
  ingredient_code: string
  ingredient_name: string
  manufacturer: string | null
  origin_country: string | null
  purchase_type: string | null
  purchase_method: string | null
  coa_urls: string[]
  composition_urls: string[]
  msds_en_urls: string[]
  msds_kr_urls: string[]
  fragrance_urls: string[]
  other_urls: string[]
}

export interface IngredientComponent {
  id: string
  ingredient_code: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number
}

export interface IngredientReceiptRow {
  id: string
  receipt_date: string
  lot_no: string | null
  receipt_qty: number | null
  supplier: string | null
  test_no: string | null
  notes: string | null
  has_certificate: boolean
  certificate_id: string | null
}

export interface IngredientCertificateResult {
  test_item: string
  specification: string
  result: string
  judgment: string
}

export interface IngredientCertificate {
  id: string
  receipt_id: string | null
  ingredient_code: string
  ingredient_name: string
  lot_no: string | null
  test_no: string | null
  receipt_date: string | null
  receipt_qty: number | null
  supplier: string | null
  tester: string | null
  approver: string | null
  reviewer: string | null
  test_date: string | null
  judgment_date: string | null
  overall_judgment: string | null
  results: IngredientCertificateResult[]
  notes: string | null
  pdf_url: string | null
  created_at: string | null
  updated_at: string | null
}

// ── Fetch ingredient detail ──

export async function fetchIngredientDetail(
  ingredientCode: string
): Promise<{ ingredient: IngredientDetail | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredients')
    .select('id, ingredient_code, ingredient_name, manufacturer, origin_country, purchase_type, purchase_method, coa_urls, composition_urls, msds_en_urls, msds_kr_urls, fragrance_urls, other_urls')
    .eq('ingredient_code', ingredientCode)
    .maybeSingle()

  if (error) {
    console.error('fetchIngredientDetail error:', error)
    return { ingredient: null, error: error.message }
  }

  if (!data) {
    return { ingredient: null }
  }

  return {
    ingredient: {
      ...data,
      coa_urls: (data.coa_urls ?? []) as string[],
      composition_urls: (data.composition_urls ?? []) as string[],
      msds_en_urls: (data.msds_en_urls ?? []) as string[],
      msds_kr_urls: (data.msds_kr_urls ?? []) as string[],
      fragrance_urls: (data.fragrance_urls ?? []) as string[],
      other_urls: (data.other_urls ?? []) as string[],
    } as IngredientDetail,
  }
}

// ── Fetch components ──

export async function fetchIngredientComponents(
  ingredientCode: string
): Promise<IngredientComponent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredient_components')
    .select('id, ingredient_code, inci_name_en, inci_name_kr, cas_number, composition_ratio, function, component_order')
    .eq('ingredient_code', ingredientCode)
    .order('component_order', { ascending: true })

  if (error) {
    console.error('fetchIngredientComponents error:', error)
    return []
  }

  return (data ?? []) as IngredientComponent[]
}

// ── Fetch receipts for this ingredient ──

export async function fetchIngredientReceiptsByCode(
  ingredientCode: string
): Promise<IngredientReceiptRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredient_receipts')
    .select('id, receipt_date, lot_no, receipt_qty, supplier, test_no, notes')
    .eq('ingredient_code', ingredientCode)
    .order('receipt_date', { ascending: false })

  if (error) {
    console.error('fetchIngredientReceiptsByCode error:', error)
    return []
  }

  const receipts = (data ?? []) as (Omit<IngredientReceiptRow, 'has_certificate' | 'certificate_id'>)[]

  if (receipts.length === 0) return []

  // Batch-fetch certificate existence
  const receiptIds = receipts.map((r) => r.id)
  const { data: certs } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('id, receipt_id')
    .in('receipt_id', receiptIds)

  const certMap = new Map<string, string>()
  if (certs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of certs as any[]) {
      if (c.receipt_id) certMap.set(c.receipt_id, c.id)
    }
  }

  return receipts.map((r) => ({
    ...r,
    has_certificate: certMap.has(r.id),
    certificate_id: certMap.get(r.id) ?? null,
  }))
}

// ── Fetch certificate by receipt_id ──

export async function fetchIngredientCertificateByReceipt(
  receiptId: string
): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('*')
    .eq('receipt_id', receiptId)
    .maybeSingle()

  if (error) {
    console.error('fetchIngredientCertificateByReceipt error:', error)
    return { certificate: null, error: error.message }
  }

  if (!data) return { certificate: null }

  return {
    certificate: {
      ...data,
      results: (data.results ?? []) as IngredientCertificateResult[],
    } as unknown as IngredientCertificate,
  }
}

// ── Fetch ingredient specs ──

export async function fetchIngredientSpecsByCode(
  ingredientCode: string
): Promise<{ spec_item: string; spec_standard: string | null }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredient_specs')
    .select('spec_item, spec_standard')
    .eq('ingredient_code', ingredientCode)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchIngredientSpecsByCode error:', error)
    return []
  }

  return (data ?? []) as { spec_item: string; spec_standard: string | null }[]
}

// ── Update Ingredient Components ──

export interface ComponentInput {
  id?: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number
}

export async function updateIngredientComponents(
  ingredientCode: string,
  components: ComponentInput[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('labdoc_ingredient_components')
      .select('id')
      .eq('ingredient_code', ingredientCode)

    if (fetchError) {
      console.error('fetch existing components error:', fetchError)
      return { error: fetchError.message }
    }

    const existingIds = new Set((existing ?? []).map((c) => c.id))
    const newIds = new Set(components.filter((c) => c.id).map((c) => c.id as string))

    const toDelete = [...existingIds].filter((id) => !newIds.has(id))
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('labdoc_ingredient_components')
        .delete()
        .in('id', toDelete)
      if (deleteError) {
        console.error('delete components error:', deleteError)
        return { error: deleteError.message }
      }
    }

    const existingComponents = components.filter((c) => c.id)
    for (const comp of existingComponents) {
      const { error: updateError } = await supabase
        .from('labdoc_ingredient_components')
        .update({ component_order: comp.component_order + 10000 })
        .eq('id', comp.id as string)
      if (updateError) {
        console.error('update temp order error:', updateError)
        return { error: updateError.message }
      }
    }

    const upsertData = components.map((comp) => ({
      id: comp.id || undefined,
      ingredient_code: ingredientCode,
      inci_name_en: comp.inci_name_en,
      inci_name_kr: comp.inci_name_kr,
      cas_number: comp.cas_number,
      composition_ratio: comp.composition_ratio,
      function: comp.function,
      component_order: comp.component_order,
    }))

    const { error: upsertError } = await supabase
      .from('labdoc_ingredient_components')
      .upsert(upsertData, { onConflict: 'id' })

    if (upsertError) {
      console.error('upsert components error:', upsertError)
      return { error: upsertError.message }
    }

    return {}
  } catch (err) {
    console.error('updateIngredientComponents error:', err)
    return { error: '알 수 없는 오류가 발생했습니다.' }
  }
}

// ── Upload Ingredient Document ──

export type DocumentCategory = 'coa_urls' | 'composition_urls' | 'msds_en_urls' | 'msds_kr_urls' | 'fragrance_urls' | 'other_urls'

export async function uploadIngredientDocument(
  ingredientCode: string,
  category: DocumentCategory,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: '파일이 없습니다.' }
  }

  try {
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `ingredients/${ingredientCode}/${category}/${timestamp}_${sanitizedFileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('upload error:', uploadError)
      return { error: uploadError.message }
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    const { data: ingredient, error: fetchError } = await supabase
      .from('labdoc_ingredients')
      .select(category)
      .eq('ingredient_code', ingredientCode)
      .maybeSingle()

    if (fetchError) {
      console.error('fetch ingredient error:', fetchError)
      return { error: fetchError.message }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUrls = ((ingredient as any)?.[category] ?? []) as string[]
    const updatedUrls = [...currentUrls, publicUrl]

    const { error: updateError } = await supabase
      .from('labdoc_ingredients')
      .update({ [category]: updatedUrls })
      .eq('ingredient_code', ingredientCode)

    if (updateError) {
      console.error('update ingredient error:', updateError)
      return { error: updateError.message }
    }

    return { url: publicUrl }
  } catch (err) {
    console.error('uploadIngredientDocument error:', err)
    return { error: '알 수 없는 오류가 발생했습니다.' }
  }
}

// ── Delete Ingredient Document ──

export async function deleteIngredientDocument(
  ingredientCode: string,
  category: DocumentCategory,
  url: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  try {
    const { data: ingredient, error: fetchError } = await supabase
      .from('labdoc_ingredients')
      .select(category)
      .eq('ingredient_code', ingredientCode)
      .maybeSingle()

    if (fetchError) {
      console.error('fetch ingredient error:', fetchError)
      return { error: fetchError.message }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUrls = ((ingredient as any)?.[category] ?? []) as string[]
    const updatedUrls = currentUrls.filter((u) => u !== url)

    const { error: updateError } = await supabase
      .from('labdoc_ingredients')
      .update({ [category]: updatedUrls })
      .eq('ingredient_code', ingredientCode)

    if (updateError) {
      console.error('update ingredient error:', updateError)
      return { error: updateError.message }
    }

    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/storage/v1/object/public/documents/')
      if (pathParts.length > 1) {
        const storagePath = pathParts[1]
        await supabase.storage.from('documents').remove([storagePath])
      }
    } catch {
      // Storage deletion errors are ignored
    }

    return {}
  } catch (err) {
    console.error('deleteIngredientDocument error:', err)
    return { error: '알 수 없는 오류가 발생했습니다.' }
  }
}

export interface PhysicalProperty {
  id: string
  ingredient_code: string
  property_name: string
  property_name_en: string | null
  property_name_kr: string | null
  value_text: string | null
  value_min: number | null
  value_max: number | null
  unit: string | null
  source: string | null
  notes: string | null
}

export interface PhysicalPropertyInput {
  property_name: string
  property_name_en: string
  property_name_kr: string
  value_text: string | null
  value_min: number | null
  value_max: number | null
  unit: string | null
  source: string | null
  notes: string | null
}

const STANDARD_PHYSICAL_PROPERTIES: {
  name: string
  name_en: string
  name_kr: string
  unit: string
  calculation_method: 'weighted_average' | 'minimum' | 'maximum' | 'none'
}[] = [
  {
    name: 'melting_point',
    name_en: 'Melting/Freezing Point',
    name_kr: '융점/빙점',
    unit: '°C',
    calculation_method: 'weighted_average',
  },
  {
    name: 'boiling_point',
    name_en: 'Boiling Point',
    name_kr: '비점',
    unit: '°C',
    calculation_method: 'weighted_average',
  },
  {
    name: 'flash_point',
    name_en: 'Flash Point',
    name_kr: '인화점',
    unit: '°C',
    calculation_method: 'minimum',
  },
  {
    name: 'density',
    name_en: 'Density',
    name_kr: '밀도',
    unit: 'g/cm³',
    calculation_method: 'weighted_average',
  },
  {
    name: 'vapor_pressure',
    name_en: 'Vapor Pressure',
    name_kr: '증기압',
    unit: 'hPa',
    calculation_method: 'weighted_average',
  },
  {
    name: 'solubility',
    name_en: 'Solubility',
    name_kr: '용해도',
    unit: '',
    calculation_method: 'none',
  },
  {
    name: 'refractive_index',
    name_en: 'Refractive Index',
    name_kr: '굴절률',
    unit: '',
    calculation_method: 'weighted_average',
  },
]

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

function formatCalculatedValue(value: number, unit: string): string {
  const rounded = Number(value.toFixed(4))
  return unit ? `${rounded} ${unit}` : `${rounded}`
}

export async function fetchIngredientPhysicalProperties(
  ingredientCode: string
): Promise<PhysicalProperty[]> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_physical_properties')
    .select('id, ingredient_code, property_name, property_name_en, property_name_kr, value_text, value_min, value_max, unit, source, notes')
    .eq('ingredient_code', ingredientCode)
    .order('property_name', { ascending: true })

  if (error) {
    console.error('fetchIngredientPhysicalProperties error:', error)
    return []
  }

  return (data ?? []) as PhysicalProperty[]
}

export async function upsertIngredientPhysicalProperties(
  ingredientCode: string,
  properties: PhysicalPropertyInput[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  try {
    for (const property of properties) {
      const { error } = await fromTable(supabase, 'labdoc_ingredient_physical_properties').upsert(
        {
          ingredient_code: ingredientCode,
          property_name: property.property_name,
          property_name_en: property.property_name_en || null,
          property_name_kr: property.property_name_kr || null,
          value_text: property.value_text,
          value_min: property.value_min,
          value_max: property.value_max,
          unit: property.unit,
          source: property.source,
          notes: property.notes,
        },
        { onConflict: 'ingredient_code,property_name' }
      )

      if (error) {
        console.error('upsertIngredientPhysicalProperties error:', error)
        return { error: error.message }
      }
    }

    return {}
  } catch (err) {
    console.error('upsertIngredientPhysicalProperties error:', err)
    return { error: '알 수 없는 오류가 발생했습니다.' }
  }
}

export async function calculateProductMsdsProperties(
  productCode: string
): Promise<{ properties: { property_name: string; property_name_en: string; value: string }[]; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: product, error: productError } = await fromTable(supabase, 'labdoc_products')
      .select('semi_product_code')
      .eq('product_code', productCode)
      .maybeSingle()

    if (productError) {
      console.error('calculateProductMsdsProperties product fetch error:', productError)
      return { properties: [], error: productError.message }
    }

    const semiProductCode = (product?.semi_product_code as string | null) ?? null
    if (!semiProductCode) {
      return { properties: [] }
    }

    const { data: bomRows, error: bomError } = await fromTable(supabase, 'bom_master')
      .select('materialcode, usemount')
      .eq('prdcode', semiProductCode)

    if (bomError) {
      console.error('calculateProductMsdsProperties bom fetch error:', bomError)
      return { properties: [], error: bomError.message }
    }

    const ingredientWeightMap = new Map<string, number>()
    for (const row of (bomRows ?? []) as { materialcode: string | null; usemount: number | null }[]) {
      if (!row.materialcode) continue
      const baseCode = normalizeIngredientCode(row.materialcode)
      ingredientWeightMap.set(baseCode, (ingredientWeightMap.get(baseCode) ?? 0) + (row.usemount ?? 0))
    }

    const ingredientCodes = Array.from(ingredientWeightMap.keys())
    if (ingredientCodes.length === 0) {
      return { properties: [] }
    }

    const { data: propertyRows, error: propertyError } = await fromTable(supabase, 'labdoc_ingredient_physical_properties')
      .select('ingredient_code, property_name, property_name_en, value_text, value_min, unit')
      .in('ingredient_code', ingredientCodes)

    if (propertyError) {
      console.error('calculateProductMsdsProperties physical properties fetch error:', propertyError)
      return { properties: [], error: propertyError.message }
    }

    const rowsByProperty = new Map<
      string,
      {
        ingredient_code: string
        property_name: string
        property_name_en: string | null
        value_text: string | null
        value_min: number | null
        unit: string | null
      }[]
    >()

    for (const row of (propertyRows ?? []) as {
      ingredient_code: string
      property_name: string
      property_name_en: string | null
      value_text: string | null
      value_min: number | null
      unit: string | null
    }[]) {
      const existing = rowsByProperty.get(row.property_name) ?? []
      existing.push(row)
      rowsByProperty.set(row.property_name, existing)
    }

    const calculatedProperties: { property_name: string; property_name_en: string; value: string }[] = []
    const upsertRows: {
      product_code: string
      property_name: string
      property_name_en: string
      calculated_value: string
      calculated_numeric: number | null
      calculation_method: string
      auto_calculated: boolean
      last_calculated_at: string
    }[] = []

    for (const standardProperty of STANDARD_PHYSICAL_PROPERTIES) {
      const matchedRows = rowsByProperty.get(standardProperty.name) ?? []
      if (matchedRows.length === 0) continue

      let calculatedNumeric: number | null = null
      let calculatedValue: string | null = null

      if (standardProperty.calculation_method === 'weighted_average') {
        let weightedSum = 0
        let totalWeight = 0

        for (const row of matchedRows) {
          if (row.value_min === null) continue
          const weight = ingredientWeightMap.get(row.ingredient_code) ?? 0
          if (weight <= 0) continue

          weightedSum += row.value_min * weight
          totalWeight += weight
        }

        if (totalWeight > 0) {
          calculatedNumeric = weightedSum / totalWeight
          calculatedValue = formatCalculatedValue(calculatedNumeric, standardProperty.unit)
        }
      } else if (standardProperty.calculation_method === 'minimum') {
        let minValue: number | null = null

        for (const row of matchedRows) {
          if (row.value_min === null) continue
          const weight = ingredientWeightMap.get(row.ingredient_code) ?? 0
          if (weight <= 0) continue

          if (minValue === null || row.value_min < minValue) {
            minValue = row.value_min
          }
        }

        if (minValue !== null) {
          calculatedNumeric = minValue
          calculatedValue = formatCalculatedValue(calculatedNumeric, standardProperty.unit)
        }
      } else if (standardProperty.calculation_method === 'maximum') {
        let maxValue: number | null = null

        for (const row of matchedRows) {
          if (row.value_min === null) continue
          const weight = ingredientWeightMap.get(row.ingredient_code) ?? 0
          if (weight <= 0) continue

          if (maxValue === null || row.value_min > maxValue) {
            maxValue = row.value_min
          }
        }

        if (maxValue !== null) {
          calculatedNumeric = maxValue
          calculatedValue = formatCalculatedValue(calculatedNumeric, standardProperty.unit)
        }
      } else if (standardProperty.calculation_method === 'none') {
        const uniqueTexts = Array.from(
          new Set(
            matchedRows
              .filter((row) => (ingredientWeightMap.get(row.ingredient_code) ?? 0) > 0)
              .map((row) => row.value_text?.trim() ?? '')
              .filter((value) => value.length > 0)
          )
        )

        if (uniqueTexts.length > 0) {
          calculatedValue = uniqueTexts.join(', ')
        }
      }

      if (!calculatedValue) continue

      calculatedProperties.push({
        property_name: standardProperty.name,
        property_name_en: standardProperty.name_en,
        value: calculatedValue,
      })

      upsertRows.push({
        product_code: productCode,
        property_name: standardProperty.name,
        property_name_en: standardProperty.name_en,
        calculated_value: calculatedValue,
        calculated_numeric: calculatedNumeric,
        calculation_method: standardProperty.calculation_method,
        auto_calculated: true,
        last_calculated_at: new Date().toISOString(),
      })
    }

    if (upsertRows.length > 0) {
      const { error: upsertError } = await fromTable(supabase, 'labdoc_product_msds_properties').upsert(
        upsertRows,
        { onConflict: 'product_code,property_name' }
      )

      if (upsertError) {
        console.error('calculateProductMsdsProperties upsert error:', upsertError)
        return { properties: [], error: upsertError.message }
      }
    }

    return { properties: calculatedProperties }
  } catch (err) {
    console.error('calculateProductMsdsProperties error:', err)
    return { properties: [], error: '알 수 없는 오류가 발생했습니다.' }
  }
}

export async function fetchProductMsdsProperties(
  productCode: string
): Promise<{ property_name: string; property_name_en: string | null; display_value: string }[]> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_product_msds_properties')
    .select('property_name, property_name_en, calculated_value, override_value')
    .eq('product_code', productCode)
    .order('property_name', { ascending: true })

  if (error) {
    console.error('fetchProductMsdsProperties error:', error)
    return []
  }

  return ((data ?? []) as {
    property_name: string
    property_name_en: string | null
    calculated_value: string | null
    override_value: string | null
  }[]).map((row) => ({
    property_name: row.property_name,
    property_name_en: row.property_name_en,
    display_value: row.override_value ?? row.calculated_value ?? '',
  }))
}
