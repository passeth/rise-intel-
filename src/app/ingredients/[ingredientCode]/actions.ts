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
