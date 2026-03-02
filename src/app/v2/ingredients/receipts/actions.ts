'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

// ── Types ──

export type ReceiptSortField =
  | 'receipt_date'
  | 'ingredient_code'
  | 'ingredient_name'
  | 'supplier'
  | 'test_no'
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

export interface FetchReceiptsResult {
  receipts: IngredientReceipt[]
  totalCount: number
  error?: string
}


export type CertStatus = 'all' | 'pending' | 'issued'

export interface SyncResult {
  synced: number
  error?: string
}

// ── Sync Purchases → Receipts ──

const SYNC_PAGE_SIZE = 1000

async function fetchAllPurchases(supabase: SupabaseAny) {
  const all: {
    product_code: string | null
    product_name: string | null
    received_date: string | null
    received_qty: number | null
    raw_material_lot: string | null
    supplier_name: string | null
    order_number: string | null
  }[] = []
  let offset = 0

  while (true) {
    const { data, error } = await fromTable(supabase, 'purchases')
      .select('product_code, product_name, received_date, received_qty, raw_material_lot, supplier_name, order_number')
      .eq('status', 'confirmed')
      .eq('material_type', 'raw_material')
      .not('received_date', 'is', null)
      .range(offset, offset + SYNC_PAGE_SIZE - 1)

    if (error) throw new Error(`Failed to fetch purchases: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < SYNC_PAGE_SIZE) break
    offset += SYNC_PAGE_SIZE
  }
  return all
}

async function fetchAllReceiptKeys(supabase: SupabaseAny) {
  const keys = new Set<string>()
  let offset = 0

  while (true) {
    const { data, error } = await fromTable(supabase, 'labdoc_ingredient_receipts')
      .select('ingredient_code, receipt_date')
      .range(offset, offset + SYNC_PAGE_SIZE - 1)

    if (error) throw new Error(`Failed to fetch receipt keys: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data as { ingredient_code: string; receipt_date: string }[]) {
      keys.add(`${r.ingredient_code}__${r.receipt_date}`)
    }
    if (data.length < SYNC_PAGE_SIZE) break
    offset += SYNC_PAGE_SIZE
  }
  return keys
}

export async function syncPurchasesToReceipts(): Promise<SyncResult> {
  try {
    const supabase = await createClient()
    const purchases = await fetchAllPurchases(supabase)
    const existingKeys = await fetchAllReceiptKeys(supabase)

    const toInsert = purchases
      .filter((p) => {
        if (!p.product_code || !p.received_date) return false
        return !existingKeys.has(`${p.product_code}__${p.received_date}`)
      })
      .map((p) => ({
        ingredient_code: p.product_code as string,
        ingredient_name: (p.product_name as string) || (p.product_code as string),
        receipt_date: p.received_date as string,
        receipt_qty: p.received_qty ?? null,
        lot_no: (p.raw_material_lot as string) || null,
        supplier: (p.supplier_name as string) || null,
        notes: p.order_number ? `발주번호: ${p.order_number}` : null,
      }))

    if (toInsert.length === 0) return { synced: 0 }

    const BATCH_SIZE = 100
    let inserted = 0

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const { error } = await fromTable(supabase, 'labdoc_ingredient_receipts').insert(batch)
      if (error) {
        console.error('syncPurchasesToReceipts batch error:', error)
        return { synced: inserted, error: error.message }
      }
      inserted += batch.length
    }

    return { synced: inserted }
  } catch (err) {
    console.error('syncPurchasesToReceipts error:', err)
    return { synced: 0, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
// ── Fetch Receipts ──

const DEFAULT_PAGE_SIZE = 50

export async function fetchReceipts(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortField: ReceiptSortField = 'receipt_date',
  sortDir: SortDirection = 'desc',
  year: number | null = null,
  certStatus: CertStatus = 'all'
): Promise<FetchReceiptsResult> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const ascending = sortDir === 'asc'

  let query = supabase
    .from('labdoc_ingredient_receipts')
    .select(
      'id, receipt_date, ingredient_code, ingredient_name, lot_no, receipt_qty, supplier, coa_reference, test_no, notes, year',
      { count: 'exact' }
    )

  if (search) {
    const term = `%${search}%`
    query = query.or(
      `ingredient_code.ilike.${term},ingredient_name.ilike.${term},supplier.ilike.${term},test_no.ilike.${term},lot_no.ilike.${term}`
    )
  }

  if (year) {
    query = query.eq('year', year)
  }

  let certReceiptIds: string[] | null = null
  if (certStatus !== 'all') {
    const { data: allCerts } = await fromTable(supabase, 'labdoc_ingredient_certificates')
      .select('receipt_id')
    certReceiptIds = (allCerts ?? [])
      .map((c: { receipt_id: string | null }) => c.receipt_id)
      .filter(Boolean) as string[]
  }

  if (certStatus === 'issued') {
    if (!certReceiptIds || certReceiptIds.length === 0) {
      return { receipts: [], totalCount: 0 }
    }
    query = query.in('id', certReceiptIds)
  } else if (certStatus === 'pending') {
    if (certReceiptIds && certReceiptIds.length > 0) {
      query = query.not('id', 'in', `(${certReceiptIds.join(',')})`)
    }
  }

  const { data, count, error } = await query
    .order(sortField, { ascending })
    .range(from, to)

  if (error) {
    console.error('fetchReceipts error:', error)
    return { receipts: [], totalCount: 0, error: error.message }
  }

  const receipts = (data ?? []) as Omit<
    IngredientReceipt,
    'has_certificate' | 'certificate_id'
  >[]

  if (receipts.length === 0) {
    return { receipts: [], totalCount: count ?? 0 }
  }

  const receiptIds = receipts.map((r) => r.id)
  const { data: certs } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .select('id, receipt_id')
    .in('receipt_id', receiptIds)

  const certMap = new Map<string, string>()
  if (certs) {
    for (const c of certs as { id: string; receipt_id: string }[]) {
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


export async function fetchReceiptCounts(
  search: string = '',
  year: number | null = null
): Promise<{ total: number; pending: number; issued: number }> {
  const supabase = await createClient()

  let totalQuery = fromTable(supabase, 'labdoc_ingredient_receipts')
    .select('id', { count: 'exact', head: true })

  if (search) {
    const term = `%${search}%`
    totalQuery = totalQuery.or(
      `ingredient_code.ilike.${term},ingredient_name.ilike.${term},supplier.ilike.${term},test_no.ilike.${term},lot_no.ilike.${term}`
    )
  }
  if (year) {
    totalQuery = totalQuery.eq('year', year)
  }

  const { count: total } = await totalQuery

  const { data: certs } = await fromTable(supabase, 'labdoc_ingredient_certificates')
    .select('receipt_id')
  const certReceiptIds = (certs ?? [])
    .map((c: { receipt_id: string | null }) => c.receipt_id)
    .filter(Boolean) as string[]

  let issued = 0
  if (certReceiptIds.length > 0) {
    let issuedQuery = fromTable(supabase, 'labdoc_ingredient_receipts')
      .select('id', { count: 'exact', head: true })
      .in('id', certReceiptIds)

    if (search) {
      const term = `%${search}%`
      issuedQuery = issuedQuery.or(
        `ingredient_code.ilike.${term},ingredient_name.ilike.${term},supplier.ilike.${term},test_no.ilike.${term},lot_no.ilike.${term}`
      )
    }
    if (year) {
      issuedQuery = issuedQuery.eq('year', year)
    }

    const { count: issuedCount } = await issuedQuery
    issued = issuedCount ?? 0
  }

  const totalNum = total ?? 0
  return { total: totalNum, pending: totalNum - issued, issued }
}
// ── Certificate CRUD ──

export async function generateCertificateNo(): Promise<string> {
  const supabase = await createClient()
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `IC-${dateStr}-`

  const { count } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .select('id', { count: 'exact', head: true })
    .like('test_no', `${prefix}%`)

  const seq = ((count ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}${seq}`
}

export async function fetchCertificate(
  receiptId: string
): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .select('*')
    .eq('receipt_id', receiptId)
    .maybeSingle()

  if (error) {
    console.error('fetchCertificate error:', error)
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

export async function fetchCertificateById(
  id: string
): Promise<{ certificate: IngredientCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('fetchCertificateById error:', error)
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

export async function createCertificate(data: {
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

  const { data: inserted, error } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
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
    console.error('createCertificate error:', error)
    return { certificate: null, error: error.message }
  }

  return {
    certificate: {
      ...inserted,
      results: (inserted.results ?? []) as IngredientCertificateResult[],
    } as unknown as IngredientCertificate,
  }
}

export async function updateCertificate(
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
  if (data.receipt_date !== undefined)
    updateData.receipt_date = data.receipt_date || null
  if (data.receipt_qty !== undefined)
    updateData.receipt_qty = data.receipt_qty ?? null
  if (data.supplier !== undefined) updateData.supplier = data.supplier || null
  if (data.tester !== undefined) updateData.tester = data.tester || null
  if (data.approver !== undefined) updateData.approver = data.approver || null
  if (data.reviewer !== undefined) updateData.reviewer = data.reviewer || null
  if (data.test_date !== undefined)
    updateData.test_date = data.test_date || null
  if (data.judgment_date !== undefined)
    updateData.judgment_date = data.judgment_date || null
  if (data.overall_judgment !== undefined)
    updateData.overall_judgment = data.overall_judgment
  if (data.results !== undefined) updateData.results = data.results
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { error } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('updateCertificate error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateCertificatePdfUrl(
  id: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await fromTable(
    supabase,
    'labdoc_ingredient_certificates'
  )
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('updateCertificatePdfUrl error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
