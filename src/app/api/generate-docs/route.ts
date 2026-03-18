import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProductWithBomServer } from '@/app/products/[productCode]/docs/_lib/utils-server'
import { transformIngredientsEn, transformBreakdown, transformInciSummary } from '@/lib/doc-gen/transforms'
import type { ProductMeta, DocUrls } from '@/lib/doc-gen/types'

export async function POST(request: NextRequest) {
  try {
    const { productCode } = await request.json()
    if (!productCode) {
      return NextResponse.json({ error: 'productCode is required' }, { status: 400 })
    }

    const { product, bomItems, error } = await fetchProductWithBomServer(productCode)
    if (error || !product) {
      return NextResponse.json({ error: error || 'Product not found' }, { status: 404 })
    }

    const meta: ProductMeta = {
      productCode: product.product_code,
      englishName: product.english_name || '',
      koreanName: product.korean_name || '',
      packagingUnit: product.packaging_unit || undefined,
      createdDate: product.created_date || undefined,
    }

    const { rows: enRows, allergens } = transformIngredientsEn(bomItems)
    const { rows: breakdownRows, total: breakdownTotal } = transformBreakdown(bomItems)
    const { rows: summaryRows, total: summaryTotal, count: summaryCount } = transformInciSummary(bomItems)

    const { generateIngredientsEnPdf } = await import('@/lib/doc-gen/pdf-ingredients-en')
    const { generateBreakdownPdf } = await import('@/lib/doc-gen/pdf-breakdown')
    const { generateInciSummaryPdf } = await import('@/lib/doc-gen/pdf-inci-summary')
    const { generateCsv } = await import('@/lib/doc-gen/csv')

    const totalEnPercent = enRows.reduce((sum, r) => sum + r.wtPercent, 0)

    const [enPdf, breakdownPdf, summaryPdf] = await Promise.all([
      generateIngredientsEnPdf(meta, enRows, allergens),
      generateBreakdownPdf(meta, breakdownRows, breakdownTotal),
      generateInciSummaryPdf(meta, summaryRows, summaryTotal, summaryCount),
    ])

    const enCsvRows: string[][] = [
      ...enRows.map((r) => [
        String(r.no), r.ingredientName,
        r.wtPercent >= 99.99 ? 'To. 100' : r.wtPercent.toFixed(5),
        r.source, r.casNo, r.function,
      ]),
      ['', '', '', '', '', ''],
      ['', 'Total', totalEnPercent.toFixed(5), '', '', ''],
    ]
    if (allergens.length > 0) {
      enCsvRows.push(['', '', '', '', '', ''])
      enCsvRows.push(['Fragrance Allergens Ingredients', '', '', '', '', ''])
      enCsvRows.push(['NO.', 'INCI Name', 'CAS No', '%(W/W)', '', ''])
      allergens.forEach((a) => {
        enCsvRows.push([String(a.no), a.inciName, a.casNo, a.wtPercent.toFixed(5), '', ''])
      })
    }
    const enCsv = generateCsv(
      ['NO.', 'Ingredient Name', '%(W/W)', 'Source', 'CAS No', 'Function'],
      enCsvRows
    )

    const breakdownCsvRows = [
      ...breakdownRows.map((r) => [
        r.isFirstOfGroup ? String(r.no) : '', r.isFirstOfGroup ? r.rawMaterial : '',
        r.isFirstOfGroup ? r.wtPercent.toFixed(5) : '',
        r.componentInci, r.ratioInRaw.toFixed(2), r.calculatedPercent.toFixed(5),
      ]),
      ['', '', '', '', 'Total Calculated', breakdownTotal.toFixed(5)],
    ]
    const breakdownCsv = generateCsv(
      ['No.', 'Raw Material', 'WT %', 'Component INCI Name', '% in Raw', '% Calculated'],
      breakdownCsvRows
    )

    const summaryCsvRows = [
      ...summaryRows.map((r) => [String(r.no), r.inciName, r.wtPercent.toFixed(6), r.function, r.casNo]),
      ['', 'Total', summaryTotal.toFixed(6), '', ''],
      ['', `Total INCI Components: ${summaryCount}`, '', '', ''],
    ]
    const summaryCsv = generateCsv(
      ['No.', 'INCI Name', 'WT %', 'Function', 'CAS No.'],
      summaryCsvRows
    )

    const supabase = await createClient()
    const prefix = `products/${productCode}`

    const uploadFile = async (blob: Blob, path: string, contentType: string): Promise<string> => {
      const buffer = Buffer.from(await blob.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, buffer, { contentType, upsert: true })
      if (uploadError) throw new Error(`Upload ${path} failed: ${uploadError.message}`)
      const { data } = supabase.storage.from('documents').getPublicUrl(path)
      return data.publicUrl
    }

    const [enPdfUrl, enCsvUrl, breakdownPdfUrl, breakdownCsvUrl, summaryPdfUrl, summaryCsvUrl] =
      await Promise.all([
        uploadFile(enPdf, `${prefix}/ingredients-en.pdf`, 'application/pdf'),
        uploadFile(enCsv, `${prefix}/ingredients-en.csv`, 'text/csv'),
        uploadFile(breakdownPdf, `${prefix}/formula-breakdown.pdf`, 'application/pdf'),
        uploadFile(breakdownCsv, `${prefix}/formula-breakdown.csv`, 'text/csv'),
        uploadFile(summaryPdf, `${prefix}/inci-summary.pdf`, 'application/pdf'),
        uploadFile(summaryCsv, `${prefix}/inci-summary.csv`, 'text/csv'),
      ])

    const urls: DocUrls = {
      ingredients_en_pdf_url: enPdfUrl,
      ingredients_en_csv_url: enCsvUrl,
      formula_breakdown_pdf_url: breakdownPdfUrl,
      formula_breakdown_csv_url: breakdownCsvUrl,
      inci_summary_pdf_url: summaryPdfUrl,
      inci_summary_csv_url: summaryCsvUrl,
    }

    const { error: updateError } = await supabase
      .from('labdoc_products')
      .update({ ...urls, updated_at: new Date().toISOString() })
      .eq('product_code', productCode)

    if (updateError) {
      return NextResponse.json({ error: `DB update failed: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, urls })
  } catch (err) {
    console.error('generate-docs error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
