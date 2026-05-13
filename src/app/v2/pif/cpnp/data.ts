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
  CpnpCoaCertificate,
  CpnpCoaResult,
  CpnpPetCertificate,
  CpnpPetResult,
  CpnpStabilityCertificate,
  CpnpStabilityMeasurement,
  CpnpMltCertificate,
  CpnpMltResult,
} from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function parseNotesRecord(notes: unknown): Record<string, unknown> | null {
  const noteText = asString(notes)
  if (!noteText) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(noteText)
    return asRecord(parsed)
  } catch {
    return null
  }
}

function readFromRawOrNotes(
  raw: Record<string, unknown>,
  notes: Record<string, unknown> | null,
  key: string
): string | null {
  return asString(raw[key]) ?? asString(notes?.[key])
}

async function fetchLatestTestCertificate(
  supabase: SupabaseClient,
  productCode: string,
  qcType: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('labdoc_test_certificates')
    .select('*')
    .eq('product_code', productCode)
    .eq('qc_type', qcType)
    .order('test_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as Record<string, unknown>
}

function parseCertificateBase(
  raw: Record<string, unknown>
): {
  id: string | null
  certificate_no: string | null
  lot_no: string | null
  test_date: string | null
  judgment_date: string | null
  overall_judgment: string | null
  approver: string | null
  tester: string | null
} {
  return {
    id: asString(raw.id),
    certificate_no: asString(raw.certificate_no),
    lot_no: asString(raw.lot_no),
    test_date: asString(raw.test_date),
    judgment_date: asString(raw.judgment_date),
    overall_judgment: asString(raw.overall_judgment),
    approver: asString(raw.approver),
    tester: asString(raw.tester),
  }
}

function parseCoaResults(raw: unknown): CpnpCoaResult[] {
  return asUnknownArray(raw)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      test_item: asString(item.test_item) ?? asString(item.test) ?? asString(item.item),
      specification: asString(item.specification) ?? asString(item.spec),
      result: asString(item.result),
      judgment: asString(item.judgment),
    }))
}

function parseCoaCertificate(raw: Record<string, unknown> | null): CpnpCoaCertificate | null {
  if (!raw) {
    return null
  }

  return {
    ...parseCertificateBase(raw),
    results: parseCoaResults(raw.results),
  }
}

async function fetchLatestCertificateForTypes(
  supabase: SupabaseClient,
  productCode: string,
  qcTypes: string[]
): Promise<Record<string, unknown> | null> {
  if (qcTypes.length === 0) {
    return null
  }

  const { data, error } = await supabase
    .from('labdoc_test_certificates')
    .select('*')
    .eq('product_code', productCode)
    .in('qc_type', qcTypes)
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as Record<string, unknown>
}

function parsePetResults(raw: unknown): CpnpPetResult[] {
  return asUnknownArray(raw)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      organism: asString(item.organism) ?? asString(item.test_item) ?? '—',
      atcc: asString(item.atcc),
      initial_count: asString(item.initial_count) ?? asString(item.count_d0),
      log_reduction_d7: asString(item.log_reduction_d7) ?? asString(item.d7),
      log_reduction_d14: asString(item.log_reduction_d14) ?? asString(item.d14),
      log_reduction_d28: asString(item.log_reduction_d28) ?? asString(item.d28),
      conclusion: asString(item.conclusion) ?? asString(item.judgment),
    }))
}

function parseStabilityResults(raw: unknown): CpnpStabilityMeasurement[] {
  return asUnknownArray(raw)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      parameter: asString(item.parameter) ?? asString(item.test_item) ?? '—',
      temperature: asString(item.temperature) ?? asString(item.condition) ?? '—',
      day_0: asString(item.day_0) ?? asString(item.d0),
      day_14: asString(item.day_14) ?? asString(item.d14),
      month_1: asString(item.month_1) ?? asString(item.m1),
      month_2: asString(item.month_2) ?? asString(item.m2),
      month_3: asString(item.month_3) ?? asString(item.m3),
    }))
}

function parseMltResults(raw: unknown): CpnpMltResult[] {
  return asUnknownArray(raw)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      test_item: asString(item.test_item) ?? asString(item.organism) ?? '—',
      specification: asString(item.specification) ?? '—',
      result: asString(item.result),
    }))
}

function parsePetCertificate(raw: Record<string, unknown> | null): CpnpPetCertificate | null {
  if (!raw) {
    return null
  }

  const notes = parseNotesRecord(raw.notes)

  return {
    ...parseCertificateBase(raw),
    lab_no: readFromRawOrNotes(raw, notes, 'lab_no'),
    test_start_date: readFromRawOrNotes(raw, notes, 'test_start_date'),
    test_end_date: readFromRawOrNotes(raw, notes, 'test_end_date'),
    criteria: readFromRawOrNotes(raw, notes, 'criteria'),
    results: parsePetResults(raw.results),
  }
}

function parseStabilityCertificate(
  raw: Record<string, unknown> | null
): CpnpStabilityCertificate | null {
  if (!raw) {
    return null
  }

  const notes = parseNotesRecord(raw.notes)

  return {
    ...parseCertificateBase(raw),
    manufacturing_date: asString(raw.manufacture_date),
    specifications: readFromRawOrNotes(raw, notes, 'specifications'),
    results: parseStabilityResults(raw.results),
  }
}

function parseMltCertificate(raw: Record<string, unknown> | null): CpnpMltCertificate | null {
  if (!raw) {
    return null
  }

  const notes = parseNotesRecord(raw.notes)

  return {
    ...parseCertificateBase(raw),
    test_start_date: readFromRawOrNotes(raw, notes, 'test_start_date'),
    test_end_date: readFromRawOrNotes(raw, notes, 'test_end_date'),
    method: readFromRawOrNotes(raw, notes, 'method'),
    results: parseMltResults(raw.results),
  }
}

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
    .eq('품목구분', '[원재료]')
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
    coaCertificateRaw,
    petCertificateRaw,
    stabilityCertificateRaw,
    mltCertificateRaw,
  ] = await Promise.all([
    supabase
      .from('labdoc_product_qc_specs')
      .select('test_item, test_item_en, specification, specification_en, test_method, result, qc_type, sequence_no')
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
    fetchLatestCertificateForTypes(supabase, productCode, ['영문', '완제품']),
    fetchLatestTestCertificate(supabase, productCode, 'pet'),
    fetchLatestTestCertificate(supabase, productCode, 'stability'),
    fetchLatestTestCertificate(supabase, productCode, 'mlt'),
  ])

  const qcSpecs: CpnpQcSpec[] = (qcSpecsResult.data ?? []).map((row) => ({
    test_item: row.test_item,
    test_item_en: row.test_item_en,
    specification: row.specification,
    specification_en: row.specification_en,
    test_method: row.test_method,
    result: (row as { result?: string | null }).result ?? null,
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

  const coaCertificate = parseCoaCertificate(coaCertificateRaw)
  const petCertificate = parsePetCertificate(petCertificateRaw)
  const stabilityCertificate = parseStabilityCertificate(stabilityCertificateRaw)
  const mltCertificate = parseMltCertificate(mltCertificateRaw)

  return {
    product,
    bom,
    qcSpecs,
    englishSpecs,
    allergenRegulations,
    fragranceAllergens,
    ingredientDocs,
    inci,
    coaCertificate,
    petCertificate,
    stabilityCertificate,
    mltCertificate,
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
  id: string | null
  product_code: string
  document_type: string
  generated_at: string
  pdf_url: string | null
  status: string | null
  reused: boolean
  package_no: string | null
  issued_date: string | null
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

  const queryUnknownTable = (table: string) =>
    supabase.from(table as never) as unknown as {
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
    .select('id, product_code, document_type, generated_at, issued_date, pdf_url, status, metadata')
    .order('generated_at', { ascending: false })
    .range(from, to)

  if (error) {
    if (error.message.includes("Could not find the table 'public.cpnp_document_generations'")) {
      return []
    }

    throw new Error(error.message)
  }

  return (data ?? []).map((row) => {
    const item = row as Record<string, unknown>
    const metadata = item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : null

    return {
      id: typeof item.id === 'string' ? item.id : null,
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
      reused: metadata?.reused === true,
      package_no: typeof metadata?.package_no === 'string' ? metadata.package_no : null,
      issued_date: typeof item.issued_date === 'string' ? item.issued_date : null,
      metadata,
    }
  })
}
