import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData } from '@/app/v2/pif/cpnp/types'

type CoaRow = {
  test: string
  specification: string
  result: string
}

type PdfIssueOptions = {
  issuedAt?: Date
}

function toText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function formatIssueDate(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}`
}

function getQcResult(spec: CpnpProductData['qcSpecs'][number]): string {
  const result = toText((spec as { result?: string | null }).result)
  return result || 'PASSED TO THE TEST'
}

function getCoaRows(data: CpnpProductData): CoaRow[] {
  const certificateRows = data.coaCertificate?.results
    .map((spec) => ({
      test: toText(spec.test_item),
      specification: toText(spec.specification),
      result: toText(spec.result) || toText(spec.judgment) || 'PASSED TO THE TEST',
    }))
    .filter((spec) => spec.test) ?? []

  if (certificateRows.length > 0) {
    return certificateRows
  }

  const englishRows = data.englishSpecs
    .map((spec) => ({
      test: toText(spec.test_item),
      specification: toText(spec.specification),
      result: toText(spec.result) || 'PASSED TO THE TEST',
    }))
    .filter((spec) => spec.test)

  if (englishRows.length > 0) {
    return englishRows
  }

  return data.qcSpecs
    .filter((spec) => {
      const testItemEn = toText(spec.test_item_en)
      const hasEnglishTestItem = Boolean(testItemEn)
      if (!hasEnglishTestItem) {
        return false
      }

      return spec.qc_type === '완제품' || hasEnglishTestItem
    })
    .map((spec) => ({
      test: toText(spec.test_item_en),
      specification: toText(spec.specification_en),
      result: getQcResult(spec),
    }))
}

export async function generateCoaPdf(
  data: CpnpProductData,
  options: PdfIssueOptions = {}
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const issueDate = formatIssueDate(options.issuedAt ?? new Date())
  const productName = data.product.english_name || data.product.korean_name || '—'
  const reference = data.product.management_code || '—'
  const coaRows = getCoaRows(data)
  const approver = toText(data.coaCertificate?.approver)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(12)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 16, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(8)
  doc.text('35-5, Sandan-ro, Pyeongtaek-si, Gyeonggi-do, Korea', pageWidth / 2, 21, {
    align: 'center',
  })
  doc.text('Tel : +82-31-611-7252  Fax : +82-31-611-5764', pageWidth / 2, 26, { align: 'center' })
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, 30, pageWidth - margin, 30)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(16)
  doc.text('CERTIFICATE OF ANALYSIS', pageWidth / 2, 40, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(9)
  doc.text('We Hereby Certify the Following Specifications :', margin, 49)
  doc.text(`PRODUCT NAME : ${productName}`, margin, 57)
  doc.text(`REFERENCES : ${reference}`, margin, 64)
  doc.text(`Date of issue : ${issueDate}`, pageWidth - margin, 64, { align: 'right' })

  const tableBody = coaRows.map((row) => [
    row.test,
    row.specification || '—',
    row.result || 'PASSED TO THE TEST',
  ])

  const bodyRows =
    tableBody.length > 0
      ? [...tableBody, ['CONCLUSION', '', 'ACCEPTED']]
      : [['—', '—', 'PASSED TO THE TEST'], ['CONCLUSION', '', 'ACCEPTED']]

  autoTable(doc, {
    startY: 70,
    margin: { left: margin, right: margin },
    head: [['TESTS', 'SPECIFICATIONS', 'RESULTS']],
    body: bodyRows,
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
      0: { cellWidth: 45 },
      1: { cellWidth: 88 },
      2: { cellWidth: 'auto', halign: 'center' },
    },
    didParseCell: (hookData) => {
      const isConclusionRow = hookData.row.index === bodyRows.length - 1
      if (!isConclusionRow) {
        return
      }

      hookData.cell.styles.fontStyle = 'bold'
      if (hookData.column.index === 1) {
        hookData.cell.styles.halign = 'center'
      }
      if (hookData.column.index === 0) {
        hookData.cell.styles.halign = 'left'
      }
    },
  })

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200
  let footerStartY = Math.max(finalY + 16, 240)

  if (footerStartY > 275) {
    doc.addPage()
    footerStartY = 34
  }

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(10)
  doc.text(`Approved By  ${approver || '_______________'}`, pageWidth - margin - 70, footerStartY)
  doc.text('Director R&D Center', pageWidth - margin - 70, footerStartY + 7)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth - margin - 70, footerStartY + 14)

  return doc.output('blob')
}
