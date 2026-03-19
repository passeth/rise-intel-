import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type {
  CpnpAllergenRegulation,
  CpnpFragranceAllergen,
  CpnpProductData,
} from '@/app/v2/pif/cpnp/types'

type ProductType = 'Leave-on' | 'Rinse-off'

interface AllergenRow {
  no: number
  allergenName: string
  inciName: string
  casNo: string
  directUsePercent: number
  viaNaturalPercent: number
  totalPercent: number
  percentInFinalProduct: number
  threshold: number
  detected: boolean
}

const DEFAULT_THRESHOLD_LEAVE_ON = 0.001
const DEFAULT_THRESHOLD_RINSE_OFF = 0.01

function normalizeValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function allergenKey(allergenName: string | null | undefined, casNo: string | null | undefined): string {
  const name = normalizeValue(allergenName)
  const cas = normalizeValue(casNo)
  return `${name}::${cas}`
}

function inferProductType(cosmeticType: string | null | undefined): ProductType {
  const value = normalizeValue(cosmeticType)
  if (!value) {
    return 'Leave-on'
  }

  if (
    value.includes('rinse') ||
    value.includes('wash') ||
    value.includes('shampoo') ||
    value.includes('cleanser') ||
    value.includes('soap')
  ) {
    return 'Rinse-off'
  }

  return 'Leave-on'
}

function getThreshold(regulation: CpnpAllergenRegulation, productType: ProductType): number {
  if (productType === 'Rinse-off') {
    return regulation.threshold_rinse_off ?? DEFAULT_THRESHOLD_RINSE_OFF
  }

  return regulation.threshold_leave_on ?? DEFAULT_THRESHOLD_LEAVE_ON
}

function buildAllergenRows(
  allergenRegulations: CpnpAllergenRegulation[],
  fragranceAllergens: CpnpFragranceAllergen[],
  fragranceRatioMap: Map<string, number>,
  productType: ProductType
): AllergenRow[] {
  const viaNaturalByAllergen = new Map<string, number>()

  for (const fragranceAllergen of fragranceAllergens) {
    const fragranceCode = normalizeValue(fragranceAllergen.fragrance_code)
    if (!fragranceCode) {
      continue
    }

    const fragranceRatio = fragranceRatioMap.get(fragranceCode) ?? 0
    if (fragranceRatio <= 0) {
      continue
    }

    const contentInFragrance = fragranceAllergen.content_in_fragrance ?? 0
    if (contentInFragrance <= 0) {
      continue
    }

    const key = allergenKey(fragranceAllergen.allergen_name, fragranceAllergen.cas_no)
    const viaNaturalPercent = (fragranceRatio * contentInFragrance) / 100
    viaNaturalByAllergen.set(key, (viaNaturalByAllergen.get(key) ?? 0) + viaNaturalPercent)
  }

  return allergenRegulations.map((regulation, index) => {
    const key = allergenKey(regulation.allergen_name, regulation.cas_no)
    const directUsePercent = 0
    const viaNaturalPercent = viaNaturalByAllergen.get(key) ?? 0
    const totalPercent = directUsePercent + viaNaturalPercent
    const percentInFinalProduct = totalPercent
    const threshold = getThreshold(regulation, productType)
    const detected = percentInFinalProduct >= threshold

    return {
      no: index + 1,
      allergenName: regulation.allergen_name,
      inciName: regulation.inci_name ?? '-',
      casNo: regulation.cas_no ?? '-',
      directUsePercent,
      viaNaturalPercent,
      totalPercent,
      percentInFinalProduct,
      threshold,
      detected,
    }
  })
}

function formatPercent(value: number): string {
  return value.toFixed(6)
}

export async function generateAllergenListPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const productType = inferProductType(data.product.cosmetic_type)
  const thresholdText =
    productType === 'Rinse-off' ? 'rinse-off threshold 0.01%' : 'leave-on threshold 0.001%'

  const fragranceRatioMap = new Map<string, number>()
  for (const bomItem of data.bom) {
    const ingredientCode = normalizeValue(bomItem.ingredient_code)
    if (!ingredientCode) {
      continue
    }
    fragranceRatioMap.set(ingredientCode, (fragranceRatioMap.get(ingredientCode) ?? 0) + bomItem.content_ratio)
  }

  const rows = buildAllergenRows(
    data.allergenRegulations,
    data.fragranceAllergens,
    fragranceRatioMap,
    productType
  )

  const detectedCount = rows.filter((row) => row.detected).length
  const productName = data.product.english_name ?? data.product.korean_name ?? '-'

  doc.setFontSize(13)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(15)
  doc.text('ALLERGEN LIST (83 SCCNFP)', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`Product Name: ${productName}`, margin, 28)
  doc.text(`References: ${data.product.product_code}`, margin, 33)
  doc.text(`Product Type: ${productType}`, margin, 38)

  autoTable(doc, {
    startY: 42,
    margin: { left: margin, right: margin },
    head: [
      [
        'No',
        'Allergen Name',
        'INCI Name',
        'CAS No',
        'Direct Use (%)',
        'Via Natural Product (%)',
        'Total (%)',
        '% in Final Product',
        'Detected',
      ],
    ],
    body: rows.map((row) => [
      String(row.no),
      row.allergenName,
      row.inciName,
      row.casNo,
      formatPercent(row.directUsePercent),
      formatPercent(row.viaNaturalPercent),
      formatPercent(row.totalPercent),
      formatPercent(row.percentInFinalProduct),
      row.detected ? 'YES' : 'NO',
    ]),
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
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
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 43 },
      2: { cellWidth: 38 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 26, halign: 'right' },
      8: { cellWidth: 14, halign: 'center' },
    },
    didParseCell(hookData) {
      if (hookData.section !== 'body') {
        return
      }
      const rowData = rows[hookData.row.index]
      if (rowData?.detected) {
        hookData.cell.styles.fillColor = [255, 255, 230]
      }
    },
  })

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 42
  const summaryY = tableEndY + 8
  doc.setFontSize(9)
  doc.text(`Detected allergens: ${detectedCount} of 83 (above ${thresholdText})`, margin, summaryY)

  const footerY = summaryY + 12
  const boxWidth = 80
  const boxHeight = 12
  const gap = 8
  const totalWidth = boxWidth * 3 + gap * 2
  const startX = (pageWidth - totalWidth) / 2
  const labels = ['Prepared by', 'Reviewed by', 'Approved by']

  for (let i = 0; i < labels.length; i += 1) {
    const x = startX + i * (boxWidth + gap)
    doc.rect(x, footerY, boxWidth, boxHeight)
    doc.text(labels[i], x + boxWidth / 2, footerY + 8, { align: 'center' })
  }

  return doc.output('blob')
}
