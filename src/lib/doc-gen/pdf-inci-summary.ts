import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { InciSummaryRow, ProductMeta } from './types'

export async function generateInciSummaryPdf(
  meta: ProductMeta,
  rows: InciSummaryRow[],
  totalPercent: number,
  componentCount: number
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFontSize(14)
  doc.text('INCI INGREDIENT SUMMARY', pageWidth / 2, 22, { align: 'center' })
  doc.setFontSize(8)
  doc.text('Consolidated by INCI Name, Sorted by Weight %', pageWidth / 2, 28, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${meta.englishName || meta.koreanName || '—'}`, margin, 38)
  doc.text(`REFERENCES : ${meta.productCode}`, margin, 45)

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    head: [['No.', 'INCI Name', 'WT %', 'Function', 'CAS No.']],
    body: [
      ...rows.map((r) => [
        String(r.no),
        r.inciName,
        r.wtPercent.toFixed(6),
        r.function,
        r.casNo,
      ]),
      ['', 'Total', totalPercent.toFixed(6), '', ''],
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
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 24 },
      3: { cellWidth: 36 },
      4: { cellWidth: 30 },
    },
    didParseCell(data) {
      const isLastRow = data.row.index === rows.length
      if (isLastRow && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [245, 245, 245]
      }
    },
  })

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 150

  doc.setFontSize(9)
  doc.text(`Total INCI Components: ${componentCount}`, margin, finalY + 8)

  return doc.output('blob')
}
