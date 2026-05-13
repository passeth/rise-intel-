#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-sql-management.mjs <sql-file>')
  process.exit(1)
}

const env = {}
try {
  for (const rawLine of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
} catch {}

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF || new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const query = readFileSync(file, 'utf8')

if (!token || !projectRef || !query.trim()) {
  console.error('Missing Supabase management token, project ref, or SQL query')
  console.error('Set SUPABASE_ACCESS_TOKEN explicitly so stale local MCP credentials are not used.')
  process.exit(1)
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
})

const text = await response.text()
if (!response.ok) {
  console.error(`❌ SQL apply failed (${response.status})`)
  console.error(text)
  process.exit(1)
}

console.log(`✅ Applied ${file} to ${projectRef}`)
if (text && text !== '[]') console.log(text.slice(0, 1000))
