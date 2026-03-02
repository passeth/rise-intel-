'use server'

import { createClient } from '@/lib/supabase/server'

export interface QcSpec {
  id: string
  product_code: string
  qc_type: string
  sequence_no: number
  test_item: string
  test_item_en: string | null
  specification: string | null
  specification_en: string | null
  test_method: string | null
  result: string | null
  created_at: string
}

const EDITABLE_FIELDS = new Set([
  'test_item',
  'test_item_en',
  'specification',
  'specification_en',
  'test_method',
  'result',
])

export async function fetchQcSpecs(
  productCode: string,
  qcType: string
): Promise<{ specs: QcSpec[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('labdoc_product_qc_specs')
    .select('*')
    .eq('product_code', productCode)
    .eq('qc_type', qcType)
    .order('sequence_no', { ascending: true })

  if (error) {
    console.error('fetchQcSpecs error:', error)
    return { specs: [], error: error.message }
  }

  return { specs: (data ?? []) as QcSpec[], error: null }
}

export async function updateQcSpec(
  id: string,
  field: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  if (!EDITABLE_FIELDS.has(field)) {
    return { success: false, error: `수정할 수 없는 필드입니다: ${field}` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('labdoc_product_qc_specs')
    .update({ [field]: value || null })
    .eq('id', id)

  if (error) {
    console.error('updateQcSpec error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function addQcSpec(
  productCode: string,
  qcType: string
): Promise<{ spec: QcSpec | null; error?: string }> {
  const supabase = await createClient()

  // Get max sequence_no
  const { data: maxRow } = await supabase
    .from('labdoc_product_qc_specs')
    .select('sequence_no')
    .eq('product_code', productCode)
    .eq('qc_type', qcType)
    .order('sequence_no', { ascending: false })
    .limit(1)

  const nextSeq = (maxRow && maxRow.length > 0 ? (maxRow[0].sequence_no ?? 0) : 0) + 1

  const { data, error } = await supabase
    .from('labdoc_product_qc_specs')
    .insert({
      product_code: productCode,
      qc_type: qcType,
      sequence_no: nextSeq,
      test_item: '새 항목',
    })
    .select()
    .single()

  if (error) {
    console.error('addQcSpec error:', error)
    return { spec: null, error: error.message }
  }

  return { spec: data as QcSpec }
}

export async function deleteQcSpec(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('labdoc_product_qc_specs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteQcSpec error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
