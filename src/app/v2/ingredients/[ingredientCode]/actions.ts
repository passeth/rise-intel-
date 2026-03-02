'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

// ── Types ──

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

// ── Fetch Receipts by Ingredient Code ──

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

  const receipts = (data ?? []) as Omit<
    IngredientReceiptRow,
    'has_certificate' | 'certificate_id'
  >[]

  if (receipts.length === 0) return []

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

  return receipts.map((r) => ({
    ...r,
    has_certificate: certMap.has(r.id),
    certificate_id: certMap.get(r.id) ?? null,
  }))
}


// ── Document URL Types ──

export type DocCategory =
  | 'coa_urls'
  | 'composition_urls'
  | 'msds_en_urls'
  | 'msds_kr_urls'
  | 'fragrance_urls'
  | 'other_urls'

// ── Append Document URL ──

export async function appendDocumentUrl(
  ingredientCode: string,
  docType: DocCategory,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data, error: fetchError } = await fromTable(supabase, 'labdoc_ingredients')
    .select(docType)
    .eq('ingredient_code', ingredientCode)
    .maybeSingle()

  if (fetchError || !data) {
    return { success: false, error: fetchError?.message || 'Ingredient not found' }
  }

  const currentUrls = ((data as Record<string, unknown>)[docType] ?? []) as string[]
  const updatedUrls = [...currentUrls, url]

  const { error: updateError } = await fromTable(supabase, 'labdoc_ingredients')
    .update({ [docType]: updatedUrls })
    .eq('ingredient_code', ingredientCode)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

// ── Remove Document URL ──

export async function removeDocumentUrl(
  ingredientCode: string,
  docType: DocCategory,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data, error: fetchError } = await fromTable(supabase, 'labdoc_ingredients')
    .select(docType)
    .eq('ingredient_code', ingredientCode)
    .maybeSingle()

  if (fetchError || !data) {
    return { success: false, error: fetchError?.message || 'Ingredient not found' }
  }

  const currentUrls = ((data as Record<string, unknown>)[docType] ?? []) as string[]
  const updatedUrls = currentUrls.filter((u) => u !== url)

  const { error: updateError } = await fromTable(supabase, 'labdoc_ingredients')
    .update({ [docType]: updatedUrls })
    .eq('ingredient_code', ingredientCode)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}