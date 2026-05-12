/**
 * 양쪽 DB의 storage.objects에서 파일명 추출 후 비교
 * MCP SQL 대신 Supabase REST API 사용
 */
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

import { writeFileSync } from 'fs'

const COMMERCE_URL = 'https://usvjbuudnofwhmclwhfl.supabase.co'
const COMMERCE_KEY = requireEnv('COMMERCE_SUPABASE_SERVICE_ROLE_KEY')
const INTEL_URL = 'https://ejbbdtjoqapheqieoohs.supabase.co'
const INTEL_KEY = requireEnv('INTEL_SUPABASE_SERVICE_ROLE_KEY')

async function fetchNames(url: string, key: string, bucket: string): Promise<Set<string>> {
  const resp = await fetch(`${url}/rest/v1/objects?bucket_id=eq.${bucket}&select=name&order=name`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept-Profile': 'storage',
      'Range': '0-99999',
    },
  })

  if (!resp.ok) {
    console.error(`  Error ${resp.status}: ${await resp.text()}`)
    return new Set()
  }

  const data = await resp.json() as { name: string }[]
  return new Set(data.map(r => r.name))
}

async function main() {
  const output: string[] = []

  for (const bucket of ['documents', 'ingredients-documents']) {
    console.log(`\n=== ${bucket} ===`)

    console.log('  Fetching commerce...')
    const commerce = await fetchNames(COMMERCE_URL, COMMERCE_KEY, bucket)
    console.log(`  Commerce: ${commerce.size}`)

    console.log('  Fetching intel...')
    const intel = await fetchNames(INTEL_URL, INTEL_KEY, bucket)
    console.log(`  Intel: ${intel.size}`)

    const missing = [...commerce].filter(f => !intel.has(f))
    console.log(`  Missing: ${missing.length}`)

    if (missing.length > 0) {
      output.push(`=== ${bucket} (missing: ${missing.length}) ===`)
      missing.forEach(f => output.push(f))
      output.push('')
    }
  }

  if (output.length > 0) {
    writeFileSync('scripts/missing-storage-files.txt', output.join('\n'))
    console.log('\nSaved to scripts/missing-storage-files.txt')
  } else {
    console.log('\nNo missing files!')
    writeFileSync('scripts/missing-storage-files.txt', 'No missing files')
  }
}

main().catch(console.error)
