'use server'

import { createClient } from '@/lib/supabase/server'

type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

export interface TestCertificate {
  id: string
  product_code: string
  qc_type: string
  certificate_no: string
  lot_no: string | null
  test_date: string
  manufacture_date: string | null
  manufacture_qty: string | null
  requester: string | null
  sample_collection_date: string | null
  sample_quantity: string | null
  sample_collector: string | null
  receiver: string | null
  judgment_date: string | null
  tester: string | null
  approver: string | null
  overall_judgment: string
  results: CertificateResultsRow[]
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  product_name?: string | null
}

export interface CertificateResult {
  test_item: string
  specification: string
  result: string
  judgment: string
  test_date?: string
  tester?: string
}

export interface PetCertificateResult {
  organism: string
  atcc: string
  initial_count: string
  log_reduction_d7: string
  log_reduction_d14: string
  log_reduction_d28: string
  conclusion: string
}

export interface StabilityCertificateResult {
  parameter: string
  temperature: string
  day_0: string
  day_14: string
  month_1: string
  month_2: string
  month_3: string
}

export interface MltCertificateResult {
  test_item: string
  specification: string
  result: string
}

export type CertificateResultsRow =
  | CertificateResult
  | PetCertificateResult
  | StabilityCertificateResult
  | MltCertificateResult

export type SortField =
  | 'certificate_no'
  | 'product_code'
  | 'lot_no'
  | 'test_date'
  | 'overall_judgment'
  | 'created_at'

export type SortDirection = 'asc' | 'desc'

export interface FetchCertificatesParams {
  search?: string
  qcType?: string
  page?: number
  pageSize?: number
  sortField?: SortField
  sortDir?: SortDirection
  year?: number | null
}

export interface FetchCertificatesResult {
  certificates: TestCertificate[]
  totalCount: number
  error: string | null
}

export async function fetchCertificates(
  params: FetchCertificatesParams = {}
): Promise<FetchCertificatesResult> {
  const {
    search,
    qcType,
    page = 1,
    pageSize = 50,
    sortField = 'created_at',
    sortDir = 'desc',
    year,
  } = params

  const supabase = await createClient()

  let countQuery = fromTable(supabase, 'labdoc_test_certificates')
    .select('id', { count: 'exact', head: true })

  let query = fromTable(supabase, 'labdoc_test_certificates')
    .select('*, labdoc_products!inner(korean_name)')

  if (qcType) {
    countQuery = countQuery.eq('qc_type', qcType)
    query = query.eq('qc_type', qcType)
  }

  if (search) {
    const term = `%${search}%`
    const orFilter = `certificate_no.ilike.${term},lot_no.ilike.${term},product_code.ilike.${term}`
    countQuery = countQuery.or(orFilter)
    query = query.or(orFilter)
  }

  if (year) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    countQuery = countQuery.gte('test_date', startDate).lte('test_date', endDate)
    query = query.gte('test_date', startDate).lte('test_date', endDate)
  }

  const { count } = await countQuery
  const totalCount = count ?? 0

  const ascending = sortDir === 'asc'
  query = query.order(sortField, { ascending })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    console.error('fetchCertificates error:', error)
    let fallbackQuery = fromTable(supabase, 'labdoc_test_certificates')
      .select('*')
      .order(sortField, { ascending })

    if (qcType) fallbackQuery = fallbackQuery.eq('qc_type', qcType)
    if (year) {
      fallbackQuery = fallbackQuery
        .gte('test_date', `${year}-01-01`)
        .lte('test_date', `${year}-12-31`)
    }

    const { data: fallbackData, error: fallbackErr } = await fallbackQuery.range(from, to)

    if (fallbackErr) {
      return { certificates: [], totalCount: 0, error: fallbackErr.message }
    }

    return {
      certificates: (fallbackData ?? []).map((c: any) => ({
        ...c,
        results: (c.results ?? []) as CertificateResultsRow[],
        product_name: null,
      })) as TestCertificate[],
      totalCount,
      error: null,
    }
  }

  const certificates = (data ?? []).map((c: any) => {
    return {
      ...c,
      results: (c.results ?? []) as CertificateResultsRow[],
      product_name: c.labdoc_products?.korean_name ?? null,
      labdoc_products: undefined,
    }
  }) as TestCertificate[]

  return { certificates, totalCount, error: null }
}

export async function fetchQcSpecsTemplate(
  productCode: string,
  qcType: string
): Promise<{
  specs: { test_item: string; specification: string }[]
  error: string | null
}> {
  const supabase = await createClient()

  const dbQcType = qcType === '영문' ? '완제품' : qcType

  const { data, error } = await supabase
    .from('labdoc_product_qc_specs')
    .select('*')
    .eq('product_code', productCode)
    .eq('qc_type', dbQcType)
    .order('sequence_no', { ascending: true })

  if (error) {
    console.error('fetchQcSpecsTemplate error:', error)
    return { specs: [], error: error.message }
  }

  if (qcType === '영문') {
    return {
      specs: (data ?? [])
        .filter((s) => s.test_item_en)
        .map((s) => ({
          test_item: s.test_item_en || s.test_item || '',
          specification: s.specification_en || s.specification || '',
        })),
      error: null,
    }
  }

  return {
    specs: (data ?? []).map((s) => ({
      test_item: s.test_item || '',
      specification: s.specification || '',
    })),
    error: null,
  }
}

export async function generateCertificateNo(): Promise<string> {
  const supabase = await createClient()
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `QC-${dateStr}-`

  const { count } = await fromTable(supabase, 'labdoc_test_certificates')
    .select('id', { count: 'exact', head: true })
    .like('certificate_no', `${prefix}%`)

  const seq = ((count ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}${seq}`
}

export async function createCertificate(data: {
  product_code: string
  qc_type: string
  certificate_no: string
  lot_no?: string
  test_date: string
  manufacture_date?: string
  manufacture_qty?: string
  requester?: string
  sample_collection_date?: string
  sample_quantity?: string
  sample_collector?: string
  receiver?: string
  judgment_date?: string
  tester?: string
  approver?: string
  overall_judgment: string
  results: CertificateResultsRow[]
  notes?: string
}): Promise<{ certificate: TestCertificate | null; error?: string }> {
  const supabase = await createClient()

  const { data: inserted, error } = await fromTable(supabase, 'labdoc_test_certificates')
    .insert({
      product_code: data.product_code,
      qc_type: data.qc_type,
      certificate_no: data.certificate_no,
      lot_no: data.lot_no || null,
      test_date: data.test_date,
      manufacture_date: data.manufacture_date || null,
      manufacture_qty: data.manufacture_qty || null,
      requester: data.requester || null,
      sample_collection_date: data.sample_collection_date || null,
      sample_quantity: data.sample_quantity || null,
      sample_collector: data.sample_collector || null,
      receiver: data.receiver || null,
      judgment_date: data.judgment_date || null,
      tester: data.tester || null,
      approver: data.approver || null,
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
      results: (inserted.results ?? []) as CertificateResultsRow[],
    } as unknown as TestCertificate,
  }
}

export async function updateCertificate(
  id: string,
  data: {
    lot_no?: string
    test_date?: string
    manufacture_date?: string
    manufacture_qty?: string
    requester?: string
    sample_collection_date?: string
    sample_quantity?: string
    sample_collector?: string
    receiver?: string
    judgment_date?: string
    tester?: string
    approver?: string
    overall_judgment?: string
    results?: CertificateResultsRow[]
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.lot_no !== undefined) updateData.lot_no = data.lot_no || null
  if (data.test_date !== undefined) updateData.test_date = data.test_date
  if (data.manufacture_date !== undefined) updateData.manufacture_date = data.manufacture_date || null
  if (data.manufacture_qty !== undefined) updateData.manufacture_qty = data.manufacture_qty || null
  if (data.requester !== undefined) updateData.requester = data.requester || null
  if (data.sample_collection_date !== undefined) updateData.sample_collection_date = data.sample_collection_date || null
  if (data.sample_quantity !== undefined) updateData.sample_quantity = data.sample_quantity || null
  if (data.sample_collector !== undefined) updateData.sample_collector = data.sample_collector || null
  if (data.receiver !== undefined) updateData.receiver = data.receiver || null
  if (data.judgment_date !== undefined) updateData.judgment_date = data.judgment_date || null
  if (data.tester !== undefined) updateData.tester = data.tester || null
  if (data.approver !== undefined) updateData.approver = data.approver || null
  if (data.overall_judgment !== undefined) updateData.overall_judgment = data.overall_judgment
  if (data.results !== undefined) updateData.results = data.results
  if (data.notes !== undefined) updateData.notes = data.notes || null

  const { error } = await fromTable(supabase, 'labdoc_test_certificates')
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

  const { error } = await fromTable(supabase, 'labdoc_test_certificates')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('updateCertificatePdfUrl error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function fetchProductsForSelect(): Promise<{
  products: { product_code: string; korean_name: string | null }[]
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_products')
    .select('product_code, korean_name')
    .order('korean_name', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('fetchProductsForSelect error:', error)
    return { products: [], error: error.message }
  }

  return {
    products: (data ?? []) as { product_code: string; korean_name: string | null }[],
    error: null,
  }
}
