import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpMltResult, CpnpProductData } from '@/app/v2/pif/cpnp/types'

type MltSpecRow = {
  testItem: string
  specification: string
  matchers: string[]
}

const MLT_SPEC_ROWS: MltSpecRow[] = [
  {
    testItem: 'Total Aerobic Microbial Count',
    specification: '≤ 1,000 CFU/g(ml)',
    matchers: ['total aerobic microbial count', 'tamc'],
  },
  {
    testItem: 'Total Combined Yeasts & Molds Count',
    specification: '≤ 100 CFU/g(ml)',
    matchers: ['total combined yeasts', 'tymc'],
  },
  {
    testItem: 'Escherichia Coli',
    specification: 'Not Detected in 1g(ml)',
    matchers: ['escherichia coli', 'e. coli'],
  },
  {
    testItem: 'Pseudomonas Aeruginosa',
    specification: 'Not Detected in 1g(ml)',
    matchers: ['pseudomonas aeruginosa', 'p. aeruginosa'],
  },
  {
    testItem: 'Staphylococcus Aureus',
    specification: 'Not Detected in 1g(ml)',
    matchers: ['staphylococcus aureus', 's. aureus'],
  },
  {
    testItem: 'Candida Albicans',
    specification: 'Not Detected in 1g(ml)',
    matchers: ['candida albicans', 'c. albicans'],
  },
]

function toText(value: string | null | undefined): string {
  return value?.trim() || '—'
}

function toIsoDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return value.slice(0, 10)
}

function findMltResult(results: CpnpMltResult[], matchers: string[]): CpnpMltResult | null {
  return (
    results.find((result) => {
      const normalized = result.test_item.trim().toLowerCase()
      return matchers.some((matcher) => normalized.includes(matcher))
    }) ?? null
  )
}

export async function generateMltPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const productName = data.product.english_name || data.product.korean_name || '—'
  const cert = data.mltCertificate
  const certResults = cert?.results ?? []

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(12)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 14, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(8)
  doc.text('35-5, Sandan-ro, Pyeongtaek-si, Gyeonggi-do, Korea', pageWidth / 2, 19, { align: 'center' })
  doc.text('Tel : +82-31-611-7252  Fax : +82-31-611-5764', pageWidth / 2, 24, { align: 'center' })

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, 28, pageWidth - margin, 28)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(15)
  doc.text('MICROBIAL LIMIT TEST REPORT', pageWidth / 2, 37, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${productName}`, margin, 46)
  doc.text(`Lot No. : ${toText(cert?.lot_no)}`, margin, 52)
  doc.text(`Test Start Date : ${toIsoDate(cert?.test_start_date || cert?.test_date)}`, margin, 58)
  doc.text(`Test End Date : ${toIsoDate(cert?.test_end_date || cert?.test_date)}`, margin, 64)
  doc.text(`Tester : ${toText(cert?.tester)}`, margin, 70)

  autoTable(doc, {
    startY: 76,
    margin: { left: margin, right: margin },
    head: [['Test Items', 'Specification', 'Result']],
    body: MLT_SPEC_ROWS.map((row) => {
      const found = findMltResult(certResults, row.matchers)
      return [row.testItem, row.specification, toText(found?.result)]
    }),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
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
      0: { cellWidth: 78 },
      1: { cellWidth: 56, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'center' },
    },
  })

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170
  const methodText =
    cert?.method || '(Test method : KFDA - Cosmetic microbial limits test methods and standards guidelines)'

  doc.setFontSize(8)
  doc.text(methodText, margin, finalY + 7)

  doc.setFontSize(9)
  doc.text(`Date of Decision : ${toIsoDate(cert?.judgment_date || cert?.test_end_date)}`, margin, finalY + 15)
  doc.text(`Final Decision : ${toText(cert?.overall_judgment || 'PASS')}`, margin, finalY + 21)

  doc.text('Approved By  _______________', pageWidth - margin - 72, finalY + 14)
  doc.text('Director R&D Center', pageWidth - margin - 72, finalY + 20)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth - margin - 72, finalY + 26)

  return doc.output('blob')
}
