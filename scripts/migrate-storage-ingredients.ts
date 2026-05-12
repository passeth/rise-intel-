/**
 * ingredients-documents 버킷 파일 마이그레이션
 * 실행: npx tsx scripts/migrate-storage-ingredients.ts
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

const BUCKET = 'ingredients-documents'
const CONCURRENCY = 10

const commerceDb = createClient(COMMERCE_URL, COMMERCE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'storage' },
})
const commerce = createClient(COMMERCE_URL, COMMERCE_KEY, { auth: { persistSession: false } })
const intel = createClient(INTEL_URL, INTEL_KEY, { auth: { persistSession: false } })

async function getAllPaths(): Promise<string[]> {
  const paths: string[] = []
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await commerceDb
      .from('objects')
      .select('name')
      .eq('bucket_id', BUCKET)
      .order('name')
      .range(offset, offset + PAGE - 1)

    if (error || !data || data.length === 0) break

    for (const row of data as { name: string }[]) {
      if (!row.name.endsWith('/')) paths.push(row.name)
    }

    offset += PAGE
    process.stdout.write(`  Scanning: ${paths.length} files\r`)
    if (data.length < PAGE) break
  }

  console.log(`  Found: ${paths.length} files`)
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

async function main() {
  console.log(`📦 Storage Migration: ${BUCKET}\n`)

  console.log('1. Getting file list...')
  const paths = await getAllPaths()
  if (paths.length === 0) { console.log('  No files.'); return }

  console.log(`\n2. Copying ${paths.length} files (concurrency: ${CONCURRENCY})...`)

  let ok = 0, fail = 0
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(copyFile))
    for (const r of results) { if (r) ok++; else fail++ }
    process.stdout.write(`  ${ok + fail}/${paths.length} (${((ok + fail) / paths.length * 100).toFixed(1)}%) — ${ok} ok, ${fail} failed\r`)
  }

  console.log(`\n  ✓ ${ok} copied, ${fail} failed`)
  console.log('\n✅ Done!')
}

main().catch(console.error)
