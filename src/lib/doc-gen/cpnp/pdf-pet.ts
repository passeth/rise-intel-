import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData, CpnpPetResult } from '@/app/v2/pif/cpnp/types'

type PetOrganismTemplate = {
  label: string
  atcc: string
  matchers: string[]
}

const ORGANISMS: PetOrganismTemplate[] = [
  {
    label: 'S. aureus',
    atcc: 'ATCC 6538',
    matchers: ['s. aureus', 'staphylococcus aureus'],
  },
  {
    label: 'P. aeruginosa',
    atcc: 'ATCC 9027',
    matchers: ['p. aeruginosa', 'pseudomonas aeruginosa'],
  },
  {
    label: 'E. coli',
    atcc: 'ATCC 8739',
    matchers: ['e. coli', 'escherichia coli'],
  },
  {
    label: 'C. albicans',
    atcc: 'ATCC 10231',
    matchers: ['c. albicans', 'candida albicans'],
  },
  {
    label: 'A. brasiliensis',
    atcc: 'ATCC 16404',
    matchers: ['a. brasiliensis', 'aspergillus brasiliensis'],
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

function findPetResult(results: CpnpPetResult[], matchers: string[]): CpnpPetResult | null {
  for (const result of results) {
    const source = result.organism.toLowerCase()
    if (matchers.some((matcher) => source.includes(matcher))) {
      return result
    }
  }
  return null
}

export async function generatePetPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const cert = data.petCertificate
  const productName = data.product.english_name || data.product.korean_name || '—'
  const criteria = cert?.criteria?.toUpperCase() === 'B' ? 'B' : 'A'
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
  doc.setFontSize(14)
  doc.text('PRESERVATIVE EFFICACY TEST REPORT', pageWidth / 2, 36, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(10)
  doc.text('(ISO 11930:2019)', pageWidth / 2, 42, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${productName}`, margin, 51)
  doc.text(`Lab No. : ${toText(cert?.lab_no)}`, margin, 57)
  doc.text(
    `Test Date : ${toIsoDate(cert?.test_start_date)} ~ ${toIsoDate(cert?.test_end_date || cert?.test_date)}`,
    margin,
    63
  )
  doc.text('Reference : ISO 11930:2019', margin, 69)
  doc.text(`Criteria : A ${criteria === 'A' ? '■' : '□'}   B ${criteria === 'B' ? '■' : '□'}`, margin, 75)

  autoTable(doc, {
    startY: 80,
    margin: { left: margin, right: margin },
    head: [['TYPE', 'Criteria', 'D7', 'D14', 'D28']],
    body: [
      ['Bacteria', 'A', '≥ 3 log reduction', '≥ 3 log reduction', 'NI'],
      ['Bacteria', 'B', '—', '≥ 3 log reduction', 'NI'],
      ['C. albicans', 'A', '—', '≥ 1 log reduction', 'NI'],
      ['C. albicans', 'B', '—', '—', 'NI'],
      ['A. brasiliensis', 'A', '—', '≥ 1 log reduction', 'NI'],
      ['A. brasiliensis', 'B', '—', '—', 'NI'],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [238, 238, 238],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 18 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 'auto' },
    },
  })

  const criteriaY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 106

  autoTable(doc, {
    startY: criteriaY + 6,
    margin: { left: margin, right: margin },
    head: [['Challenge Organism', 'Count (cfu/ml) D0', 'Log Reduction D7', 'D14', 'D28', 'Conclusion']],
    body: ORGANISMS.map((organism) => {
      const result = findPetResult(certResults, organism.matchers)
      return [
        `${organism.label} ${organism.atcc}`,
        toText(result?.initial_count),
        toText(result?.log_reduction_d7),
        toText(result?.log_reduction_d14),
        toText(result?.log_reduction_d28),
        toText(result?.conclusion),
      ]
    }),
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
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
      0: { cellWidth: 52 },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'center' },
    },
  })

  const resultsY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 180
  const finalDecision = toText(cert?.overall_judgment) === '—' ? '—' : toText(cert?.overall_judgment)

  doc.setFontSize(9)
  doc.text(`Date of Decision : ${toIsoDate(cert?.judgment_date || cert?.test_end_date)}`, margin, resultsY + 10)
  doc.text(`Final Decision : ${finalDecision}`, margin, resultsY + 16)

  doc.text('Approved By  _______________', pageWidth - margin - 72, resultsY + 8)
  doc.text('Director R&D Center', pageWidth - margin - 72, resultsY + 14)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth - margin - 72, resultsY + 20)

  return doc.output('blob')
}
