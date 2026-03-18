import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { BreakdownRow, ProductMeta } from './types'

export async function generateBreakdownPdf(
  meta: ProductMeta,
  rows: BreakdownRow[],
  totalCalculated: number
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFontSize(14)
  doc.text('FORMULA BREAKDOWN', pageWidth / 2, 22, { align: 'center' })
  doc.setFontSize(8)
  doc.text('Raw Material Component Analysis', pageWidth / 2, 28, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${meta.englishName || meta.koreanName || '—'}`, margin, 38)
  doc.text(`REFERENCES : ${meta.productCode}`, margin, 45)

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    head: [['No.', 'Raw Material', 'WT %', 'Component INCI Name', '% in Raw', '% Calculated']],
    body: [
      ...rows.map((r) => [
        r.isFirstOfGroup ? String(r.no) : '',
        r.isFirstOfGroup ? r.rawMaterial : '',
        r.isFirstOfGroup ? r.wtPercent.toFixed(5) : '',
        r.componentInci,
        r.ratioInRaw.toFixed(2),
        r.calculatedPercent.toFixed(5),
      ]),
      ['', '', '', '', 'Total Calculated', totalCalculated.toFixed(5)],
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
      1: { cellWidth: 42 },
      2: { halign: 'right', cellWidth: 22 },
      3: { cellWidth: 'auto' },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24 },
    },
    didParseCell(data) {
      if (data.section === 'body') {
        const isLastRow = data.row.index === rows.length
        if (isLastRow) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [245, 245, 245]
        }
        const rowData = rows[data.row.index]
        if (rowData?.isFirstOfGroup && data.row.index > 0) {
          data.cell.styles.lineWidth = { top: 0.3, right: 0.1, bottom: 0.1, left: 0.1 }
        }
      }
    },
  })

  return doc.output('blob')
}
