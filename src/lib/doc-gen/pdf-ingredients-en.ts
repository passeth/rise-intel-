import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { IngredientsEnRow, FragranceAllergenRow, ProductMeta } from './types'

export async function generateIngredientsEnPdf(
  meta: ProductMeta,
  rows: IngredientsEnRow[],
  allergens: FragranceAllergenRow[]
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFontSize(14)
  doc.text('FORMULA INGREDIENTS STATEMENT', pageWidth / 2, 22, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${meta.englishName || meta.koreanName || '—'}`, margin, 34)
  doc.text(
    `REFERENCES : ${meta.productCode}    ${meta.packagingUnit || ''}    ${meta.createdDate || ''}`,
    margin,
    41
  )

  const totalPercent = rows.reduce((sum, r) => sum + r.wtPercent, 0)

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin },
    head: [['NO.', 'Ingredient Name', '%(W/W)', 'Source', 'CAS No', 'Function']],
    body: [
      ...rows.map((r) => [
        String(r.no),
        r.ingredientName,
        r.wtPercent >= 99.99 ? 'To. 100' : r.wtPercent.toFixed(5),
        r.source,
        r.casNo,
        r.function,
      ]),
      ['', 'Total', totalPercent.toFixed(5), '', '', ''],
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
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 16 },
      4: { cellWidth: 28 },
      5: { cellWidth: 32 },
    },
    didParseCell(data) {
      const isLastRow = data.row.index === rows.length
      if (isLastRow && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [245, 245, 245]
      }
    },
  })

  if (allergens.length > 0) {
    const mainTableY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 150

    doc.setFontSize(10)
    doc.text('Fragrance Allergens Ingredients', margin, mainTableY + 10)

    autoTable(doc, {
      startY: mainTableY + 14,
      margin: { left: margin, right: margin },
      head: [['NO.', 'INCI Name', 'CAS No', '%(W/W)']],
      body: allergens.map((a) => [
        String(a.no),
        a.inciName,
        a.casNo,
        a.wtPercent.toFixed(5),
      ]),
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
        2: { cellWidth: 30 },
        3: { halign: 'right', cellWidth: 24 },
      },
    })
  }

  return doc.output('blob')
}
