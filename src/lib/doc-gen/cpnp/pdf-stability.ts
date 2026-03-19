import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellDef, RowInput } from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData, CpnpStabilityMeasurement } from '@/app/v2/pif/cpnp/types'

const CONDITIONS = ['4°C', '25°C / 60% RH', '45°C / 75% RH']
const PARAMETERS = ['Appearance', 'Color', 'Odour', 'pH', 'Viscosity']

function toText(value: string | null | undefined): string {
  return value?.trim() || '—'
}

function toIsoDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return value.slice(0, 10)
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function findMeasurement(
  measurements: CpnpStabilityMeasurement[],
  condition: string,
  parameter: string
): CpnpStabilityMeasurement | null {
  const normalizedCondition = normalize(condition)
  const normalizedParameter = normalize(parameter)

  return (
    measurements.find((measurement) => {
      const temp = normalize(measurement.temperature)
      const item = normalize(measurement.parameter)
      return temp.includes(normalizedCondition) && item.includes(normalizedParameter)
    }) ?? null
  )
}

function getRowBody(measurements: CpnpStabilityMeasurement[]): RowInput[] {
  const rows: RowInput[] = []

  for (const condition of CONDITIONS) {
    PARAMETERS.forEach((parameter, index) => {
      const found = findMeasurement(measurements, condition, parameter)

      const conditionCell: CellDef | string =
        index === 0
          ? {
              content: condition,
              rowSpan: PARAMETERS.length,
              styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                fillColor: [250, 250, 250],
              },
            }
          : ''

      rows.push([
        conditionCell,
        parameter,
        toText(found?.day_0),
        toText(found?.day_14),
        toText(found?.month_1),
        toText(found?.month_2),
        toText(found?.month_3),
      ])
    })
  }

  return rows
}

export async function generateStabilityPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  const productName = data.product.english_name || data.product.korean_name || '—'
  const cert = data.stabilityCertificate
  const rows = getRowBody(cert?.results ?? [])

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
  doc.text('3 MONTHS STABILITY TEST REPORT', pageWidth / 2, 37, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(9)
  doc.text(`PRODUCT NAME : ${productName}`, margin, 46)
  doc.text(`Lot No. : ${toText(cert?.lot_no)}`, margin, 52)
  doc.text(`Manufacturing Date : ${toIsoDate(cert?.manufacturing_date)}`, margin, 58)

  autoTable(doc, {
    startY: 64,
    margin: { left: margin, right: margin },
    head: [['Test Condition', 'Parameters', '0 day', '14 days', '1 month', '2 months', '3 months']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.8,
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
      0: { cellWidth: 34, halign: 'center' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 'auto', halign: 'center' },
    },
  })

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170

  doc.setFontSize(8)
  doc.text('Remark: A = No change, B = Slight change, C = Medium change, D = Significant change', margin, finalY + 7)

  const finalDecision = toText(cert?.overall_judgment)
  doc.setFontSize(9)
  doc.text(`Date of Decision : ${toIsoDate(cert?.judgment_date || cert?.test_date)}`, margin, finalY + 15)
  doc.text(`Final Decision : ${finalDecision}`, margin, finalY + 21)

  doc.text('Approved By  _______________', pageWidth - margin - 72, finalY + 14)
  doc.text('Director R&D Center', pageWidth - margin - 72, finalY + 20)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth - margin - 72, finalY + 26)

  return doc.output('blob')
}
