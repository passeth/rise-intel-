#!/usr/bin/env node

/**
 * Build product full-ingredient strings from the same INCI summary inputs used by /v2/pif.
 *
 * Default behavior is conservative:
 * - fills labdoc_product_inci.inci_ko / inci_en only when the field is blank or row is missing
 * - does not overwrite existing manually-entered ingredient strings unless --overwrite is passed
 * - also fills inci_cpnp / inci_fda from English INCI when those fields are blank
 *
 * The companion SQL migration sql/003_product_inci_items.sql adds a structured
 * labdoc_product_inci_items table for future manual ordering of <1% ingredients.
 * If that table exists, this script upserts rows into it; otherwise it skips that step.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const OVERWRITE = args.has('--overwrite')
const PRODUCT_ARG = process.argv.find((arg) => arg.startsWith('--product='))
const ONLY_PRODUCT = PRODUCT_ARG ? PRODUCT_ARG.split('=').slice(1).join('=').trim() : null
const ITEMS_ONLY = args.has('--items-only')
const PAGE_SIZE = 500
const BATCH_SIZE = 100

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  const env = {}
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function normalizeIngredientCode(code) {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

function textOrNull(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function displayName(primary, fallback, materialname) {
  return textOrNull(primary) || textOrNull(fallback) || textOrNull(materialname) || 'Unknown'
}

function normalizeKey(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function toWeightPercent(totalUsemount) {
  return Number(totalUsemount || 0) / 1000
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim().length === 0
}

async function fetchAllProducts() {
  if (ONLY_PRODUCT) {
    const { data, error } = await supabase
      .from('labdoc_products')
      .select('product_code, korean_name, english_name, semi_product_code')
      .eq('product_code', ONLY_PRODUCT)
      .maybeSingle()
    if (error) throw new Error(`Failed to fetch product ${ONLY_PRODUCT}: ${error.message}`)
    return data ? [data] : []
  }

  const products = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('labdoc_products')
      .select('product_code, korean_name, english_name, semi_product_code')
      .not('semi_product_code', 'is', null)
      .order('product_code')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to fetch products: ${error.message}`)
    if (!data || data.length === 0) break
    products.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return products
}

async function fetchExistingInci(productCodes) {
  const map = new Map()
  for (let i = 0; i < productCodes.length; i += BATCH_SIZE) {
    const batch = productCodes.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('labdoc_product_inci')
      .select('product_code, inci_ko, inci_en, inci_cpnp, inci_fda')
      .in('product_code', batch)
    if (error) throw new Error(`Failed to fetch existing INCI rows: ${error.message}`)
    for (const row of data ?? []) map.set(row.product_code, row)
  }
  return map
}

async function fetchBomMap(semiProductCodes) {
  const map = new Map()
  for (let i = 0; i < semiProductCodes.length; i += BATCH_SIZE) {
    const batch = semiProductCodes.slice(i, i + BATCH_SIZE)
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('bom_master')
        .select('prdcode, materialcode, materialname, usemount')
        .in('prdcode', batch)
        .order('prdcode', { ascending: true })
        .order('usemount', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error(`Failed to fetch BOM rows: ${error.message}`)
      if (!data || data.length === 0) break
      for (const row of data) {
        if (!row.prdcode) continue
        const rows = map.get(row.prdcode) ?? []
        rows.push(row)
        map.set(row.prdcode, rows)
      }
      if (data.length < PAGE_SIZE) break
    }
  }
  return map
}

async function fetchComponentMap(ingredientCodes) {
  const map = new Map()
  const uniqueCodes = Array.from(new Set(ingredientCodes.filter(Boolean)))
  for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
    const batch = uniqueCodes.slice(i, i + BATCH_SIZE)
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('labdoc_ingredient_components')
        .select('id, ingredient_code, inci_name_en, inci_name_kr, cas_number, composition_ratio, function, component_order')
        .in('ingredient_code', batch)
        .order('ingredient_code', { ascending: true })
        .order('component_order', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error(`Failed to fetch component rows: ${error.message}`)
      if (!data || data.length === 0) break
      for (const row of data) {
        const rows = map.get(row.ingredient_code) ?? []
        rows.push(row)
        map.set(row.ingredient_code, rows)
      }
      if (data.length < PAGE_SIZE) break
    }
  }
  return map
}

function normalizeBomItems(bomRows, componentMap) {
  const rawMap = new Map()
  for (const row of bomRows) {
    if (!row.materialcode) continue
    const baseCode = normalizeIngredientCode(row.materialcode)
    const existing = rawMap.get(baseCode)
    if (existing) {
      existing.totalUsemount += Number(row.usemount || 0)
      continue
    }
    rawMap.set(baseCode, {
      baseCode,
      materialname: textOrNull(row.materialname) || baseCode,
      totalUsemount: Number(row.usemount || 0),
      components: componentMap.get(baseCode) ?? [],
    })
  }
  return Array.from(rawMap.values()).sort((a, b) => b.totalUsemount - a.totalUsemount)
}

function buildInciRows(bomItems) {
  const merged = new Map()

  for (const item of bomItems) {
    const rawWtPercent = toWeightPercent(item.totalUsemount)
    if (rawWtPercent <= 0) continue

    if (item.components.length === 0) {
      const name = item.materialname
      const key = `raw:${normalizeKey(name)}`
      const existing = merged.get(key)
      if (existing) {
        existing.wtPercent += rawWtPercent
      } else {
        merged.set(key, {
          mergeKey: key,
          inciNameKo: name,
          inciNameEn: name,
          casNumbers: new Set(),
          functions: new Set(),
          wtPercent: rawWtPercent,
          sourceIngredientCodes: new Set([item.baseCode]),
        })
      }
      continue
    }

    for (const component of item.components) {
      const ratio = Number(component.composition_ratio ?? 100)
      const wtPercent = (rawWtPercent * ratio) / 100
      if (wtPercent <= 0) continue

      const enName = displayName(component.inci_name_en, component.inci_name_kr, item.materialname)
      const koName = displayName(component.inci_name_kr, component.inci_name_en, item.materialname)
      const key = `inci:${normalizeKey(enName)}`
      const existing = merged.get(key)
      const target = existing ?? {
        mergeKey: key,
        inciNameKo: koName,
        inciNameEn: enName,
        casNumbers: new Set(),
        functions: new Set(),
        wtPercent: 0,
        sourceIngredientCodes: new Set(),
      }

      target.wtPercent += wtPercent
      target.sourceIngredientCodes.add(item.baseCode)
      if (component.cas_number) target.casNumbers.add(component.cas_number)
      if (component.function) target.functions.add(component.function)
      if (!existing) merged.set(key, target)
    }
  }

  return Array.from(merged.values())
    .map((row) => ({
      ...row,
      isBelowOnePercent: row.wtPercent < 1,
      sortGroup: row.wtPercent >= 1 ? 'gte_1' : 'lt_1',
    }))
    .sort((a, b) => {
      if (a.isBelowOnePercent !== b.isBelowOnePercent) return a.isBelowOnePercent ? 1 : -1
      return b.wtPercent - a.wtPercent || a.inciNameEn.localeCompare(b.inciNameEn)
    })
    .map((row, index) => ({
      ...row,
      declaredOrder: index + 1,
      casNo: Array.from(row.casNumbers).join(', ') || null,
      functionName: Array.from(row.functions).join(', ') || null,
      sourceIngredientCodes: Array.from(row.sourceIngredientCodes),
    }))
}

function buildDeclaration(rows, field) {
  return rows.map((row) => row[field]).filter(Boolean).join(', ')
}

function buildPayload(productCode, rows, existing) {
  const ko = buildDeclaration(rows, 'inciNameKo')
  const en = buildDeclaration(rows, 'inciNameEn')
  if (!ko && !en) return null

  const next = {
    product_code: productCode,
    updated_at: new Date().toISOString(),
  }

  if (OVERWRITE || !existing || isBlank(existing.inci_ko)) next.inci_ko = ko || null
  if (OVERWRITE || !existing || isBlank(existing.inci_en)) next.inci_en = en || null
  if (OVERWRITE || !existing || isBlank(existing.inci_cpnp)) next.inci_cpnp = en || null
  if (OVERWRITE || !existing || isBlank(existing.inci_fda)) next.inci_fda = en || null

  if (!existing) next.created_at = next.updated_at

  const changedFields = ['inci_ko', 'inci_en', 'inci_cpnp', 'inci_fda'].filter((field) => field in next)
  if (changedFields.length === 0) return null
  return next
}

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select('id').limit(1)
  return !error
}

function buildItemPayloads(productCode, rows) {
  const now = new Date().toISOString()
  return rows.map((row) => ({
    product_code: productCode,
    merge_key: row.mergeKey,
    inci_name_ko: row.inciNameKo,
    inci_name_en: row.inciNameEn,
    cas_no: row.casNo,
    function_name: row.functionName,
    wt_percent: Number(row.wtPercent.toFixed(8)),
    is_below_one_percent: row.isBelowOnePercent,
    sort_group: row.sortGroup,
    calculated_order: row.declaredOrder,
    declared_order: row.declaredOrder,
    source_ingredient_codes: row.sourceIngredientCodes,
    updated_at: now,
  }))
}

async function upsertInciRows(rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('labdoc_product_inci')
      .upsert(batch, { onConflict: 'product_code' })
    if (error) throw new Error(`Failed to upsert labdoc_product_inci: ${error.message}`)
  }
}

async function upsertItemRows(itemRowsByProduct) {
  const rows = Array.from(itemRowsByProduct.values()).flat()
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('labdoc_product_inci_items')
      .upsert(batch, { onConflict: 'product_code,merge_key' })
    if (error) throw new Error(`Failed to upsert INCI item rows: ${error.message}`)
  }
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE MIGRATION')
  console.log(`Target: ${ONLY_PRODUCT || 'all products with semi_product_code'}`)
  console.log(`Overwrite existing text: ${OVERWRITE ? 'yes' : 'no'}`)
  console.log(`Items only: ${ITEMS_ONLY ? 'yes' : 'no'}`)

  const hasItemTable = await tableExists('labdoc_product_inci_items')
  console.log(`Structured item table: ${hasItemTable ? 'found' : 'not found (skipping item rows)'}`)

  const products = await fetchAllProducts()
  if (products.length === 0) {
    console.log('No products found.')
    return
  }

  const productCodes = products.map((p) => p.product_code)
  const existingInci = await fetchExistingInci(productCodes)
  const semiCodes = Array.from(new Set(products.map((p) => p.semi_product_code).filter(Boolean)))
  const bomMap = await fetchBomMap(semiCodes)
  const ingredientCodes = []
  for (const rows of bomMap.values()) {
    for (const row of rows) {
      if (row.materialcode) ingredientCodes.push(normalizeIngredientCode(row.materialcode))
    }
  }
  const componentMap = await fetchComponentMap(ingredientCodes)

  const upserts = []
  const itemRowsByProduct = new Map()
  const skipped = { noBom: 0, noInciRows: 0, existingFilled: 0 }

  for (const product of products) {
    const bomRows = bomMap.get(product.semi_product_code) ?? []
    if (bomRows.length === 0) {
      skipped.noBom += 1
      continue
    }

    const bomItems = normalizeBomItems(bomRows, componentMap)
    const rows = buildInciRows(bomItems)
    if (rows.length === 0) {
      skipped.noInciRows += 1
      continue
    }

    const existing = existingInci.get(product.product_code)
    const payload = ITEMS_ONLY ? null : buildPayload(product.product_code, rows, existing)
    if (hasItemTable) {
      itemRowsByProduct.set(product.product_code, buildItemPayloads(product.product_code, rows))
    }
    if (payload) {
      upserts.push(payload)
    } else {
      skipped.existingFilled += 1
    }
  }

  console.log('\n📊 Summary')
  console.log(`Products scanned:        ${products.length}`)
  console.log(`Rows to upsert:          ${upserts.length}`)
  console.log(`Skipped - no BOM:        ${skipped.noBom}`)
  console.log(`Skipped - no INCI rows:  ${skipped.noInciRows}`)
  console.log(`Skipped - already filled:${skipped.existingFilled}`)

  const sampleCodes = ONLY_PRODUCT ? [ONLY_PRODUCT] : ['BTBC006', ...upserts.slice(0, 2).map((r) => r.product_code)]
  console.log('\n📋 Samples')
  for (const code of Array.from(new Set(sampleCodes))) {
    const sample = upserts.find((row) => row.product_code === code)
    if (!sample) continue
    console.log(`- ${code}`)
    if ('inci_ko' in sample) console.log(`  KO: ${String(sample.inci_ko).slice(0, 240)}${String(sample.inci_ko).length > 240 ? '…' : ''}`)
    if ('inci_en' in sample) console.log(`  EN: ${String(sample.inci_en).slice(0, 240)}${String(sample.inci_en).length > 240 ? '…' : ''}`)
  }

  console.log(`Structured item rows to replace: ${itemRowsByProduct.size}`)

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Run without --dry-run to execute.')
    return
  }

  if (upserts.length > 0) await upsertInciRows(upserts)
  if (hasItemTable && itemRowsByProduct.size > 0) await upsertItemRows(itemRowsByProduct)

  console.log('\n✅ Migration complete.')
}

main().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
