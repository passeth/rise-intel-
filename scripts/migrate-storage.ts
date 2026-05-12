/**
 * Storage 파일 마이그레이션: Commerce → Intel
 *
 * 실행: npx tsx scripts/migrate-storage.ts
 * 재실행 안전: 이미 복사된 파일은 스킵
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
const CONCURRENCY = 5

const commerce = createClient(COMMERCE_URL, COMMERCE_KEY, { auth: { persistSession: false } })
const intel = createClient(INTEL_URL, INTEL_KEY, { auth: { persistSession: false } })

async function getAllFilePaths(): Promise<string[]> {
  // Query storage.objects directly for all file paths
  const paths: string[] = []
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await commerce
      .from('objects' as never)
      .select('name')
      .eq('bucket_id' as never, BUCKET)
      .order('name' as never)
      .range(offset, offset + PAGE - 1)

    if (error) {
      // Fallback: use storage API to list recursively
      console.log('  Direct query failed, using storage API fallback...')
      return await listRecursive('')
    }

    if (!data || data.length === 0) break

    for (const row of data as { name: string }[]) {
      // Skip folder markers (names ending with /)
      if (!row.name.endsWith('/')) {
        paths.push(row.name)
      }
    }

    offset += PAGE
    if (data.length < PAGE) break
  }

  return paths
}

async function listRecursive(prefix: string): Promise<string[]> {
  const paths: string[] = []
  const { data, error } = await commerce.storage.from(BUCKET).list(prefix, { limit: 1000 })

  if (error || !data) return paths

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name

    if (item.id && item.metadata) {
      // It's a file
      paths.push(fullPath)
    } else {
      // It's a folder - recurse
      const subPaths = await listRecursive(fullPath)
      paths.push(...subPaths)
    }
  }

  return paths
}

async function getExistingPaths(): Promise<Set<string>> {
  const existing = new Set<string>()
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data } = await intel.storage.from(BUCKET).list('', {
      limit: PAGE,
      offset,
    })

    if (!data || data.length === 0) break

    // This only lists top-level, we need recursive for checking
    break // We'll use a different approach
  }

  // Query storage.objects on intel side
  let qOffset = 0
  while (true) {
    const { data, error } = await intel
      .from('objects' as never)
      .select('name')
      .eq('bucket_id' as never, BUCKET)
      .range(qOffset, qOffset + 1000 - 1)

    if (error || !data || data.length === 0) break

    for (const row of data as { name: string }[]) {
      existing.add(row.name)
    }

    qOffset += 1000
    if (data.length < 1000) break
  }

  return existing
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
  console.log('📦 Storage Migration: Commerce → Intel')
  console.log(`   Bucket: ${BUCKET}\n`)

  console.log('1. Getting all file paths from commerce...')
  const allPaths = await getAllFilePaths()
  console.log(`   Found ${allPaths.length} files\n`)

  if (allPaths.length === 0) {
    console.log('   No files to copy.')
    return
  }

  console.log('2. Checking existing files in intel...')
  const existing = await getExistingPaths()
  console.log(`   Already copied: ${existing.size} files\n`)

  const toCopy = allPaths.filter((p) => !existing.has(p))
  console.log(`3. Copying ${toCopy.length} new files (concurrency: ${CONCURRENCY})...`)

  if (toCopy.length === 0) {
    console.log('   All files already copied!')
    return
  }

  await processInBatches(toCopy, CONCURRENCY)

  console.log('\n✅ Storage migration complete!')
}

main().catch(console.error)
