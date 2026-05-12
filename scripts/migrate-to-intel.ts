/**
 * Commerce → Intel Supabase 데이터 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-to-intel.ts
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}


const COMMERCE_URL = 'https://usvjbuudnofwhmclwhfl.supabase.co'
// Commerce service role key (hardcoded since .env.local now points to intel)
const COMMERCE_KEY = requireEnv('COMMERCE_SUPABASE_SERVICE_ROLE_KEY')

const INTEL_URL = 'https://ejbbdtjoqapheqieoohs.supabase.co'
const INTEL_KEY = requireEnv('INTEL_SUPABASE_SERVICE_ROLE_KEY')

const OLD_STORAGE_DOMAIN = 'usvjbuudnofwhmclwhfl.supabase.co'
const NEW_STORAGE_DOMAIN = 'ejbbdtjoqapheqieoohs.supabase.co'

const commerce = createSupabaseClient(COMMERCE_URL, COMMERCE_KEY, {
  auth: { persistSession: false },
})

const intel = createSupabaseClient(INTEL_URL, INTEL_KEY, {
  auth: { persistSession: false },
})

// ── Config ──

interface TableConfig {
  name: string
  orderBy?: string
  // Tables with > 10K rows need pagination
  batchSize?: number
  // Skip vector/embedding columns (too large for JSON transfer)
  skipColumns?: string[]
  // Transform function for URL migration
  transformRow?: (row: Record<string, unknown>) => Record<string, unknown>
}

function replaceStorageUrls(row: Record<string, unknown>): Record<string, unknown> {
  const result = { ...row }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && value.includes(OLD_STORAGE_DOMAIN)) {
      result[key] = value.replace(new RegExp(OLD_STORAGE_DOMAIN, 'g'), NEW_STORAGE_DOMAIN)
    }
  }
  return result
}

const TABLES: TableConfig[] = [
  // Auth (small)
  { name: 'user_roles', orderBy: 'created_at' },
  { name: 'role_permissions', orderBy: 'created_at' },

  // labdoc core
  { name: 'labdoc_products', orderBy: 'created_at', transformRow: replaceStorageUrls },
  { name: 'labdoc_ingredients', orderBy: 'created_at', transformRow: replaceStorageUrls },
  { name: 'labdoc_ingredient_components', orderBy: 'created_at' },
  { name: 'labdoc_ingredient_specs', orderBy: 'created_at' },
  { name: 'labdoc_ingredient_receipts', orderBy: 'created_at' },
  { name: 'labdoc_ingredient_certificates', orderBy: 'created_at', transformRow: replaceStorageUrls },
  { name: 'labdoc_test_specs', orderBy: 'created_at' },

  // labdoc product detail
  { name: 'labdoc_product_bom', orderBy: 'created_at', batchSize: 5000 },
  { name: 'labdoc_product_qc_specs', orderBy: 'created_at', batchSize: 5000 },
  { name: 'labdoc_product_english_specs', orderBy: 'created_at', batchSize: 5000 },
  { name: 'labdoc_product_revisions', orderBy: 'created_at' },
  { name: 'labdoc_product_work_specs', orderBy: 'created_at' },
  { name: 'labdoc_product_subsidiary_materials', orderBy: 'created_at' },
  { name: 'labdoc_product_inci', orderBy: 'created_at' },
  { name: 'labdoc_manufacturing_processes', orderBy: 'created_at' },
  { name: 'labdoc_manufacturing_process_steps', orderBy: 'created_at', batchSize: 5000 },
  { name: 'labdoc_test_certificates', orderBy: 'created_at', batchSize: 2000, transformRow: replaceStorageUrls },
  { name: 'labdoc_allergen_regulations', orderBy: 'created_at' },
  { name: 'labdoc_fragrance_allergen_contents', orderBy: 'created_at' },
  { name: 'labdoc_msds_settings', orderBy: 'setting_key' },

  // Shared tables
  { name: 'bom_master', orderBy: 'created_at', batchSize: 5000 },
  { name: 'product_images', orderBy: 'created_at', transformRow: replaceStorageUrls },
  { name: 'rise_products', orderBy: 'code' },

  // QC
  { name: 'qc_purified_water_measurements', orderBy: 'measurement_date' },
  { name: 'qc_purified_water_certificates', orderBy: 'created_at', transformRow: replaceStorageUrls },

  // Lab intelligence (large tables)
  { name: 'lab_categories', orderBy: 'created_at' },
  { name: 'lab_ingredients', orderBy: 'created_at' },
  { name: 'lab_inci_matches', orderBy: 'created_at' },
  { name: 'lab_research_reports', orderBy: 'created_at' },
  { name: 'lab_products', orderBy: 'created_at', batchSize: 2000 },
  { name: 'lab_ingredient_product', orderBy: 'created_at', batchSize: 5000 },
  { name: 'lab_scrape_progress', orderBy: 'created_at', batchSize: 5000 },
  { name: 'lab_regulations', orderBy: 'created_at', batchSize: 5000 },

  // VP tables (large, skip embedding columns for initial migration)
  { name: 'vp_ingredient', orderBy: 'id', batchSize: 500,
    skipColumns: ['clinical_embedding', 'benefits_embedding', 'category_embedding', 'usp_embedding'] },
  { name: 'vp_formula', orderBy: 'id', batchSize: 2000 },
  { name: 'vp_formula_ingredients', orderBy: 'id', batchSize: 5000 },
  { name: 'vp_productlink', orderBy: 'id' },
  { name: 'vp_creative_formula', orderBy: 'id', batchSize: 500,
    skipColumns: ['features_embedding', 'ingredients_embedding', 'content_embedding'] },

  // Vectors (skip embedding for speed, can be regenerated)
  { name: 'vectors_ingredient', orderBy: 'id', skipColumns: ['embedding'] },
  { name: 'vectors_formula', orderBy: 'id', skipColumns: ['embedding'] },
]

// ── Migration Logic ──

async function getCount(table: string): Promise<number> {
  const { count } = await commerce
    .from(table)
    .select('*', { count: 'exact', head: true })
  return count ?? 0
}

async function migrateTable(config: TableConfig) {
  const { name, orderBy = 'id', batchSize = 1000, skipColumns, transformRow } = config

  const totalCount = await getCount(name)
  if (totalCount === 0) {
    console.log(`  ⏭ ${name}: empty, skipping`)
    return
  }

  console.log(`  → ${name}: ${totalCount} rows`)

  // Build select columns (exclude skip columns)
  let selectStr = '*'
  if (skipColumns && skipColumns.length > 0) {
    // We need to select all columns except the skipped ones
    // Supabase doesn't support column exclusion, so we pass * and strip in JS
    selectStr = '*'
  }

  let offset = 0
  let migrated = 0

  while (offset < totalCount) {
    const { data, error } = await commerce
      .from(name)
      .select(selectStr)
      .order(orderBy)
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error(`  ✗ ${name} read error at offset ${offset}:`, error.message)
      break
    }

    if (!data || data.length === 0) break

    // Transform rows
    let rows = data as Record<string, unknown>[]

    // Remove skipped columns
    if (skipColumns) {
      rows = rows.map((row) => {
        const cleaned = { ...row }
        for (const col of skipColumns) {
          delete cleaned[col]
        }
        return cleaned
      })
    }

    // Apply URL transform
    if (transformRow) {
      rows = rows.map(transformRow)
    }

    const { error: insertErr } = await intel
      .from(name)
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })

    if (insertErr) {
      // Try insert without onConflict for tables without 'id' PK
      const { error: insertErr2 } = await intel
        .from(name)
        .insert(rows)

      if (insertErr2) {
        console.error(`  ✗ ${name} write error at offset ${offset}:`, insertErr2.message)
        // Continue to next batch instead of aborting
      }
    }

    migrated += data.length
    offset += batchSize

    if (totalCount > batchSize) {
      process.stdout.write(`    ${migrated}/${totalCount}\r`)
    }
  }

  console.log(`  ✓ ${name}: ${migrated} rows migrated`)
}

async function migrateStorageFiles() {
  console.log('\n📦 Storage migration (documents bucket)')

  const { data: files, error } = await commerce.storage
    .from('documents')
    .list('', { limit: 1000 })

  if (error || !files) {
    console.log('  ⏭ No files or error:', error?.message)
    return
  }

  // List recursively - get folders first
  const folders = files.filter((f) => !f.id || f.metadata === null)
  const topFiles = files.filter((f) => f.id && f.metadata !== null)

  let totalCopied = 0

  // Copy top-level files
  for (const file of topFiles) {
    try {
      const { data: blob } = await commerce.storage
        .from('documents')
        .download(file.name)

      if (blob) {
        await intel.storage
          .from('documents')
          .upload(file.name, blob, { upsert: true })
        totalCopied++
      }
    } catch (e) {
      console.error(`  ✗ File ${file.name}:`, (e as Error).message)
    }
  }

  // Copy files in folders
  for (const folder of folders) {
    const { data: subFiles } = await commerce.storage
      .from('documents')
      .list(folder.name, { limit: 5000 })

    if (!subFiles) continue

    for (const file of subFiles) {
      if (!file.id || file.metadata === null) {
        // Subfolder - go one level deeper
        const { data: deepFiles } = await commerce.storage
          .from('documents')
          .list(`${folder.name}/${file.name}`, { limit: 5000 })

        if (deepFiles) {
          for (const df of deepFiles) {
            if (!df.id) continue
            const path = `${folder.name}/${file.name}/${df.name}`
            try {
              const { data: blob } = await commerce.storage
                .from('documents')
                .download(path)
              if (blob) {
                await intel.storage
                  .from('documents')
                  .upload(path, blob, { upsert: true })
                totalCopied++
              }
            } catch (e) {
              console.error(`  ✗ ${path}:`, (e as Error).message)
            }
          }
        }
        continue
      }

      const path = `${folder.name}/${file.name}`
      try {
        const { data: blob } = await commerce.storage
          .from('documents')
          .download(path)
        if (blob) {
          await intel.storage
            .from('documents')
            .upload(path, blob, { upsert: true })
          totalCopied++
        }
      } catch (e) {
        console.error(`  ✗ ${path}:`, (e as Error).message)
      }
    }

    process.stdout.write(`  ${folder.name}: ${totalCopied} files copied\r`)
  }

  console.log(`  ✓ ${totalCopied} files copied to intel storage`)
}

// ── Main ──

async function main() {
  console.log('🚀 Commerce → Intel Supabase Migration')
  console.log(`   From: ${COMMERCE_URL}`)
  console.log(`   To:   ${INTEL_URL}\n`)

  console.log('📊 Migrating tables...')
  for (const table of TABLES) {
    try {
      await migrateTable(table)
    } catch (e) {
      console.error(`  ✗ ${table.name} failed:`, (e as Error).message)
    }
  }

  await migrateStorageFiles()

  console.log('\n✅ Migration complete!')
  console.log('   Next steps:')
  console.log('   1. Update .env.local to intel Supabase')
  console.log('   2. Run pnpm build to verify')
  console.log('   3. Vector embeddings need to be regenerated separately')
}

main().catch(console.error)
