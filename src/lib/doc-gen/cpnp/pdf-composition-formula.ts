import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData } from '@/app/v2/pif/cpnp/types'

interface CompositionFormulaRow {
  no: string
  tradeName: string
  wtPercent: string
  inciName: string
  percentInRaw: string
  percentCalculated: string
  functionName: string
  casNumber: string
  remark: string
  isFirstOfGroup: boolean
}

function formatPercent(value: number | null | undefined, digits: number): string {
  if (value == null || Number.isNaN(value)) {
    return ''
  }
  return value.toFixed(digits)
}

export async function generateCompositionFormulaPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12

  doc.setFontSize(11)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 14, { align: 'center' })
  doc.setFontSize(16)
  doc.text('COMPOSITION FORMULA', pageWidth / 2, 23, { align: 'center' })

  const productName = data.product.english_name || data.product.korean_name || '—'
  doc.setFontSize(9)
  doc.text(`Product Name : ${productName}`, margin, 32)
  doc.text(`References : ${data.product.product_code}`, margin, 38)

  const rows: CompositionFormulaRow[] = []

  data.bom.forEach((bomItem, bomIndex) => {
    const components = [...bomItem.components].sort((a, b) => {
      const orderA = a.component_order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.component_order ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })

    const no = String(bomItem.sequence_no ?? bomIndex + 1)
    const wtPercent = formatPercent(bomItem.content_ratio, 5)

    if (components.length === 0) {
      rows.push({
        no,
        tradeName: bomItem.ingredient_name,
        wtPercent,
        inciName: '',
        percentInRaw: '',
        percentCalculated: '',
        functionName: '',
        casNumber: '',
        remark: '',
        isFirstOfGroup: true,
      })
      return
    }

    components.forEach((component, componentIndex) => {
      const compositionRatio = component.composition_ratio ?? 0
      const calculated = (bomItem.content_ratio * compositionRatio) / 100

      rows.push({
        no: componentIndex === 0 ? no : '',
        tradeName: componentIndex === 0 ? bomItem.ingredient_name : '',
        wtPercent: componentIndex === 0 ? wtPercent : '',
        inciName: component.inci_name_en || component.inci_name_kr || '',
        percentInRaw: formatPercent(component.composition_ratio, 2),
        percentCalculated: formatPercent(calculated, 5),
        functionName: component.function || '',
        casNumber: component.cas_number || '',
        remark: '',
        isFirstOfGroup: componentIndex === 0,
      })
    })
  })

  const totalWtPercent = data.bom.reduce((sum, item) => sum + item.content_ratio, 0)
  const body = [
    ...rows.map((row) => [
      row.no,
      row.tradeName,
      row.inciName,
      row.wtPercent,
      row.percentInRaw,
      row.percentCalculated,
      row.functionName,
      row.casNumber,
      row.remark,
    ]),
    ['', '', 'Total', formatPercent(totalWtPercent, 5), '', '', '', '', ''],
  ]

  autoTable(doc, {
    startY: 43,
    margin: { left: margin, right: margin },
    head: [[
      'No',
      'Trade Name',
      'INCI Name',
      'WT%',
      '% in Raw Material',
      '% Calculated',
      'Function',
      'CAS No',
      'Remark',
    ]],
    body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
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
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 36 },
      2: { cellWidth: 44 },
      3: { halign: 'right', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 20 },
      6: { cellWidth: 36 },
      7: { cellWidth: 24 },
      8: { cellWidth: 'auto' },
    },
    didParseCell(hookData) {
      if (hookData.section !== 'body') {
        return
      }

      const isTotalRow = hookData.row.index === rows.length
      if (isTotalRow) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 245]
      }

      const rowData = rows[hookData.row.index]
      if (rowData?.isFirstOfGroup && hookData.row.index > 0) {
        hookData.cell.styles.lineWidth = { top: 0.3, right: 0.1, bottom: 0.1, left: 0.1 }
      }
    },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150
  const footerHeight = 18
  const footerTop = Math.min(finalY + 10, pageHeight - footerHeight - 10)
  const sectionWidth = (pageWidth - margin * 2) / 3

  doc.setFontSize(9)
  ;['Prepared by', 'Reviewed by', 'Approved by'].forEach((label, index) => {
    const x = margin + sectionWidth * index
    doc.rect(x, footerTop, sectionWidth, footerHeight)
    doc.text(label, x + 3, footerTop + 5)
    doc.line(x + 3, footerTop + 13, x + sectionWidth - 3, footerTop + 13)
  })

  return doc.output('blob')
}
