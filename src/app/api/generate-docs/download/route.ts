import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

type DocType = 'ingredients_en' | 'formula_breakdown' | 'inci_summary'

const DOC_TYPE_FILES: Record<DocType, { pdf: string; csv: string }> = {
  ingredients_en: { pdf: 'ingredients-en.pdf', csv: 'ingredients-en.csv' },
  formula_breakdown: { pdf: 'formula-breakdown.pdf', csv: 'formula-breakdown.csv' },
  inci_summary: { pdf: 'inci-summary.pdf', csv: 'inci-summary.csv' },
}

const DOC_URL_COLUMNS: Record<DocType, { pdf: string; csv: string }> = {
  ingredients_en: { pdf: 'ingredients_en_pdf_url', csv: 'ingredients_en_csv_url' },
  formula_breakdown: { pdf: 'formula_breakdown_pdf_url', csv: 'formula_breakdown_csv_url' },
  inci_summary: { pdf: 'inci_summary_pdf_url', csv: 'inci_summary_csv_url' },
}

const MAX_BATCH_SIZE = 50

export async function POST(request: NextRequest) {
  try {
    const { productCodes, docTypes, formats } = await request.json() as {
      productCodes: string[]
      docTypes?: DocType[]
      formats?: ('pdf' | 'csv')[]
    }

    if (!Array.isArray(productCodes) || productCodes.length === 0) {
      return NextResponse.json({ error: 'productCodes array is required' }, { status: 400 })
    }

    if (productCodes.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} products per batch` },
        { status: 400 }
      )
    }

    const types: DocType[] = docTypes ?? ['ingredients_en', 'formula_breakdown', 'inci_summary']
    const fileFormats: Set<string> = new Set(formats ?? ['pdf', 'csv'])

    const selectColumns = ['product_code', 'korean_name']
    for (const t of types) {
      if (fileFormats.has('pdf')) selectColumns.push(DOC_URL_COLUMNS[t].pdf)
      if (fileFormats.has('csv')) selectColumns.push(DOC_URL_COLUMNS[t].csv)
    }

    const supabase = await createClient()
    const { data: products, error: dbError } = await supabase
      .from('labdoc_products')
      .select(selectColumns.join(','))
      .in('product_code', productCodes)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 })
    }

    const zip = new JSZip()
    const errors: string[] = []

    for (const product of products) {
      const row = product as unknown as Record<string, unknown>
      const code = row.product_code as string
      const folder = zip.folder(code)
      if (!folder) continue

      for (const docType of types) {
        for (const fmt of ['pdf', 'csv'] as const) {
          if (!fileFormats.has(fmt)) continue

          const urlColumn = DOC_URL_COLUMNS[docType][fmt]
          const url = row[urlColumn] as string | null

          if (!url) {
            errors.push(`${code}: ${DOC_TYPE_FILES[docType][fmt]} not generated`)
            continue
          }

          try {
            const res = await fetch(url)
            if (!res.ok) {
              errors.push(`${code}: Failed to fetch ${DOC_TYPE_FILES[docType][fmt]}`)
              continue
            }
            const buffer = await res.arrayBuffer()
            folder.file(DOC_TYPE_FILES[docType][fmt], buffer)
          } catch {
            errors.push(`${code}: Error downloading ${DOC_TYPE_FILES[docType][fmt]}`)
          }
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = productCodes.length === 1
      ? `${productCodes[0]}_documents_${timestamp}.zip`
      : `products_documents_${productCodes.length}ea_${timestamp}.zip`

    const response = new Response(zipBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.byteLength),
        ...(errors.length > 0 ? { 'X-Download-Warnings': JSON.stringify(errors) } : {}),
      },
    })
    return response
  } catch (err) {
    console.error('download-docs error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
