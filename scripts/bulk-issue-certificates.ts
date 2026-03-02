/**
 * 일괄 성적서 발급 스크립트
 * 대상: lot_no가 있고 성적서 미발급인 입고 건
 * - 채취일자/시험일자 = 입고일자
 * - 채취자/시험자 = 이온유
 * - 판정: 적합
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://usvjbuudnofwhmclwhfl.supabase.co'
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdmpidXVkbm9md2htY2x3aGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzMzg2OCwiZXhwIjoyMDg3NzkzODY4fQ.L-zU-vLk44o6wFl-qDXoQbBjCubsrzCgdVFkUm5JdyE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Receipt {
  id: string
  ingredient_code: string
  ingredient_name: string
  lot_no: string
  receipt_date: string
  receipt_qty: number | null
  supplier: string | null
  test_no: string | null
}

interface Spec {
  spec_item: string
  spec_standard: string | null
}

async function fetchAllReceipts(): Promise<Receipt[]> {
  const all: Receipt[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('labdoc_ingredient_receipts')
      .select('id, ingredient_code, ingredient_name, lot_no, receipt_date, receipt_qty, supplier, test_no')
      .not('lot_no', 'is', null)
      .neq('lot_no', '')
      .range(from, from + pageSize - 1)
      .order('receipt_date', { ascending: true })

    if (error) {
      console.error('Error fetching receipts:', error.message)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as Receipt[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

async function fetchExistingCertReceiptIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('labdoc_ingredient_certificates')
      .select('receipt_id')
      .not('receipt_id', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Error fetching cert receipt_ids:', error.message)
      break
    }
    if (!data || data.length === 0) break
    for (const row of data) {
      if (row.receipt_id) ids.add(row.receipt_id)
    }
    if (data.length < pageSize) break
    from += pageSize
  }

  return ids
}

async function fetchSpecs(ingredientCode: string): Promise<Spec[]> {
  const { data, error } = await supabase
    .from('labdoc_ingredient_specs')
    .select('spec_item, spec_standard')
    .eq('ingredient_code', ingredientCode)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Error fetching specs for ${ingredientCode}:`, error.message)
    return []
  }

  return (data ?? []) as Spec[]
}

async function generateTestNo(index: number): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `IC-${dateStr}-`

  // Get existing count for today
  const { count } = await supabase
    .from('labdoc_ingredient_certificates')
    .select('id', { count: 'exact', head: true })
    .like('test_no', `${prefix}%`)

  const seq = ((count ?? 0) + index + 1).toString().padStart(3, '0')
  return `${prefix}${seq}`
}

async function main() {
  console.log('=== 일괄 성적서 발급 스크립트 ===\n')

  // 1. Fetch all receipts with lot_no
  console.log('1. lot_no 있는 입고 건 조회 중...')
  const receipts = await fetchAllReceipts()
  console.log(`   총 ${receipts.length}건 (lot_no 있는 입고 건)`)

  // 2. Fetch existing certificates
  console.log('2. 기존 성적서 조회 중...')
  const existingIds = await fetchExistingCertReceiptIds()
  console.log(`   기발급 ${existingIds.size}건`)

  // 3. Filter: only receipts without certificates
  const targets = receipts.filter((r) => !existingIds.has(r.id))
  console.log(`3. 발급 대상: ${targets.length}건\n`)

  if (targets.length === 0) {
    console.log('발급 대상이 없습니다.')
    return
  }

  // Cache specs per ingredient_code
  const specsCache = new Map<string, Spec[]>()

  let issued = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const receipt = targets[i]

    // Get specs (cached)
    if (!specsCache.has(receipt.ingredient_code)) {
      const specs = await fetchSpecs(receipt.ingredient_code)
      specsCache.set(receipt.ingredient_code, specs)
    }
    const specs = specsCache.get(receipt.ingredient_code) ?? []

    // Build results from specs
    const results = specs.map((spec) => {
      const item = spec.spec_item.trim()
      let defaultResult = 'PASS'
      if (/미생물/.test(item)) defaultResult = '불검출'
      else if (/안정성/.test(item)) defaultResult = '적합'

      return {
        test_item: spec.spec_item,
        specification: spec.spec_standard ?? '',
        result: defaultResult,
        judgment: '적합',
        test_date: receipt.receipt_date,
        tester: '이온유',
      }
    })

    const testNo = await generateTestNo(i)

    const { error } = await supabase
      .from('labdoc_ingredient_certificates')
      .insert({
        receipt_id: receipt.id,
        ingredient_code: receipt.ingredient_code,
        ingredient_name: receipt.ingredient_name,
        lot_no: receipt.lot_no,
        test_no: testNo,
        receipt_date: receipt.receipt_date,
        receipt_qty: receipt.receipt_qty,
        supplier: receipt.supplier,
        tester: '이온유',
        approver: null,
        reviewer: null,
        test_date: receipt.receipt_date,
        judgment_date: receipt.receipt_date,
        overall_judgment: '적합',
        results: results,
        notes: null,
      })

    if (error) {
      console.error(`   ❌ [${i + 1}/${targets.length}] ${receipt.ingredient_code} ${receipt.lot_no} — ${error.message}`)
      failed++
    } else {
      issued++
      if (issued % 50 === 0 || i === targets.length - 1) {
        console.log(`   ✅ ${issued}건 발급 완료 (${i + 1}/${targets.length})`)
      }
    }
  }

  console.log(`\n=== 완료 ===`)
  console.log(`발급 성공: ${issued}건`)
  console.log(`발급 실패: ${failed}건`)
  console.log(`규격 캐시: ${specsCache.size}개 원료`)
}

main().catch(console.error)
