import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData } from '@/app/v2/pif/cpnp/types'

type SpecificationRow = {
  no: number
  testItem: string
  specification: string
  method: string
}

function toText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function getSpecificationRows(data: CpnpProductData): SpecificationRow[] {
  const englishRows = data.englishSpecs
    .map((spec, index) => ({
      no: index + 1,
      testItem: toText(spec.test_item),
      specification: toText(spec.specification),
      method: toText(spec.result),
    }))
    .filter((spec) => spec.testItem || spec.specification || spec.method)

  if (englishRows.length > 0) {
    return englishRows
  }

  const fallbackRows = data.qcSpecs
    .filter((spec) => {
      const hasEnglishField = Boolean(
        toText(spec.test_item_en) || toText(spec.specification_en) || toText(spec.test_method)
      )
      return spec.qc_type === '완제품' || hasEnglishField
    })
    .map((spec) => ({
      testItem: toText(spec.test_item_en),
      specification: toText(spec.specification_en),
      method: toText(spec.test_method),
    }))
    .filter((spec) => spec.testItem || spec.specification || spec.method)
    .map((spec, index) => ({
      no: index + 1,
      ...spec,
    }))

  return fallbackRows
}

export async function generateSpecificationPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const productName = data.product.english_name || data.product.korean_name || '—'
  const capacity = data.product.label_volume || '—'
  const specificationRows = getSpecificationRows(data)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(12)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 16, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(8)
  doc.text(
    '123, Gasan digital 1-ro, Geumcheon-gu, Seoul, Republic of Korea',
    pageWidth / 2,
    21,
    {
      align: 'center',
    }
  )
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, 25, pageWidth - margin, 25)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(14)
  doc.text('SPECIFICATION', pageWidth / 2, 34, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(9)
  doc.text('Manufacturer: EVAS Cosmetics Co., Ltd.', margin, 44)
  doc.text(`Product Name: ${productName}`, margin, 50)
  doc.text('Lot No.: ___________', margin, 56)
  doc.text('Date: ___________', margin, 62)
  doc.text(`Capacity: ${capacity}`, margin, 68)

  autoTable(doc, {
    startY: 74,
    margin: { left: margin, right: margin },
    head: [['No', 'Test Items', 'Specification', 'Method of Testing']],
    body:
      specificationRows.length > 0
        ? specificationRows.map((row) => [
            String(row.no),
            row.testItem || '—',
            row.specification || '—',
            row.method || '—',
          ])
        : [['1', '—', '—', '—']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [238, 238, 238],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 48 },
      2: { cellWidth: 58 },
      3: { cellWidth: 'auto' },
    },
  })

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200
  let footerStartY = Math.max(finalY + 12, 238)

  if (footerStartY > 270) {
    doc.addPage()
    footerStartY = 30
  }

  autoTable(doc, {
    startY: footerStartY,
    margin: { left: margin, right: margin },
    head: [['Prepared by', 'Reviewed by', 'Approved by']],
    body: [
      ['Signature: ___________', 'Signature: ___________', 'Signature: ___________'],
      ['Date: ___________', 'Date: ___________', 'Date: ___________'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
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
      0: { cellWidth: 'wrap' },
      1: { cellWidth: 'wrap' },
      2: { cellWidth: 'wrap' },
    },
  })

  return doc.output('blob')
}
