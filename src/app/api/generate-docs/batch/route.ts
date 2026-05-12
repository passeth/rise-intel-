import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProductWithBomServer } from '@/app/products/[productCode]/docs/_lib/utils-server'
import { transformIngredientsEn, transformBreakdown, transformInciSummary } from '@/lib/doc-gen/transforms'
import type { ProductMeta, DocUrls } from '@/lib/doc-gen/types'

export type DocType = 'ingredients_en' | 'formula_breakdown' | 'inci_summary'

interface BatchResult {
  productCode: string
  success: boolean
  urls?: DocUrls
  error?: string
}

const MAX_BATCH_SIZE = 50

export async function POST(request: NextRequest) {
  try {
    const { productCodes, docTypes } = await request.json() as {
      productCodes: string[]
      docTypes?: DocType[]
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

    const types: Set<DocType> = new Set(
      docTypes ?? ['ingredients_en', 'formula_breakdown', 'inci_summary']
    )

    const { generateIngredientsEnPdf } = await import('@/lib/doc-gen/pdf-ingredients-en')
    const { generateBreakdownPdf } = await import('@/lib/doc-gen/pdf-breakdown')
    const { generateInciSummaryPdf } = await import('@/lib/doc-gen/pdf-inci-summary')
    const { generateCsv } = await import('@/lib/doc-gen/csv')

    const supabase = await createClient()

    const uploadFile = async (blob: Blob, path: string, contentType: string): Promise<string> => {
      const buffer = Buffer.from(await blob.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, buffer, { contentType, upsert: true })
      if (uploadError) throw new Error(`Upload ${path} failed: ${uploadError.message}`)
      const { data } = supabase.storage.from('documents').getPublicUrl(path)
      return data.publicUrl
    }

    const results: BatchResult[] = []

    for (const productCode of productCodes) {
      try {
        const { product, bomItems, error } = await fetchProductWithBomServer(productCode)
        if (error || !product) {
          results.push({ productCode, success: false, error: error || 'Product not found' })
          continue
        }

        const meta: ProductMeta = {
          productCode: product.product_code,
          englishName: product.english_name || '',
          koreanName: product.korean_name || '',
          packagingUnit: product.packaging_unit || undefined,
          createdDate: product.created_date || undefined,
        }

        const prefix = `products/${productCode}`
        const urls: DocUrls = {}
        const uploadPromises: Promise<void>[] = []

        if (types.has('ingredients_en')) {
          const { rows: enRows, allergens } = transformIngredientsEn(bomItems)
          const totalEnPercent = enRows.reduce((sum, r) => sum + r.wtPercent, 0)

          const enPdf = await generateIngredientsEnPdf(meta, enRows, allergens)
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

          uploadPromises.push(
            uploadFile(enPdf, `${prefix}/ingredients-en.pdf`, 'application/pdf')
              .then(url => { urls.ingredients_en_pdf_url = url }),
            uploadFile(enCsv, `${prefix}/ingredients-en.csv`, 'text/csv')
              .then(url => { urls.ingredients_en_csv_url = url })
          )
        }

        if (types.has('formula_breakdown')) {
          const { rows: breakdownRows, total: breakdownTotal } = transformBreakdown(bomItems)
          const breakdownPdf = await generateBreakdownPdf(meta, breakdownRows, breakdownTotal)
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

          uploadPromises.push(
            uploadFile(breakdownPdf, `${prefix}/formula-breakdown.pdf`, 'application/pdf')
              .then(url => { urls.formula_breakdown_pdf_url = url }),
            uploadFile(breakdownCsv, `${prefix}/formula-breakdown.csv`, 'text/csv')
              .then(url => { urls.formula_breakdown_csv_url = url })
          )
        }

        if (types.has('inci_summary')) {
          const { rows: summaryRows, total: summaryTotal, count: summaryCount } = transformInciSummary(bomItems)
          const summaryPdf = await generateInciSummaryPdf(meta, summaryRows, summaryTotal, summaryCount)
          const summaryCsvRows = [
            ...summaryRows.map((r) => [String(r.no), r.inciName, r.wtPercent.toFixed(6), r.function, r.casNo]),
            ['', 'Total', summaryTotal.toFixed(6), '', ''],
            ['', `Total INCI Components: ${summaryCount}`, '', '', ''],
          ]
          const summaryCsv = generateCsv(
            ['No.', 'INCI Name', 'WT %', 'Function', 'CAS No.'],
            summaryCsvRows
          )

          uploadPromises.push(
            uploadFile(summaryPdf, `${prefix}/inci-summary.pdf`, 'application/pdf')
              .then(url => { urls.inci_summary_pdf_url = url }),
            uploadFile(summaryCsv, `${prefix}/inci-summary.csv`, 'text/csv')
              .then(url => { urls.inci_summary_csv_url = url })
          )
        }

        await Promise.all(uploadPromises)

        if (Object.keys(urls).length > 0) {
          const { error: updateError } = await supabase
            .from('labdoc_products')
            .update({ ...urls, updated_at: new Date().toISOString() })
            .eq('product_code', productCode)

          if (updateError) {
            results.push({ productCode, success: false, error: `DB update failed: ${updateError.message}`, urls })
            continue
          }
        }

        results.push({ productCode, success: true, urls })
      } catch (err) {
        results.push({
          productCode,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    return NextResponse.json({
      success: successCount === results.length,
      total: results.length,
      successCount,
      failCount: results.length - successCount,
      results,
    })
  } catch (err) {
    console.error('batch generate-docs error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
