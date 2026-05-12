export interface BomCsvRow {
  prdcode: string
  productName: string
  materialcode: string
  materialname: string
  usemount: number
}

// Product mapping extracted from CSV: final product → bulk (semi-product)
export interface CsvProductMapping {
  productCode: string
  productName: string
  semiProductCode: string
}

// Parse BOM CSV content into structured rows
export function parseBomCsv(content: string): { rows: BomCsvRow[]; error?: string } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length < 3) {
    return { rows: [], error: 'CSV 파일이 비어있거나 형식이 올바르지 않습니다' }
  }

  const rows: BomCsvRow[] = []

  // Skip first line (company name) and second line (headers)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]

    // Split by "," pattern (tab-separated values within quotes)
    const parts = line.split('","')
    if (parts.length < 8) continue

    const clean = (s: string) => s.replace(/"/g, '').replace(/\t/g, '').trim()

    const productName = clean(parts[2])
    const prdcode = clean(parts[7])
    const materialcode = clean(parts[3])
    const materialname = clean(parts[4])
    const usemountStr = clean(parts[6]).replace(/,/g, '')
    const usemount = parseFloat(usemountStr)

    if (!prdcode || !materialcode || isNaN(usemount)) continue

    rows.push({ prdcode, productName, materialcode, materialname, usemount })
  }

  return { rows }
}

// Extract product → semi-product mappings from parsed rows
export function extractProductMappings(rows: BomCsvRow[]): CsvProductMapping[] {
  const mappings = new Map<string, CsvProductMapping>()

  for (const row of rows) {
    // Final products: prdcode doesn't start with P or B
    if (row.prdcode.startsWith('P') || row.prdcode.startsWith('B')) continue
    // Bulk materialcode (B-prefix) = semi-product code used for ingredient lookup
    if (row.materialcode.startsWith('B')) {
      mappings.set(row.prdcode, {
        productCode: row.prdcode,
        productName: row.productName,
        semiProductCode: row.materialcode,
      })
    }
  }

  return Array.from(mappings.values()).sort((a, b) => a.productCode.localeCompare(b.productCode))
}
