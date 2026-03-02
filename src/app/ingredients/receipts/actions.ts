'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
// Helper to work around "Type instantiation is excessively deep" error
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

// ── Types ──

export type SortField = 'receipt_date' | 'ingredient_code' | 'ingredient_name' | 'supplier' | 'test_no'
export type SortDirection = 'asc' | 'desc'

export interface IngredientReceipt {
  id: string
  receipt_date: string
  ingredient_code: string
  ingredient_name: string
  lot_no: string | null
  receipt_qty: number | null
  supplier: string | null
  coa_reference: string | null
  test_no: string | null
  notes: string | null
  year: number
  has_certificate: boolean
  certificate_id: string | null
}

export interface IngredientSpec {
  id: string
  ingredient_code: string
  ingredient_name: string | null
  spec_item: string
  spec_standard: string | null
}

export interface IngredientCertificateResult {
  test_item: string
  specification: string
  result: string
  judgment: string
  test_date?: string
  tester?: string
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

export interface FetchReceiptsParams {
  search?: string
  page?: number
  pageSize?: number
  sortField?: SortField
  sortDir?: SortDirection
  year?: number | null
}

export interface FetchReceiptsResult {
  receipts: IngredientReceipt[]
  totalCount: number
  error?: string
}

// ── Fetch receipts (with certificate status) ──

const PAGE_SIZE = 50

export async function fetchIngredientReceipts({
  search = '',
  page = 1,
  pageSize = PAGE_SIZE,
  sortField = 'receipt_date',
  sortDir = 'desc',
  year = null,
}: FetchReceiptsParams = {}): Promise<FetchReceiptsResult> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const ascending = sortDir === 'asc'

  let query = supabase
    .from('labdoc_ingredient_receipts')
    .select('id, receipt_date, ingredient_code, ingredient_name, lot_no, receipt_qty, supplier, coa_reference, test_no, notes, year', { count: 'exact' })

  if (search) {
    const term = `%${search}%`
    query = query.or(
      `ingredient_code.ilike.${term},ingredient_name.ilike.${term},supplier.ilike.${term},test_no.ilike.${term},lot_no.ilike.${term}`
    )
  }

  if (year) {
    query = query.eq('year', year)
  }

  const { data, count, error } = await query
    .order(sortField, { ascending })
    .range(from, to)

  if (error) {
    console.error('fetchIngredientReceipts error:', error)
    return { receipts: [], totalCount: 0, error: error.message }
  }

  const receipts = (data ?? []) as (Omit<IngredientReceipt, 'has_certificate' | 'certificate_id'>)[]

  if (receipts.length === 0) {
    return { receipts: [], totalCount: count ?? 0 }
  }

  // Batch-fetch certificate existence for these receipt IDs
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

  const enriched: IngredientReceipt[] = receipts.map((r) => ({
    ...r,
    has_certificate: certMap.has(r.id),
    certificate_id: certMap.get(r.id) ?? null,
  }))

  return {
    receipts: enriched,
    totalCount: count ?? 0,
  }
}

// ── Fetch specs for a given ingredient_code ──

export async function fetchIngredientSpecs(ingredientCode: string): Promise<IngredientSpec[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_ingredient_specs')
    .select('id, ingredient_code, ingredient_name, spec_item, spec_standard')
    .eq('ingredient_code', ingredientCode)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchIngredientSpecs error:', error)
    return []
  }

  return (data ?? []) as IngredientSpec[]
}

// ── Generate certificate number ──

export async function generateIngredientCertificateNo(): Promise<string> {
  const supabase = await createClient()
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `IC-${dateStr}-`

  const { count } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('id', { count: 'exact', head: true })
    .like('test_no', `${prefix}%`)

  const seq = ((count ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}${seq}`
}

// ── Create ingredient certificate ──

export async function createIngredientCertificate(data: {
  receipt_id?: string
  ingredient_code: string
  ingredient_name: string
  lot_no?: string
  test_no?: string
  receipt_date?: string
  receipt_qty?: number
  supplier?: string
  tester?: string
  approver?: string
  reviewer?: string
  test_date?: string
  judgment_date?: string
  overall_judgment: string
  results: IngredientCertificateResult[]
  notes?: string
}): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data: inserted, error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .insert({
      receipt_id: data.receipt_id || null,
      ingredient_code: data.ingredient_code,
      ingredient_name: data.ingredient_name,
      lot_no: data.lot_no || null,
      test_no: data.test_no || null,
      receipt_date: data.receipt_date || null,
      receipt_qty: data.receipt_qty ?? null,
      supplier: data.supplier || null,
      tester: data.tester || null,
      approver: data.approver || null,
      reviewer: data.reviewer || null,
      test_date: data.test_date || null,
      judgment_date: data.judgment_date || null,
      overall_judgment: data.overall_judgment,
      results: data.results,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createIngredientCertificate error:', error)
    return { certificate: null, error: error.message }
  }

  return {
    certificate: {
      ...inserted,
      results: (inserted.results ?? []) as IngredientCertificateResult[],
    } as unknown as IngredientCertificate,
  }
}

// ── Update ingredient certificate ──

export async function updateIngredientCertificate(
  id: string,
  data: {
    lot_no?: string
    test_no?: string
    receipt_date?: string
    receipt_qty?: number
    supplier?: string
    tester?: string
    approver?: string
    reviewer?: string
    test_date?: string
    judgment_date?: string
    overall_judgment?: string
    results?: IngredientCertificateResult[]
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.lot_no !== undefined) updateData.lot_no = data.lot_no || null
  if (data.test_no !== undefined) updateData.test_no = data.test_no || null
  if (data.receipt_date !== undefined) updateData.receipt_date = data.receipt_date || null
  if (data.receipt_qty !== undefined) updateData.receipt_qty = data.receipt_qty ?? null
  if (data.supplier !== undefined) updateData.supplier = data.supplier || null
  if (data.tester !== undefined) updateData.tester = data.tester || null
  if (data.approver !== undefined) updateData.approver = data.approver || null
  if (data.reviewer !== undefined) updateData.reviewer = data.reviewer || null
  if (data.test_date !== undefined) updateData.test_date = data.test_date || null
  if (data.judgment_date !== undefined) updateData.judgment_date = data.judgment_date || null
  if (data.overall_judgment !== undefined) updateData.overall_judgment = data.overall_judgment
  if (data.results !== undefined) updateData.results = data.results
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('updateIngredientCertificate error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Update PDF URL ──

export async function updateIngredientCertificatePdfUrl(
  id: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('updateIngredientCertificatePdfUrl error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Fetch certificate by receipt_id ──

export async function fetchIngredientCertificate(
  receiptId: string
): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('*')
    .eq('receipt_id', receiptId)
    .maybeSingle()

  if (error) {
    console.error('fetchIngredientCertificate error:', error)
    return { certificate: null, error: error.message }
  }

  if (!data) {
    return { certificate: null }
  }

  return {
    certificate: {
      ...data,
      results: (data.results ?? []) as IngredientCertificateResult[],
    } as unknown as IngredientCertificate,
  }
}

// ── Fetch certificate by ID ──

export async function fetchIngredientCertificateById(
  id: string
): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('fetchIngredientCertificateById error:', error)
    return { certificate: null, error: error.message }
  }

  if (!data) {
    return { certificate: null }
  }

  return {
    certificate: {
      ...data,
      results: (data.results ?? []) as IngredientCertificateResult[],
    } as unknown as IngredientCertificate,
  }
}
