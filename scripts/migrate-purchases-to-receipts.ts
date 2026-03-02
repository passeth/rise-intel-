/**
 * Migration: purchases → labdoc_ingredient_receipts
 *
 * Source: purchases (READ-ONLY, no modifications)
 *   - WHERE status = 'confirmed' AND material_type = 'raw_material'
 *
 * Target: labdoc_ingredient_receipts (INSERT only, no updates)
 *
 * Dedup key: ingredient_code + receipt_date
 *
 * Column mapping:
 *   purchases.product_code     → ingredient_code
 *   purchases.product_name     → ingredient_name
 *   purchases.received_date    → receipt_date
 *   purchases.received_qty     → receipt_qty
 *   purchases.raw_material_lot → lot_no
 *   purchases.supplier_name    → supplier
 *   purchases.order_number     → notes (참조용)
 *   EXTRACT(YEAR FROM received_date) → year
 */


import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '🚀 LIVE MODE')
  console.log('---')

  // 1. Fetch all confirmed raw_material purchases
  console.log('Fetching purchases (status=confirmed, material_type=raw_material)...')

  const { data: purchases, error: purchaseError } = await supabase
    .from('purchases')
    .select('product_code, product_name, received_date, received_qty, raw_material_lot, supplier_name, order_number')
    .eq('status', 'confirmed')
    .eq('material_type', 'raw_material')
    .not('received_date', 'is', null)
    .order('received_date', { ascending: true })

  if (purchaseError) {
    console.error('❌ Failed to fetch purchases:', purchaseError.message)
    process.exit(1)
  }

  console.log(`Found ${purchases.length} confirmed raw material purchases`)

  // 2. Fetch existing receipts (dedup keys)
  console.log('Fetching existing receipts for dedup check...')

  const { data: existingReceipts, error: receiptError } = await supabase
    .from('labdoc_ingredient_receipts')
    .select('ingredient_code, receipt_date')

  if (receiptError) {
    console.error('❌ Failed to fetch existing receipts:', receiptError.message)
    process.exit(1)
  }

  const existingKeys = new Set(
    (existingReceipts ?? []).map(
      (r: { ingredient_code: string; receipt_date: string }) =>
        `${r.ingredient_code}__${r.receipt_date}`
    )
  )

  console.log(`Found ${existingKeys.size} existing receipt records`)

  // 3. Filter out duplicates
  const toInsert = purchases
    .filter((p) => {
      if (!p.product_code || !p.received_date) return false
      const key = `${p.product_code}__${p.received_date}`
      return !existingKeys.has(key)
    })
    .map((p) => ({
      ingredient_code: p.product_code as string,
      ingredient_name: (p.product_name as string) || p.product_code as string,
      receipt_date: p.received_date as string,
      receipt_qty: p.received_qty as number | null,
      lot_no: (p.raw_material_lot as string) || null,
      supplier: (p.supplier_name as string) || null,
      notes: p.order_number ? `발주번호: ${p.order_number}` : null,
      year: new Date(p.received_date as string).getFullYear(),
    }))

  console.log(`\n📊 Summary:`)
  console.log(`   Total purchases (confirmed, raw_material): ${purchases.length}`)
  console.log(`   Already in receipts (skipped):             ${purchases.length - toInsert.length}`)
  console.log(`   New records to insert:                     ${toInsert.length}`)

  if (toInsert.length === 0) {
    console.log('\n✅ Nothing to migrate. All records already exist.')
    process.exit(0)
  }

  // Show sample
  console.log('\n📋 Sample records (first 5):')
  toInsert.slice(0, 5).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.ingredient_code} | ${r.receipt_date} | qty:${r.receipt_qty ?? '-'} | ${r.supplier ?? '-'} | lot:${r.lot_no ?? '-'}`)
  })

  if (DRY_RUN) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to execute.')
    process.exit(0)
  }

  // 4. Insert in batches of 100
  const BATCH_SIZE = 100
  let inserted = 0
  let failed = 0

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await supabase
      .from('labdoc_ingredient_receipts')
      .insert(batch)

    if (insertError) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, insertError.message)
      failed += batch.length
    } else {
      inserted += batch.length
      console.log(`   ✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} records`)
    }
  }

  console.log(`\n🏁 Migration complete:`)
  console.log(`   Inserted: ${inserted}`)
  console.log(`   Failed:   ${failed}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
