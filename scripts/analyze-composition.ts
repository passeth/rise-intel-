import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
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
}

interface NormalizedBomItem {
  baseCode: string
  materialname: string
  totalUsemount: number
  components: IngredientComponentRow[]
}

interface LabProduct {
  product_code: string
  korean_name: string | null
  english_name: string | null
  semi_product_code: string | null
}

// ── Same normalization as production code ──

function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

// ── Fetch all products ──

async function fetchAllProducts(): Promise<LabProduct[]> {
  const all: LabProduct[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('labdoc_products')
      .select('product_code, korean_name, english_name, semi_product_code')
      .order('product_code')
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Error fetching products:', error.message)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as LabProduct[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

// ── Fetch BOM + components for a product (same logic as production) ──

async function fetchBomForProduct(semiProductCode: string): Promise<NormalizedBomItem[]> {
  const { data: bomData, error: bomErr } = await supabase
    .from('bom_master')
    .select('materialcode, materialname, usemount')
    .eq('prdcode', semiProductCode)
    .eq('품목구분', '[원재료]')
    .order('usemount', { ascending: false })

  if (bomErr || !bomData || bomData.length === 0) return []

  // Normalize and aggregate
  const normalizedMap = new Map<string, { materialname: string; totalUsemount: number }>()
  ;(bomData as BomRawItem[]).forEach((item) => {
    if (!item.materialcode) return
    const baseCode = normalizeIngredientCode(item.materialcode)
    const existing = normalizedMap.get(baseCode)
    if (existing) {
      existing.totalUsemount += item.usemount ?? 0
    } else {
      normalizedMap.set(baseCode, {
        materialname: item.materialname ?? baseCode,
        totalUsemount: item.usemount ?? 0,
      })
    }
  })

  const baseCodes = Array.from(normalizedMap.keys())

  // Fetch components
  const { data: componentsData } = await supabase
    .from('labdoc_ingredient_components')
    .select('*')
    .in('ingredient_code', baseCodes)
    .order('component_order', { ascending: true })

  const componentsMap = new Map<string, IngredientComponentRow[]>()
  ;(componentsData ?? []).forEach((comp) => {
    const existing = componentsMap.get(comp.ingredient_code) ?? []
    existing.push(comp as IngredientComponentRow)
    componentsMap.set(comp.ingredient_code, existing)
  })

  return Array.from(normalizedMap.entries())
    .map(([baseCode, data]) => ({
      baseCode,
      materialname: data.materialname,
      totalUsemount: data.totalUsemount,
      components: componentsMap.get(baseCode) ?? [],
    }))
    .sort((a, b) => b.totalUsemount - a.totalUsemount)
}

// ── Calculate breakdown total (same logic as transforms.ts) ──

function calculateBreakdownTotal(bomItems: NormalizedBomItem[]): {
  total: number
  ingredientDetails: Array<{
    baseCode: string
    materialname: string
    bomPercent: number
    componentCount: number
    componentRatioSum: number
    contributedPercent: number
  }>
} {
  const ingredientDetails: Array<{
    baseCode: string
    materialname: string
    bomPercent: number
    componentCount: number
    componentRatioSum: number
    contributedPercent: number
  }> = []

  let total = 0

  bomItems.forEach((item) => {
    const rawWtPercent = item.totalUsemount / 1000
    let itemContribution = 0

    if (item.components.length === 0) {
      // No components → ingredient itself at 100%
      itemContribution = rawWtPercent
    } else {
      item.components.forEach((comp) => {
        const ratio = comp.composition_ratio ?? 100
        const calculated = (rawWtPercent * ratio) / 100
        itemContribution += calculated
      })
    }

    const componentRatioSum = item.components.length === 0
      ? 100
      : item.components.reduce((s, c) => s + (c.composition_ratio ?? 100), 0)

    ingredientDetails.push({
      baseCode: item.baseCode,
      materialname: item.materialname,
      bomPercent: rawWtPercent,
      componentCount: item.components.length,
      componentRatioSum: componentRatioSum,
      contributedPercent: itemContribution,
    })

    total += itemContribution
  })

  return { total, ingredientDetails }
}

// ── Main ──

async function main() {
  console.log('=== Composition Analysis ===\n')

  // 1. Fetch all products
  console.log('Fetching all products...')
  const products = await fetchAllProducts()
  console.log(`Found ${products.length} products\n`)

  // Track results
  const problemProducts: Array<{
    productCode: string
    koreanName: string
    semiProductCode: string
    compositionTotal: number
    deviation: number
    bomItemCount: number
    problemIngredients: string
  }> = []

  // Track ingredient-level issues
  const ingredientIssues = new Map<string, {
    ingredientCode: string
    materialname: string
    componentCount: number
    componentRatioSum: number
    deviation: number
    affectedProducts: string[]
  }>()

  // 2. Process each product
  let processed = 0
  let skipped = 0
  const TOLERANCE = 0.01 // 0.01% tolerance for floating point

  for (const product of products) {
    processed++
    if (processed % 100 === 0) {
      console.log(`Processing ${processed}/${products.length}...`)
    }

    if (!product.semi_product_code) {
      skipped++
      continue
    }

    const bomItems = await fetchBomForProduct(product.semi_product_code)
    if (bomItems.length === 0) {
      skipped++
      continue
    }

    const { total, ingredientDetails } = calculateBreakdownTotal(bomItems)
    const deviation = total - 100

    if (Math.abs(deviation) > TOLERANCE) {
      // Find which ingredients are causing the issue
      const problemIngrs = ingredientDetails
        .filter((d) => d.componentCount > 0 && Math.abs(d.componentRatioSum - 100) > TOLERANCE)
        .map((d) => `${d.baseCode}(${d.componentRatioSum.toFixed(2)}%)`)
        .join('; ')

      problemProducts.push({
        productCode: product.product_code,
        koreanName: product.korean_name ?? '',
        semiProductCode: product.semi_product_code,
        compositionTotal: parseFloat(total.toFixed(5)),
        deviation: parseFloat(deviation.toFixed(5)),
        bomItemCount: bomItems.length,
        problemIngredients: problemIngrs,
      })
    }

    // Track ingredient-level issues for ALL products
    ingredientDetails.forEach((d) => {
      if (d.componentCount > 0 && Math.abs(d.componentRatioSum - 100) > TOLERANCE) {
        const existing = ingredientIssues.get(d.baseCode)
        if (existing) {
          existing.affectedProducts.push(product.product_code)
        } else {
          ingredientIssues.set(d.baseCode, {
            ingredientCode: d.baseCode,
            materialname: d.materialname,
            componentCount: d.componentCount,
            componentRatioSum: parseFloat(d.componentRatioSum.toFixed(4)),
            deviation: parseFloat((d.componentRatioSum - 100).toFixed(4)),
            affectedProducts: [product.product_code],
          })
        }
      }
    })
  }

  console.log(`\nProcessed: ${processed}, Skipped (no BOM): ${skipped}`)
  console.log(`Products with composition ≠ 100%: ${problemProducts.length}`)
  console.log(`Ingredients with component ratio ≠ 100%: ${ingredientIssues.size}\n`)

  // 3. Write CSV 1: Problem products
  const productsCsvHeader = 'product_code,korean_name,semi_product_code,composition_total,deviation,bom_item_count,problem_ingredients'
  const productsCsvRows = problemProducts
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .map((p) => [
      p.productCode,
      `"${p.koreanName.replace(/"/g, '""')}"`,
      p.semiProductCode,
      p.compositionTotal,
      p.deviation,
      p.bomItemCount,
      `"${p.problemIngredients.replace(/"/g, '""')}"`,
    ].join(','))

  const productsCsv = [productsCsvHeader, ...productsCsvRows].join('\n')
  const productsPath = join(process.cwd(), 'scripts', 'output', 'products-composition-issues.csv')
  await writeFile(productsPath, '\uFEFF' + productsCsv, 'utf-8') // BOM for Excel Korean
  console.log(`✅ Products CSV: ${productsPath} (${problemProducts.length} rows)`)

  // 4. Write CSV 2: Problem ingredients
  const ingredientsCsvHeader = 'ingredient_code,material_name,component_count,composition_ratio_sum,deviation,affected_product_count,affected_products'
  const ingredientsCsvRows = Array.from(ingredientIssues.values())
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .map((i) => [
      i.ingredientCode,
      `"${i.materialname.replace(/"/g, '""')}"`,
      i.componentCount,
      i.componentRatioSum,
      i.deviation,
      i.affectedProducts.length,
      `"${i.affectedProducts.join('; ')}"`,
    ].join(','))

  const ingredientsCsv = [ingredientsCsvHeader, ...ingredientsCsvRows].join('\n')
  const ingredientsPath = join(process.cwd(), 'scripts', 'output', 'ingredients-composition-issues.csv')
  await writeFile(ingredientsPath, '\uFEFF' + ingredientsCsv, 'utf-8')
  console.log(`✅ Ingredients CSV: ${ingredientsPath} (${ingredientIssues.size} rows)`)

  // 5. Summary
  console.log('\n=== Summary ===')
  console.log(`Total products analyzed: ${processed - skipped}`)
  console.log(`Products with issues: ${problemProducts.length}`)
  console.log(`Unique problematic ingredients: ${ingredientIssues.size}`)

  if (problemProducts.length > 0) {
    console.log('\nTop 10 worst deviations:')
    problemProducts
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 10)
      .forEach((p) => {
        console.log(`  ${p.productCode} (${p.koreanName}): ${p.compositionTotal.toFixed(2)}% (${p.deviation > 0 ? '+' : ''}${p.deviation.toFixed(2)}%)`)
      })
  }

  if (ingredientIssues.size > 0) {
    console.log('\nTop 10 worst ingredient deviations:')
    Array.from(ingredientIssues.values())
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 10)
      .forEach((i) => {
        console.log(`  ${i.ingredientCode} (${i.materialname}): ratio sum = ${i.componentRatioSum}% (${i.deviation > 0 ? '+' : ''}${i.deviation}%), affects ${i.affectedProducts.length} products`)
      })
  }
}

main().catch(console.error)
