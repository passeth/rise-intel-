'use server'

import { createClient } from '@/lib/supabase/server'
import type { BomCsvRow, CsvProductMapping } from './parse-csv'

export interface BomUploadResult {
  success: boolean
  error?: string
  stats?: {
    totalRows: number
    upsertedRows: number
  }
}

// Upload BOM data to bom_master only (no auto product creation)
export async function uploadBomData(rows: BomCsvRow[]): Promise<BomUploadResult> {
  const supabase = await createClient()

  const BATCH_SIZE = 500
  let upsertedTotal = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('bom_master')
      .upsert(
        batch.map((r) => ({
          prdcode: r.prdcode,
          materialcode: r.materialcode,
          materialname: r.materialname,
          usemount: r.usemount,
          '품목구분': r.itemType || null,
        })),
        { onConflict: 'prdcode,materialcode' }
      )

    if (error) {
      return {
        success: false,
        error: `배치 ${Math.floor(i / BATCH_SIZE) + 1} 업로드 실패: ${error.message}`,
      }
    }

    upsertedTotal += batch.length
  }

  return {
    success: true,
    stats: { totalRows: rows.length, upsertedRows: upsertedTotal },
  }
}

// Check which products from CSV are new (not in labdoc_products)
export async function checkNewProducts(
  mappings: CsvProductMapping[]
): Promise<{ newProducts: CsvProductMapping[]; existingCount: number }> {
  const supabase = await createClient()
  const productCodes = mappings.map((m) => m.productCode)

  if (productCodes.length === 0) {
    return { newProducts: [], existingCount: 0 }
  }

  // Query in batches (Supabase .in() has limits)
  const BATCH = 200
  const existingSet = new Set<string>()

  for (let i = 0; i < productCodes.length; i += BATCH) {
    const batch = productCodes.slice(i, i + BATCH)
    const { data } = await supabase
      .from('labdoc_products')
      .select('product_code')
      .in('product_code', batch)

    ;(data ?? []).forEach((p) => existingSet.add(p.product_code))
  }

  const newProducts = mappings.filter((m) => !existingSet.has(m.productCode))
  return { newProducts, existingCount: existingSet.size }
}

// Register selected products to labdoc_products
export async function registerSelectedProducts(
  products: CsvProductMapping[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (products.length === 0) {
    return { success: true, count: 0 }
  }

  const supabase = await createClient()
  const BATCH_SIZE = 500
  let registered = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('labdoc_products')
      .upsert(
        batch.map((p) => ({
          product_code: p.productCode,
          semi_product_code: p.semiProductCode,
          korean_name: p.productName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'product_code', ignoreDuplicates: true }
      )

    if (error) {
      return { success: false, count: registered, error: error.message }
    }

    registered += batch.length
  }

  return { success: true, count: registered }
}
