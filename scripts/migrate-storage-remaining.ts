/**
 * Storage 누락분 복사: SQL 기반으로 정확한 파일 목록 추출
 *
 * 실행: npx tsx scripts/migrate-storage-remaining.ts
 */
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}


const COMMERCE_URL = 'https://usvjbuudnofwhmclwhfl.supabase.co'
const COMMERCE_KEY = requireEnv('COMMERCE_SUPABASE_SERVICE_ROLE_KEY')

const INTEL_URL = 'https://ejbbdtjoqapheqieoohs.supabase.co'
const INTEL_KEY = requireEnv('INTEL_SUPABASE_SERVICE_ROLE_KEY')

const BUCKET = 'documents'
const CONCURRENCY = 10

// Use schema option to query storage.objects directly
const commerceStorage = createClient(COMMERCE_URL, COMMERCE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'storage' },
})
const commerce = createClient(COMMERCE_URL, COMMERCE_KEY, { auth: { persistSession: false } })

const intelStorage = createClient(INTEL_URL, INTEL_KEY, {
  auth: { persistSession: false },
  db: { schema: 'storage' },
})
const intel = createClient(INTEL_URL, INTEL_KEY, { auth: { persistSession: false } })

async function getFilePaths(client: ReturnType<typeof createClient>, label: string): Promise<Set<string>> {
  const paths = new Set<string>()
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await client
      .from('objects')
      .select('name')
      .eq('bucket_id', BUCKET)
      .order('name')
      .range(offset, offset + PAGE - 1)

    if (error) {
      console.error(`  Error querying ${label}:`, error.message)
      break
    }
    if (!data || data.length === 0) break

    for (const row of data as { name: string }[]) {
      if (!row.name.endsWith('/')) paths.add(row.name)
    }

    offset += PAGE
    process.stdout.write(`  ${label}: ${paths.size} files found\r`)
    if (data.length < PAGE) break
  }

  console.log(`  ${label}: ${paths.size} files total`)
  return paths
}

async function copyFile(path: string): Promise<boolean> {
  try {
    const { data: blob, error: dlErr } = await commerce.storage.from(BUCKET).download(path)
    if (dlErr || !blob) return false

    const { error: upErr } = await intel.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'application/octet-stream',
    })

    return !upErr
  } catch {
    return false
  }
}

async function processInBatches(paths: string[], concurrency: number) {
  let completed = 0
  let failed = 0
  const total = paths.length

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency)
    const results = await Promise.all(batch.map(copyFile))

    for (const ok of results) {
      if (ok) completed++
      else failed++
    }

    const pct = ((completed + failed) / total * 100).toFixed(1)
    process.stdout.write(`  ${completed + failed}/${total} (${pct}%) — ${completed} ok, ${failed} failed\r`)
  }

  console.log(`\n  ✓ ${completed} files copied, ${failed} failed`)
}

async function main() {
  console.log('📦 Storage Migration — Remaining Files\n')

  console.log('1. Scanning commerce storage...')
  const commercePaths = await getFilePaths(commerceStorage, 'commerce')

  console.log('\n2. Scanning intel storage...')
  const intelPaths = await getFilePaths(intelStorage, 'intel')

  const missing = [...commercePaths].filter((p) => !intelPaths.has(p))
  console.log(`\n3. Missing files: ${missing.length} (commerce: ${commercePaths.size}, intel: ${intelPaths.size})`)

  if (missing.length === 0) {
    console.log('   All files synced!')
    return
  }

  console.log(`\n4. Copying ${missing.length} files (concurrency: ${CONCURRENCY})...`)
  await processInBatches(missing, CONCURRENCY)

  console.log('\n✅ Done!')
}

main().catch(console.error)
