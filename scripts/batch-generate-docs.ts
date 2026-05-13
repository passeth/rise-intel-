import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import jsPDF from 'jspdf'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach((line: string) => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim()
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// ── Types ──

interface BomRawItem {
  materialcode: string | null
  materialname: string | null
  usemount: number | null
}

interface IngredientComponentRow {
  id: string
  ingredient_code: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number | null
  country_of_origin: string | null
  created_at: string | null
}

interface NormalizedBomItem {
  baseCode: string
  materialname: string
  totalUsemount: number
  components: IngredientComponentRow[]
}

interface IngredientsEnRow {
  no: number; ingredientName: string; wtPercent: number; source: string; casNo: string; function: string
}
interface FragranceAllergenRow {
  no: number; inciName: string; casNo: string; wtPercent: number
}
interface BreakdownRow {
  no: number; rawMaterial: string; wtPercent: number; componentInci: string; ratioInRaw: number
  calculatedPercent: number; isFirstOfGroup: boolean; groupSize: number
}
interface InciSummaryRow {
  no: number; inciName: string; wtPercent: number; function: string; casNo: string
}
interface ProductMeta {
  productCode: string; englishName: string; koreanName: string; packagingUnit?: string; createdDate?: string
}

// ── Font ──

let fontData: ArrayBuffer | null = null
async function loadFontData(): Promise<ArrayBuffer> {
  if (fontData) return fontData
  const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic.ttf')
  const buffer = await readFile(fontPath)
  fontData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  return fontData
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

async function loadKoreanFont(doc: jsPDF): Promise<void> {
  const data = await loadFontData()
  const base64 = arrayBufferToBase64(data)
  doc.addFileToVFS('NanumGothic.ttf', base64)
  doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
  doc.addFont('NanumGothic.ttf', 'NanumGothic', 'bold')
}

// ── Ingredient Code Normalize ──

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  return code
}

// ── Fetch Product + BOM ──

async function fetchProductWithBom(productCode: string) {
  const { data: product, error: productErr } = await supabase
    .from('labdoc_products').select('*').eq('product_code', productCode).single()

  if (productErr) return { product: null, bomItems: [] as NormalizedBomItem[], error: productErr.message }

  let bomItems: NormalizedBomItem[] = []
  const semiCode = (product as Record<string, unknown>).semi_product_code as string | null

  if (semiCode) {
    const { data: bomData, error: bomErr } = await supabase
      .from('bom_master').select('materialcode, materialname, usemount')
      .eq('prdcode', semiCode).eq('품목구분', '[원재료]').order('usemount', { ascending: false })

    if (!bomErr && bomData && bomData.length > 0) {
      const normalizedMap = new Map<string, { materialname: string; totalUsemount: number }>()
      ;(bomData as unknown as BomRawItem[]).forEach((item) => {
        if (!item.materialcode) return
        const baseCode = normalizeIngredientCode(item.materialcode)
        const existing = normalizedMap.get(baseCode)
        if (existing) existing.totalUsemount += item.usemount ?? 0
        else normalizedMap.set(baseCode, { materialname: item.materialname ?? baseCode, totalUsemount: item.usemount ?? 0 })
      })

      const baseCodes = Array.from(normalizedMap.keys())
      const { data: componentsData } = await supabase
        .from('labdoc_ingredient_components').select('*')
        .in('ingredient_code', baseCodes).order('component_order', { ascending: true })

      const componentsMap = new Map<string, IngredientComponentRow[]>()
      ;(componentsData ?? []).forEach((comp: Record<string, unknown>) => {
        const code = comp.ingredient_code as string
        const existing = componentsMap.get(code) ?? []
        existing.push(comp as unknown as IngredientComponentRow)
        componentsMap.set(code, existing)
      })

      bomItems = Array.from(normalizedMap.entries())
        .map(([baseCode, data]) => ({ baseCode, materialname: data.materialname, totalUsemount: data.totalUsemount, components: componentsMap.get(baseCode) ?? [] }))
        .sort((a, b) => b.totalUsemount - a.totalUsemount)
    }
  }

  return { product: product as Record<string, unknown>, bomItems, error: null }
}

// ── Transforms (copied from src/lib/doc-gen/transforms.ts) ──

const FRAGRANCE_ALLERGEN_CAS = new Set([
  '5989-27-5','80-56-8','127-91-3','5989-54-8','99-87-6','470-82-6',
  '78-70-6','106-22-9','106-24-1','7540-51-4','5392-40-5','91-64-5',
  '97-53-0','97-54-1','104-55-2','103-41-3','118-58-1','100-51-6',
  '120-51-4','122-40-7','101-86-0','105-13-5','80-54-6','4602-84-0',
  '31906-04-4','90-17-5','111-12-6','107-75-5','6259-76-3','1222-05-5',
  '21145-77-7','141-10-6',
])

function transformIngredientsEn(bomItems: NormalizedBomItem[]) {
  if (bomItems.length === 0) return { rows: [] as IngredientsEnRow[], allergens: [] as FragranceAllergenRow[] }
  const rows: IngredientsEnRow[] = []
  bomItems.forEach((item) => {
    const inciNames = item.components.map(c => c.inci_name_en).filter(Boolean).join(', ')
    const functions = [...new Set(item.components.map(c => c.function).filter(Boolean))].join(', ')
    const casNumbers = [...new Set(item.components.map(c => c.cas_number).filter(Boolean))].join(', ')
    const firstComp = item.components[0]
    rows.push({ no: 0, ingredientName: inciNames || item.materialname, wtPercent: item.totalUsemount / 1000,
      source: 'ICID', casNo: casNumbers || firstComp?.cas_number || '—', function: functions || firstComp?.function || '—' })
  })
  const sorted = rows.sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }))
  const allergenMap = new Map<string, { name: string; casNo: string; wtPercent: number }>()
  bomItems.forEach(item => {
    const rawWt = item.totalUsemount / 1000
    item.components.forEach(comp => {
      if (comp.cas_number && FRAGRANCE_ALLERGEN_CAS.has(comp.cas_number)) {
        const calc = (rawWt * (comp.composition_ratio ?? 100)) / 100
        if (calc >= 0.001) {
          const ex = allergenMap.get(comp.cas_number)
          if (ex) ex.wtPercent += calc
          else allergenMap.set(comp.cas_number, { name: comp.inci_name_en || 'Unknown', casNo: comp.cas_number, wtPercent: calc })
        }
      }
    })
  })
  const allergens = Array.from(allergenMap.values()).sort((a, b) => b.wtPercent - a.wtPercent)
    .map((a, idx) => ({ no: idx + 1, inciName: a.name, casNo: a.casNo, wtPercent: a.wtPercent }))
  return { rows: sorted, allergens }
}

function transformBreakdown(bomItems: NormalizedBomItem[]) {
  if (bomItems.length === 0) return { rows: [] as BreakdownRow[], total: 0 }
  const rows: BreakdownRow[] = []; let rawNo = 0
  bomItems.forEach(item => {
    rawNo++; const rawWt = item.totalUsemount / 1000
    const components = item.components.length > 0 ? item.components : [{
      id: 'default', ingredient_code: item.baseCode, inci_name_en: item.materialname, inci_name_kr: null,
      cas_number: null, composition_ratio: 100, function: null, component_order: 0, country_of_origin: null, created_at: ''
    } as IngredientComponentRow]
    components.forEach((comp, ci) => {
      const ratio = comp.composition_ratio ?? 100
      rows.push({ no: rawNo, rawMaterial: item.materialname, wtPercent: rawWt, componentInci: comp.inci_name_en || comp.inci_name_kr || '—',
        ratioInRaw: ratio, calculatedPercent: (rawWt * ratio) / 100, isFirstOfGroup: ci === 0, groupSize: components.length })
    })
  })
  return { rows, total: rows.reduce((s, r) => s + r.calculatedPercent, 0) }
}

function transformInciSummary(bomItems: NormalizedBomItem[]) {
  if (bomItems.length === 0) return { rows: [] as InciSummaryRow[], total: 0, count: 0 }
  const inciMap = new Map<string, { wtPercent: number; functions: Set<string>; casNumbers: Set<string> }>()
  bomItems.forEach(item => {
    const rawWt = item.totalUsemount / 1000
    if (item.components.length === 0) {
      const key = item.materialname.toUpperCase()
      const ex = inciMap.get(key); if (ex) ex.wtPercent += rawWt
      else inciMap.set(key, { wtPercent: rawWt, functions: new Set(), casNumbers: new Set() })
    } else {
      item.components.forEach(comp => {
        const inciName = (comp.inci_name_en || comp.inci_name_kr || 'Unknown').toUpperCase()
        const calc = (rawWt * (comp.composition_ratio ?? 100)) / 100
        const ex = inciMap.get(inciName)
        if (ex) { ex.wtPercent += calc; if (comp.function) ex.functions.add(comp.function); if (comp.cas_number) ex.casNumbers.add(comp.cas_number) }
        else inciMap.set(inciName, { wtPercent: calc, functions: new Set(comp.function ? [comp.function] : []), casNumbers: new Set(comp.cas_number ? [comp.cas_number] : []) })
      })
    }
  })
  const rows = Array.from(inciMap.entries())
    .map(([n, d]) => ({ no: 0, inciName: n, wtPercent: d.wtPercent, function: Array.from(d.functions).join(', ') || '—', casNo: Array.from(d.casNumbers).join(', ') || '—' }))
    .sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }))
  return { rows, total: rows.reduce((s, r) => s + r.wtPercent, 0), count: rows.length }
}

// ── CSV Generator ──

function generateCsv(headers: string[], rows: string[][]): Blob {
  const esc = (v: string) => (v.includes('"') || v.includes(',') || v.includes('\n') || v.includes('\r')) ? `"${v.replace(/"/g, '""')}"` : v
  const content = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n')
  return new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
}

// ── PDF Generators (simplified inline for standalone) ──

async function generateIngredientsEnPdf(meta: ProductMeta, rows: IngredientsEnRow[], allergens: FragranceAllergenRow[]): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(14)
  doc.text('FORMULA INGREDIENTS STATEMENT (EN)', 148.5, 15, { align: 'center' })
  doc.setFontSize(9); doc.setFont('NanumGothic', 'normal')
  doc.text(`Product: ${meta.englishName || meta.koreanName}`, 15, 25)
  doc.text(`Product Code: ${meta.productCode}`, 15, 30)
  if (meta.createdDate) doc.text(`Date: ${meta.createdDate}`, 250, 30)

  const headers = ['NO.', 'Ingredient Name', '%(W/W)', 'Source', 'CAS No', 'Function']
  const colW = [12, 80, 22, 18, 40, 80]; let y = 38
  doc.setFillColor(240, 240, 240); doc.rect(15, y - 4, 267, 7, 'F')
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(7)
  let x = 15; headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colW[i] })
  y += 5; doc.setFont('NanumGothic', 'normal'); doc.setFontSize(7)

  for (const r of rows) {
    if (y > 190) { doc.addPage(); y = 15 }
    x = 15
    doc.text(String(r.no), x + 1, y); x += colW[0]
    doc.text(r.ingredientName.substring(0, 55), x + 1, y); x += colW[1]
    doc.text(r.wtPercent >= 99.99 ? 'To. 100' : r.wtPercent.toFixed(5), x + 1, y); x += colW[2]
    doc.text(r.source, x + 1, y); x += colW[3]
    doc.text(r.casNo.substring(0, 28), x + 1, y); x += colW[4]
    doc.text(r.function.substring(0, 55), x + 1, y)
    y += 4
  }

  const totalPct = rows.reduce((s, r) => s + r.wtPercent, 0)
  y += 2; doc.setFont('NanumGothic', 'bold')
  doc.text(`Total: ${totalPct.toFixed(5)}`, 15, y)

  if (allergens.length > 0) {
    y += 8; doc.setFontSize(9); doc.text('Fragrance Allergens Ingredients', 15, y)
    y += 5; doc.setFontSize(7); doc.setFont('NanumGothic', 'normal')
    for (const a of allergens) {
      if (y > 190) { doc.addPage(); y = 15 }
      doc.text(`${a.no}. ${a.inciName}  |  CAS: ${a.casNo}  |  ${a.wtPercent.toFixed(5)}%`, 15, y)
      y += 4
    }
  }

  return doc.output('blob')
}

async function generateBreakdownPdf(meta: ProductMeta, rows: BreakdownRow[], total: number): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(14)
  doc.text('FORMULA BREAKDOWN', 148.5, 15, { align: 'center' })
  doc.setFontSize(9); doc.setFont('NanumGothic', 'normal')
  doc.text(`Product: ${meta.englishName || meta.koreanName}`, 15, 25)
  doc.text(`Product Code: ${meta.productCode}`, 15, 30)

  const headers = ['No.', 'Raw Material', 'WT %', 'Component INCI Name', '% in Raw', '% Calculated']
  const colW = [12, 60, 22, 80, 22, 28]; let y = 38
  doc.setFillColor(240, 240, 240); doc.rect(15, y - 4, 267, 7, 'F')
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(7)
  let x = 15; headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colW[i] })
  y += 5; doc.setFont('NanumGothic', 'normal'); doc.setFontSize(7)

  for (const r of rows) {
    if (y > 190) { doc.addPage(); y = 15 }
    x = 15
    doc.text(r.isFirstOfGroup ? String(r.no) : '', x + 1, y); x += colW[0]
    doc.text(r.isFirstOfGroup ? r.rawMaterial.substring(0, 40) : '', x + 1, y); x += colW[1]
    doc.text(r.isFirstOfGroup ? r.wtPercent.toFixed(5) : '', x + 1, y); x += colW[2]
    doc.text(r.componentInci.substring(0, 55), x + 1, y); x += colW[3]
    doc.text(r.ratioInRaw.toFixed(2), x + 1, y); x += colW[4]
    doc.text(r.calculatedPercent.toFixed(5), x + 1, y)
    y += 4
  }
  y += 2; doc.setFont('NanumGothic', 'bold')
  doc.text(`Total Calculated: ${total.toFixed(5)}`, 15, y)
  return doc.output('blob')
}

async function generateInciSummaryPdf(meta: ProductMeta, rows: InciSummaryRow[], total: number, count: number): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(14)
  doc.text('INCI INGREDIENT SUMMARY', 148.5, 15, { align: 'center' })
  doc.setFontSize(9); doc.setFont('NanumGothic', 'normal')
  doc.text(`Product: ${meta.englishName || meta.koreanName}`, 15, 25)
  doc.text(`Product Code: ${meta.productCode}`, 15, 30)

  const headers = ['No.', 'INCI Name', 'WT %', 'Function', 'CAS No.']
  const colW = [12, 80, 25, 70, 50]; let y = 38
  doc.setFillColor(240, 240, 240); doc.rect(15, y - 4, 267, 7, 'F')
  doc.setFont('NanumGothic', 'bold'); doc.setFontSize(7)
  let x = 15; headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colW[i] })
  y += 5; doc.setFont('NanumGothic', 'normal'); doc.setFontSize(7)

  for (const r of rows) {
    if (y > 190) { doc.addPage(); y = 15 }
    x = 15
    doc.text(String(r.no), x + 1, y); x += colW[0]
    doc.text(r.inciName.substring(0, 55), x + 1, y); x += colW[1]
    doc.text(r.wtPercent.toFixed(6), x + 1, y); x += colW[2]
    doc.text(r.function.substring(0, 45), x + 1, y); x += colW[3]
    doc.text(r.casNo.substring(0, 35), x + 1, y)
    y += 4
  }
  y += 2; doc.setFont('NanumGothic', 'bold')
  doc.text(`Total: ${total.toFixed(6)}  |  Total INCI Components: ${count}`, 15, y)
  return doc.output('blob')
}

// ── Upload ──

async function uploadFile(blob: Blob, path: string, contentType: string): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer())
  const { error } = await supabase.storage.from('documents').upload(path, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Upload ${path}: ${error.message}`)
  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data.publicUrl
}

// ── Main ──

async function processProduct(productCode: string): Promise<{ success: boolean; error?: string }> {
  const { product, bomItems, error } = await fetchProductWithBom(productCode)
  if (error || !product) return { success: false, error: error || 'Not found' }

  const meta: ProductMeta = {
    productCode: product.product_code as string,
    englishName: (product.english_name as string) || '',
    koreanName: (product.korean_name as string) || '',
    packagingUnit: (product.packaging_unit as string) || undefined,
    createdDate: (product.created_date as string) || undefined,
  }

  const prefix = `products/${productCode}`
  const urls: Record<string, string> = {}

  const { rows: enRows, allergens } = transformIngredientsEn(bomItems)
  const totalEnPct = enRows.reduce((s, r) => s + r.wtPercent, 0)
  const { rows: bRows, total: bTotal } = transformBreakdown(bomItems)
  const { rows: sRows, total: sTotal, count: sCount } = transformInciSummary(bomItems)

  const [enPdf, bPdf, sPdf] = await Promise.all([
    generateIngredientsEnPdf(meta, enRows, allergens),
    generateBreakdownPdf(meta, bRows, bTotal),
    generateInciSummaryPdf(meta, sRows, sTotal, sCount),
  ])

  const enCsvRows = [
    ...enRows.map(r => [String(r.no), r.ingredientName, r.wtPercent >= 99.99 ? 'To. 100' : r.wtPercent.toFixed(5), r.source, r.casNo, r.function]),
    ['','','','','',''], ['','Total', totalEnPct.toFixed(5),'','',''],
  ]
  if (allergens.length > 0) {
    enCsvRows.push(['','','','','',''], ['Fragrance Allergens Ingredients','','','','',''], ['NO.','INCI Name','CAS No','%(W/W)','',''])
    allergens.forEach(a => enCsvRows.push([String(a.no), a.inciName, a.casNo, a.wtPercent.toFixed(5),'','']))
  }
  const enCsv = generateCsv(['NO.','Ingredient Name','%(W/W)','Source','CAS No','Function'], enCsvRows)

  const bCsvRows = [
    ...bRows.map(r => [r.isFirstOfGroup ? String(r.no) : '', r.isFirstOfGroup ? r.rawMaterial : '', r.isFirstOfGroup ? r.wtPercent.toFixed(5) : '', r.componentInci, r.ratioInRaw.toFixed(2), r.calculatedPercent.toFixed(5)]),
    ['','','','','Total Calculated', bTotal.toFixed(5)],
  ]
  const bCsv = generateCsv(['No.','Raw Material','WT %','Component INCI Name','% in Raw','% Calculated'], bCsvRows)

  const sCsvRows = [
    ...sRows.map(r => [String(r.no), r.inciName, r.wtPercent.toFixed(6), r.function, r.casNo]),
    ['','Total', sTotal.toFixed(6),'',''], ['',`Total INCI Components: ${sCount}`,'','',''],
  ]
  const sCsv = generateCsv(['No.','INCI Name','WT %','Function','CAS No.'], sCsvRows)

  await Promise.all([
    uploadFile(enPdf, `${prefix}/ingredients-en.pdf`, 'application/pdf').then(u => { urls.ingredients_en_pdf_url = u }),
    uploadFile(enCsv, `${prefix}/ingredients-en.csv`, 'text/csv').then(u => { urls.ingredients_en_csv_url = u }),
    uploadFile(bPdf, `${prefix}/formula-breakdown.pdf`, 'application/pdf').then(u => { urls.formula_breakdown_pdf_url = u }),
    uploadFile(bCsv, `${prefix}/formula-breakdown.csv`, 'text/csv').then(u => { urls.formula_breakdown_csv_url = u }),
    uploadFile(sPdf, `${prefix}/inci-summary.pdf`, 'application/pdf').then(u => { urls.inci_summary_pdf_url = u }),
    uploadFile(sCsv, `${prefix}/inci-summary.csv`, 'text/csv').then(u => { urls.inci_summary_csv_url = u }),
  ])

  const { error: updateErr } = await supabase
    .from('labdoc_products')
    .update({ ...urls, updated_at: new Date().toISOString() })
    .eq('product_code', productCode)

  if (updateErr) return { success: false, error: `DB update: ${updateErr.message}` }
  return { success: true }
}

async function main() {
  const cliCodes = process.argv.slice(2)

  let codes: string[]

  if (cliCodes.length > 0) {
    codes = cliCodes
    console.log(`Regenerating ${codes.length} specified products...\n`)
  } else {
    console.log('Fetching remaining products...')
    const { data: remaining, error: fetchErr } = await supabase
      .from('labdoc_products')
      .select('product_code')
      .is('ingredients_en_pdf_url', null)
      .order('product_code')

    if (fetchErr || !remaining) { console.error('Failed to fetch products:', fetchErr); process.exit(1) }
    codes = remaining.map((r: Record<string, unknown>) => r.product_code as string)
    console.log(`Remaining: ${codes.length} products\n`)
  }

  let success = 0, fail = 0
  const failures: string[] = []

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]
    process.stdout.write(`[${i + 1}/${codes.length}] ${code}... `)

    try {
      const result = await processProduct(code)
      if (result.success) {
        success++
        console.log(`OK [${success}/${success + fail}]`)
      } else {
        fail++
        console.log(`FAIL: ${result.error} [${success}/${success + fail}]`)
        failures.push(`${code}: ${result.error}`)
      }
    } catch (err) {
      fail++
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`ERR: ${msg.substring(0, 80)} [${success}/${success + fail}]`)
      failures.push(`${code}: ${msg.substring(0, 80)}`)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`DONE: ${success} success, ${fail} fail / ${codes.length} total`)
  if (failures.length > 0) {
    console.log(`\nFailed (${failures.length}):`)
    failures.forEach(f => console.log(`  ${f}`))
  }
}

main().catch(console.error)
