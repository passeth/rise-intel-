'use server'

import { createClient } from '@/lib/supabase/server'

// ── Types ──

export interface BasicInfoData {
  product_code: string
  management_code?: string | null
  korean_name?: string | null
  english_name?: string | null
  cosmetic_type?: string | null
  appearance?: string | null
  label_volume?: string | null
  fill_volume?: string | null
  ph_standard?: string | null
  viscosity_standard?: string | null
  specific_gravity?: number | null
  shelf_life?: string | null
  storage_method?: string | null
  usage_instructions?: string | null
  dosage?: string | null
  functional_claim?: string | null
  usage_precautions?: string | null
  packaging_unit?: string | null
  allergen_korean?: string | null
  allergen_english?: string | null
  recommended_age?: string | null
  recycling_grade?: string | null
  label_position?: string | null
  raw_material_report?: number | null
  standardized_name?: number | null
  responsible_seller?: number | null
  semi_product_code?: string | null
  p_product_code?: string | null
  remarks?: string | null
}

export interface BomRow {
  sequence_no: number
  ingredient_code: string
  content_ratio: number | null
}

export interface QcSpecRow {
  qc_type: string
  sequence_no: number
  test_item: string
  specification?: string | null
  test_method?: string | null
  test_item_en?: string | null
  specification_en?: string | null
  result?: string | null
}

export interface EnglishSpecRow {
  test_item: string
  specification?: string | null
  result?: string | null
}

export interface InciData {
  product_code: string
  inci_ko?: string | null
  inci_en?: string | null
  inci_cpnp?: string | null
  inci_fda?: string | null
  designated_at?: string | null
  author?: string | null
}

export interface SubsidiaryMaterialRow {
  sequence_no: number
  material_name: string
  material_spec?: string | null
  vendor?: string | null
}

export interface WorkSpecData {
  product_code: string
  product_name?: string | null
  contents_notes?: string | null
  production_cautions?: string | null
  label_volume?: string | null
  fill_volume?: string | null
  color?: string | null
  remarks?: string | null
}

export interface ProcessHeaderData {
  batch_unit?: string | null
  total_time?: string | null
  operator?: string | null
  dept_name?: string | null
  notes_content?: string | null
  special_notes?: string | null
}

export interface ProcessStepRow {
  step_num: number
  step_name?: string | null
  step_desc?: string | null
  work_time?: string | null
  step_type?: string | null
}

export interface RevisionRow {
  revision_no: number
  revision_date?: string | null
  revision_content?: string | null
}

type ActionResult = { success: boolean; error?: string }

// ── Step 1: Basic Info ──

export async function saveProductBasicInfo(
  data: BasicInfoData,
  isEdit: boolean
): Promise<ActionResult> {
  const supabase = await createClient()

  if (isEdit) {
    const { product_code, ...updateFields } = data
    const { error } = await supabase
      .from('labdoc_products')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('product_code', product_code)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const { error } = await supabase
    .from('labdoc_products')
    .insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (error) {
    if (error.code === '23505') return { success: false, error: '이미 존재하는 제품코드입니다.' }
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ── Step 2: BOM ──

export async function saveProductBom(
  productCode: string,
  rows: BomRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Delete existing
  const { error: delErr } = await supabase
    .from('labdoc_product_bom')
    .delete()
    .eq('product_code', productCode)

  if (delErr) return { success: false, error: delErr.message }

  if (rows.length === 0) return { success: true }

  const insertData = rows.map((row) => ({
    product_code: productCode,
    sequence_no: row.sequence_no,
    ingredient_code: row.ingredient_code,
    content_ratio: row.content_ratio,
  }))

  const { error } = await supabase.from('labdoc_product_bom').insert(insertData)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Step 3: QC Specs ──

export async function saveProductQcSpecs(
  productCode: string,
  rows: QcSpecRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error: delErr } = await supabase
    .from('labdoc_product_qc_specs')
    .delete()
    .eq('product_code', productCode)

  if (delErr) return { success: false, error: delErr.message }

  if (rows.length === 0) return { success: true }

  const insertData = rows.map((row) => ({
    product_code: productCode,
    qc_type: row.qc_type,
    sequence_no: row.sequence_no,
    test_item: row.test_item,
    specification: row.specification ?? null,
    test_method: row.test_method ?? null,
    test_item_en: row.test_item_en ?? null,
    specification_en: row.specification_en ?? null,
    result: row.result ?? null,
  }))

  const { error } = await supabase.from('labdoc_product_qc_specs').insert(insertData)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Step 4: English Specs ──

export async function saveProductEnglishSpecs(
  productCode: string,
  managementCode: string,
  productName: string,
  rows: EnglishSpecRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error: delErr } = await supabase
    .from('labdoc_product_english_specs')
    .delete()
    .eq('product_code', productCode)

  if (delErr) return { success: false, error: delErr.message }

  if (rows.length === 0) return { success: true }

  const insertData = rows.map((row) => ({
    product_code: productCode,
    management_code: managementCode,
    product_name: productName,
    test_item: row.test_item,
    specification: row.specification ?? null,
    result: row.result ?? null,
  }))

  const { error } = await supabase.from('labdoc_product_english_specs').insert(insertData)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Step 5: INCI ──

export async function saveProductInciData(data: InciData): Promise<ActionResult> {
  const supabase = await createClient()

  // Check if exists
  const { data: existing } = await supabase
    .from('labdoc_product_inci')
    .select('id')
    .eq('product_code', data.product_code)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('labdoc_product_inci')
      .update({
        inci_ko: data.inci_ko ?? null,
        inci_en: data.inci_en ?? null,
        inci_cpnp: data.inci_cpnp ?? null,
        inci_fda: data.inci_fda ?? null,
        designated_at: data.designated_at ?? null,
        author: data.author ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('product_code', data.product_code)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('labdoc_product_inci').insert({
      product_code: data.product_code,
      inci_ko: data.inci_ko ?? null,
      inci_en: data.inci_en ?? null,
      inci_cpnp: data.inci_cpnp ?? null,
      inci_fda: data.inci_fda ?? null,
      designated_at: data.designated_at ?? null,
      author: data.author ?? null,
    })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Step 6: Subsidiary Materials ──

export async function saveProductSubsidiaryMaterials(
  productCode: string,
  managementCode: string,
  rows: SubsidiaryMaterialRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error: delErr } = await supabase
    .from('labdoc_product_subsidiary_materials')
    .delete()
    .eq('product_code', productCode)

  if (delErr) return { success: false, error: delErr.message }

  if (rows.length === 0) return { success: true }

  const insertData = rows.map((row) => ({
    product_code: productCode,
    management_code: managementCode,
    sequence_no: row.sequence_no,
    material_name: row.material_name,
    material_spec: row.material_spec ?? null,
    vendor: row.vendor ?? null,
  }))

  const { error } = await supabase.from('labdoc_product_subsidiary_materials').insert(insertData)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Step 7: Work Specs ──

export async function saveProductWorkSpecs(data: WorkSpecData): Promise<ActionResult> {
  const supabase = await createClient()

  // Check if exists
  const { data: existing } = await supabase
    .from('labdoc_product_work_specs')
    .select('id')
    .eq('product_code', data.product_code)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('labdoc_product_work_specs')
      .update({
        product_name: data.product_name ?? null,
        contents_notes: data.contents_notes ?? null,
        production_cautions: data.production_cautions ?? null,
        label_volume: data.label_volume ?? null,
        fill_volume: data.fill_volume ?? null,
        color: data.color ?? null,
        remarks: data.remarks ?? null,
      })
      .eq('product_code', data.product_code)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('labdoc_product_work_specs').insert(data)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Step 8: Manufacturing Process + Steps ──

export async function saveManufacturingProcess(
  productCode: string,
  header: ProcessHeaderData,
  steps: ProcessStepRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Check if process exists
  const { data: existing } = await supabase
    .from('labdoc_manufacturing_processes')
    .select('id')
    .eq('product_code', productCode)
    .maybeSingle()

  let processId: string

  if (existing) {
    processId = existing.id
    // Update header
    const { error } = await supabase
      .from('labdoc_manufacturing_processes')
      .update({
        ...header,
        step_count: steps.length,
      })
      .eq('id', processId)

    if (error) return { success: false, error: error.message }

    // Delete existing steps
    const { error: delErr } = await supabase
      .from('labdoc_manufacturing_process_steps')
      .delete()
      .eq('process_id', processId)

    if (delErr) return { success: false, error: delErr.message }
  } else {
    // Insert new header
    const { data: inserted, error } = await supabase
      .from('labdoc_manufacturing_processes')
      .insert({
        product_code: productCode,
        ...header,
        step_count: steps.length,
      })
      .select('id')
      .single()

    if (error || !inserted) return { success: false, error: error?.message ?? 'Insert failed' }
    processId = inserted.id
  }

  // Insert steps
  if (steps.length > 0) {
    const stepData = steps.map((s) => ({
      process_id: processId,
      step_num: s.step_num,
      step_type: s.step_type ?? null,
      step_name: s.step_name ?? null,
      step_desc: s.step_desc ?? null,
      work_time: s.work_time ?? null,
    }))

    const { error } = await supabase.from('labdoc_manufacturing_process_steps').insert(stepData)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ── Step 9: Revisions ──

export async function saveProductRevisions(
  productCode: string,
  rows: RevisionRow[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error: delErr } = await supabase
    .from('labdoc_product_revisions')
    .delete()
    .eq('product_code', productCode)

  if (delErr) return { success: false, error: delErr.message }

  if (rows.length === 0) return { success: true }

  const insertData = rows.map((row) => ({
    product_code: productCode,
    revision_no: row.revision_no,
    revision_date: row.revision_date ?? null,
    revision_content: row.revision_content ?? null,
  }))

  const { error } = await supabase.from('labdoc_product_revisions').insert(insertData)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Fetch All Data (for Edit Mode) ──

export interface ProductAllData {
  basicInfo: BasicInfoData & { id: string }
  bom: BomRow[]
  qcSpecs: QcSpecRow[]
  englishSpecs: EnglishSpecRow[]
  inci: InciData | null
  subsidiaryMaterials: SubsidiaryMaterialRow[]
  workSpecs: WorkSpecData | null
  process: { header: ProcessHeaderData; steps: ProcessStepRow[] } | null
  revisions: RevisionRow[]
}

export async function fetchProductAllData(
  productCode: string
): Promise<{ data: ProductAllData | null; error: string | null }> {
  const supabase = await createClient()

  // 1. Basic info
  const { data: product, error: prodErr } = await supabase
    .from('labdoc_products')
    .select('*')
    .eq('product_code', productCode)
    .single()

  if (prodErr) {
    return { data: null, error: prodErr.code === 'PGRST116' ? '품목을 찾을 수 없습니다' : prodErr.message }
  }

  // Parallel fetch all child tables
  const [bomRes, qcRes, enSpecRes, inciRes, subMatRes, workSpecRes, processRes, revisionRes] =
    await Promise.all([
      supabase.from('labdoc_product_bom').select('*').eq('product_code', productCode).order('sequence_no'),
      supabase.from('labdoc_product_qc_specs').select('*').eq('product_code', productCode).order('sequence_no'),
      supabase.from('labdoc_product_english_specs').select('*').eq('product_code', productCode),
      supabase.from('labdoc_product_inci').select('*').eq('product_code', productCode).maybeSingle(),
      supabase.from('labdoc_product_subsidiary_materials').select('*').eq('product_code', productCode).order('sequence_no'),
      supabase.from('labdoc_product_work_specs').select('*').eq('product_code', productCode).maybeSingle(),
      supabase.from('labdoc_manufacturing_processes').select('*').eq('product_code', productCode).maybeSingle(),
      supabase.from('labdoc_product_revisions').select('*').eq('product_code', productCode).order('revision_no'),
    ])

  // Fetch process steps if process exists
  let processSteps: ProcessStepRow[] = []
  if (processRes.data) {
    const { data: stepsData } = await supabase
      .from('labdoc_manufacturing_process_steps')
      .select('*')
      .eq('process_id', processRes.data.id)
      .order('step_num')

    processSteps = (stepsData ?? []).map((s: Record<string, unknown>) => ({
      step_num: s.step_num as number,
      step_name: s.step_name as string | null,
      step_desc: s.step_desc as string | null,
      work_time: s.work_time as string | null,
      step_type: s.step_type as string | null,
    }))
  }

  const allData: ProductAllData = {
    basicInfo: product as BasicInfoData & { id: string },
    bom: (bomRes.data ?? []).map((b: Record<string, unknown>) => ({
      sequence_no: b.sequence_no as number,
      ingredient_code: b.ingredient_code as string,
      content_ratio: b.content_ratio as number | null,
    })),
    qcSpecs: (qcRes.data ?? []).map((q: Record<string, unknown>) => ({
      qc_type: q.qc_type as string,
      sequence_no: q.sequence_no as number,
      test_item: q.test_item as string,
      specification: q.specification as string | null,
      test_method: q.test_method as string | null,
      test_item_en: q.test_item_en as string | null,
      specification_en: q.specification_en as string | null,
      result: q.result as string | null,
    })),
    englishSpecs: (enSpecRes.data ?? []).map((e: Record<string, unknown>) => ({
      test_item: e.test_item as string,
      specification: e.specification as string | null,
      result: e.result as string | null,
    })),
    inci: inciRes.data
      ? {
          product_code: productCode,
          inci_ko: (inciRes.data as Record<string, unknown>).inci_ko as string | null,
          inci_en: (inciRes.data as Record<string, unknown>).inci_en as string | null,
          inci_cpnp: (inciRes.data as Record<string, unknown>).inci_cpnp as string | null,
          inci_fda: (inciRes.data as Record<string, unknown>).inci_fda as string | null,
          designated_at: (inciRes.data as Record<string, unknown>).designated_at as string | null,
          author: (inciRes.data as Record<string, unknown>).author as string | null,
        }
      : null,
    subsidiaryMaterials: (subMatRes.data ?? []).map((s: Record<string, unknown>) => ({
      sequence_no: s.sequence_no as number,
      material_name: s.material_name as string,
      material_spec: s.material_spec as string | null,
      vendor: s.vendor as string | null,
    })),
    workSpecs: workSpecRes.data
      ? {
          product_code: productCode,
          product_name: (workSpecRes.data as Record<string, unknown>).product_name as string | null,
          contents_notes: (workSpecRes.data as Record<string, unknown>).contents_notes as string | null,
          production_cautions: (workSpecRes.data as Record<string, unknown>).production_cautions as string | null,
          label_volume: (workSpecRes.data as Record<string, unknown>).label_volume as string | null,
          fill_volume: (workSpecRes.data as Record<string, unknown>).fill_volume as string | null,
          color: (workSpecRes.data as Record<string, unknown>).color as string | null,
          remarks: (workSpecRes.data as Record<string, unknown>).remarks as string | null,
        }
      : null,
    process: processRes.data
      ? {
          header: {
            batch_unit: (processRes.data as Record<string, unknown>).batch_unit as string | null,
            total_time: (processRes.data as Record<string, unknown>).total_time as string | null,
            operator: (processRes.data as Record<string, unknown>).operator as string | null,
            dept_name: (processRes.data as Record<string, unknown>).dept_name as string | null,
            notes_content: (processRes.data as Record<string, unknown>).notes_content as string | null,
            special_notes: (processRes.data as Record<string, unknown>).special_notes as string | null,
          },
          steps: processSteps,
        }
      : null,
    revisions: (revisionRes.data ?? []).map((r: Record<string, unknown>) => ({
      revision_no: r.revision_no as number,
      revision_date: r.revision_date as string | null,
      revision_content: r.revision_content as string | null,
    })),
  }

  return { data: allData, error: null }
}
