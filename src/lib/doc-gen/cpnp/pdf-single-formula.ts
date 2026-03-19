import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData } from '@/app/v2/pif/cpnp/types'

interface MergedInciRow {
  inciName: string
  wtPercent: number
  function: string
  casNo: string
}

function normalizeInciName(name: string | null): string {
  return name?.trim() || 'Unknown'
}

function mergeInciByWeight(data: CpnpProductData): MergedInciRow[] {
  const mergedMap = new Map<string, MergedInciRow>()

  for (const bomItem of data.bom) {
    for (const component of bomItem.components) {
      const inciName = normalizeInciName(component.inci_name_en)
      const key = inciName.toLowerCase()
      const calculatedPercent = (bomItem.content_ratio * (component.composition_ratio ?? 0)) / 100

      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          inciName,
          wtPercent: calculatedPercent,
          function: component.function?.trim() || '',
          casNo: component.cas_number?.trim() || '',
        })
        continue
      }

      const current = mergedMap.get(key)
      if (current) {
        current.wtPercent += calculatedPercent
      }
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => b.wtPercent - a.wtPercent)
}

export async function generateSingleFormulaPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const mergedRows = mergeInciByWeight(data)
  const totalPercent = mergedRows.reduce((sum, row) => sum + row.wtPercent, 0)
  const productName = data.product.english_name || data.product.korean_name || '—'

  doc.setFontSize(11)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 16, { align: 'center' })

  doc.setFontSize(14)
  doc.text('SINGLE FORMULA (INCI)', pageWidth / 2, 24, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`Product Name : ${productName}`, margin, 34)
  doc.text(`References : ${data.product.product_code}`, margin, 41)

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin },
    head: [['No', 'INCI Name', 'WT%', 'Function', 'CAS No', 'Remark']],
    body: [
      ...mergedRows.map((row, index) => [
        String(index + 1),
        row.inciName,
        row.wtPercent.toFixed(6),
        row.function,
        row.casNo,
        '',
      ]),
      ['', 'Total', totalPercent.toFixed(6), '', '', ''],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [238, 238, 238],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 26 },
      5: { cellWidth: 22 },
    },
    didParseCell(hookData) {
      const isTotalRow = hookData.section === 'body' && hookData.row.index === mergedRows.length
      if (isTotalRow) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 245]
      }
    },
  })

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 200

  autoTable(doc, {
    startY: finalY + 12,
    margin: { left: margin, right: margin },
    head: [['Prepared by', 'Reviewed by', 'Approved by']],
    body: [['', '', '']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 6,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 60 },
    },
  })

  return doc.output('blob')
}
