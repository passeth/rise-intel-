import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import type { CpnpProductData } from '@/app/v2/pif/cpnp/types'
import {
  getAlcoholRiskLevel,
  getFlashPointText,
  isAlcoholComponentName,
  type AlcoholRiskLevel,
} from '@/lib/msds/flammability'

type IngredientRow = {
  inciName: string
  casNo: string
  reference: string
  functionName: string
}

type MsdsContext = {
  alcoholPercent: number
  riskLevel: AlcoholRiskLevel
  flashPointText: string
  appearance: string
  fragrance: string
  phText: string
}

type SectionRenderer = {
  doc: jsPDF
  pageWidth: number
  margin: number
  y: number
}

const HEADER_COMPANY = 'EVAS Cosmetics Co., Ltd.'
const HEADER_ADDRESS = '35-5, Sandan-ro, Pyeongtaek-si, Gyeonggi-do, Korea'
const HEADER_CONTACT = 'Tel : +82-31-611-7252  Fax : +82-31-611-5764'

function toText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function drawHeader(doc: jsPDF, pageWidth: number, margin: number, dateText: string): number {
  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(12)
  doc.text(HEADER_COMPANY, pageWidth / 2, 14, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(8)
  doc.text(HEADER_ADDRESS, pageWidth / 2, 19, { align: 'center' })
  doc.text(HEADER_CONTACT, pageWidth / 2, 24, { align: 'center' })

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(margin, 28, pageWidth - margin, 28)

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(16)
  doc.text('MATERIAL SAFETY DATA SHEET', pageWidth / 2, 37, { align: 'center' })

  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(9)
  doc.text(`DATE : ${dateText}`, pageWidth - margin, 43, { align: 'right' })

  return 50
}

function drawSectionTitle(state: SectionRenderer, title: string): void {
  const { doc, margin, pageWidth } = state
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, state.y, pageWidth - margin * 2, 7, 'F')

  doc.setFont('NanumGothic', 'bold')
  doc.setFontSize(9)
  doc.text(title, margin + 2, state.y + 4.8)
  state.y += 9
}

function drawWrappedLine(state: SectionRenderer, text: string, indent = 0, lineHeight = 4.5): void {
  const { doc, margin, pageWidth } = state
  const maxWidth = pageWidth - margin * 2 - indent
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, margin + indent, state.y)
  state.y += lines.length * lineHeight
}

function drawBullet(state: SectionRenderer, title: string, content: string): void {
  const prefix = `• ${title} : `
  drawWrappedLine(state, `${prefix}${content}`, 1)
}

function getIngredients(data: CpnpProductData): IngredientRow[] {
  const unique = new Map<string, IngredientRow>()

  for (const bomItem of data.bom) {
    for (const component of bomItem.components) {
      const inciName = toText(component.inci_name_en || component.inci_name_kr)
      if (!inciName) {
        continue
      }

      const key = inciName.toLowerCase()
      if (unique.has(key)) {
        continue
      }

      unique.set(key, {
        inciName,
        casNo: toText(component.cas_number) || '-',
        reference: 'ICID',
        functionName: toText(component.function) || '-',
      })
    }
  }

  return Array.from(unique.values())
}

function findSpec(data: CpnpProductData, englishKey: string): string {
  const normalizedKey = englishKey.trim().toLowerCase()

  const englishSpec = data.englishSpecs.find((spec) =>
    toText(spec.test_item).trim().toLowerCase().includes(normalizedKey)
  )
  if (englishSpec?.specification) {
    return englishSpec.specification
  }

  const qcSpec = data.qcSpecs.find((spec) => {
    const keyEn = toText(spec.test_item_en).trim().toLowerCase()
    const keyKo = toText(spec.test_item).trim().toLowerCase()
    return keyEn.includes(normalizedKey) || keyKo.includes(normalizedKey)
  })

  return toText(qcSpec?.specification_en || qcSpec?.specification)
}

function calculateAlcoholContext(data: CpnpProductData): MsdsContext {
  let alcoholPercent = 0

  for (const bomItem of data.bom) {
    const contentRatio = bomItem.content_ratio
    for (const component of bomItem.components) {
      if (!isAlcoholComponentName(component.inci_name_en || component.inci_name_kr)) {
        continue
      }

      const compositionRatio = component.composition_ratio ?? 0
      if (compositionRatio <= 0) {
        continue
      }

      alcoholPercent += (contentRatio * compositionRatio) / 100
    }
  }

  const roundedAlcohol = Number(alcoholPercent.toFixed(2))
  const riskLevel = getAlcoholRiskLevel(roundedAlcohol)

  return {
    alcoholPercent: roundedAlcohol,
    riskLevel,
    flashPointText: getFlashPointText(riskLevel),
    appearance: findSpec(data, 'appearance') || data.product.appearance || 'N/A',
    fragrance: findSpec(data, 'odor') || findSpec(data, 'odour') || 'Same as Standard',
    phText: findSpec(data, 'ph') || data.product.ph_standard || 'N/A',
  }
}

function getHazardOverview(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') {
    return 'Flammable liquid and vapor. Keep away from heat, sparks, hot surfaces, and open flame.'
  }
  if (riskLevel === 'caution') {
    return 'May cause mild irritation. Keep away from direct heat and ignition sources.'
  }
  return 'This product is not classified as hazardous under normal use conditions.'
}

function getExplosionHazard(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') {
    return 'Vapors may form explosive mixtures with air in enclosed spaces.'
  }
  if (riskLevel === 'caution') {
    return 'No severe explosion risk expected, but avoid ignition sources during handling.'
  }
  return 'No applicable information found.'
}

function getStorageText(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') {
    return 'Store below 30°C in a cool, ventilated area away from ignition sources. Keep container tightly closed.'
  }
  if (riskLevel === 'caution') {
    return 'Store in a cool, dry, well-ventilated place. Avoid excessive heat and direct sunlight.'
  }
  return 'Store in a cool, dry place away from direct sunlight. Keep container tightly closed.'
}

function getTransportText(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') {
    return 'May be regulated as flammable liquid (Class 3) depending on local transport rules and final flash point verification.'
  }
  if (riskLevel === 'caution') {
    return 'Not normally classified as dangerous goods, but verify local requirements for alcohol-containing mixtures.'
  }
  return 'Not classified as dangerous goods for transport.'
}

function renderPage1(state: SectionRenderer, data: CpnpProductData, context: MsdsContext): void {
  const productName = data.product.english_name || data.product.korean_name || '—'
  const productType = data.product.cosmetic_type || 'Skin care cosmetics'
  const ingredients = getIngredients(data)

  drawSectionTitle(state, '1. IDENTITY OF PRODUCT AND COMPANY')
  state.doc.setFont('NanumGothic', 'normal')
  state.doc.setFontSize(8.5)
  drawWrappedLine(state, `Finished Product Name : ${productName}`)
  state.y += 1
  drawWrappedLine(state, 'Company Information:')
  drawBullet(state, 'Company Name', 'EVAS Cosmetics Co., Ltd.')
  drawBullet(state, 'Address', '35-5, Sandan-ro, Pyeongtaek-si, Gyeonggi-do, Korea')
  drawBullet(state, 'Telephone', '+82-31-611-7252')
  drawBullet(state, 'Fax', '+82-31-611-5764')
  state.y += 2

  drawSectionTitle(state, '2. PRODUCT APPLICATION')
  drawWrappedLine(state, productType)
  state.y += 2

  drawSectionTitle(state, '3. COMPOSITION AND INGREDIENTS')
  autoTable(state.doc, {
    startY: state.y,
    margin: { left: state.margin, right: state.margin },
    head: [['INCI Name', 'CAS No', 'Reference', 'Function']],
    body:
      ingredients.length > 0
        ? ingredients.map((item) => [item.inciName, item.casNo, item.reference, item.functionName])
        : [['—', '—', '—', '—']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
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
      0: { cellWidth: 72 },
      1: { cellWidth: 32 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
  })

  const tableEndY =
    (state.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? state.y + 30
  state.y = tableEndY + 4

  drawSectionTitle(state, '4. PHYSICAL AND CHEMICAL PROPERTIES')
  drawBullet(state, 'Appearance', context.appearance)
  drawBullet(state, 'Fragrance', context.fragrance)
  drawBullet(state, 'pH(25℃)', context.phText)
  drawBullet(state, 'Estimated Alcohol Content', `${context.alcoholPercent.toFixed(2)}%`)
  drawBullet(state, 'Flash Point (Estimate)', context.flashPointText)
}

function renderPage2(state: SectionRenderer, context: MsdsContext): void {
  drawSectionTitle(state, '5. HAZARD IDENTIFICATION')
  drawWrappedLine(state, 'EMERGENCY OVERVIEW :', 0)
  drawWrappedLine(state, getHazardOverview(context.riskLevel), 2)
  drawWrappedLine(state, `Estimated Alcohol Content : ${context.alcoholPercent.toFixed(2)}%`, 2)
  drawWrappedLine(state, 'POTENTIAL HEALTH EFFECTS :', 0)
  drawBullet(state, 'EYE', 'Exposure may cause mild eye irritation.')
  drawBullet(state, 'Skin', 'May cause irritation or sensitization in sensitive individuals.')
  drawBullet(state, 'Inhalation', 'May cause mild, transient respiratory irritation.')
  drawBullet(state, 'Ingestion', 'Product used as intended is not expected to cause gastrointestinal irritation.')
  state.y += 2

  drawSectionTitle(state, '6. FIRST AID MEASURES')
  drawBullet(state, 'Eye', 'Rinse with clean cold water for 15-20 minutes. If discomfort persists, contact a physician.')
  drawBullet(state, 'Skin Problem', 'Rinse with water. Discontinue use. If reaction worsens, contact a physician.')
  drawBullet(state, 'Inhalation', 'Remove individual to fresh air.')
  drawBullet(state, 'Ingestion', 'Dilute with fluids and treat symptomatically. Do not induce vomiting.')
  state.y += 2

  drawSectionTitle(state, '7. FIRE - FIGHTING MEASURES')
  drawBullet(state, 'Flash Point', context.flashPointText)
  drawBullet(state, 'Extinguishing Media', 'Use chemical foam, dry chemical, carbon dioxide or water.')
  drawBullet(state, 'Explosion Hazard', getExplosionHazard(context.riskLevel))
  state.y += 2

  drawSectionTitle(state, '8. ACCIDENTAL RELEASE MEASURES')
  drawBullet(state, 'Personal protection', 'Not required')
  drawBullet(state, 'Environmental protection', 'No special measures required')
}

function renderPage3(state: SectionRenderer, context: MsdsContext): void {
  drawSectionTitle(state, '9. HANDLING AND STORAGE')
  drawWrappedLine(state, getStorageText(context.riskLevel), 0)
  state.y += 2

  drawSectionTitle(state, '10. EXPOSURE CONTROLS / PERSONAL PROTECTION')
  drawWrappedLine(state, 'No special protective equipment required for normal consumer use.')
  state.y += 2

  drawSectionTitle(state, '11. STABILITY AND REACTIVITY')
  drawWrappedLine(state, 'Stability : Stable under normal conditions. Hazardous Polymerization : Will not occur.')
  state.y += 2

  drawSectionTitle(state, '12. TOXICOLOGICAL INFORMATION')
  drawWrappedLine(state, 'This product is not expected to produce any significant adverse health effects when used as intended.')
}

function renderPage4(state: SectionRenderer, context: MsdsContext): void {
  drawSectionTitle(state, '13. ECOLOGICAL INFORMATION')
  drawWrappedLine(state, 'No specific environmental data available. Dispose in accordance with local regulations.')
  state.y += 2

  drawSectionTitle(state, '14. DISPOSAL CONSIDERATIONS')
  drawWrappedLine(state, 'Dispose of contents/container in accordance with local/regional/national/international regulations.')
  state.y += 2

  drawSectionTitle(state, '15. TRANSPORT INFORMATION')
  drawWrappedLine(state, getTransportText(context.riskLevel))
  state.y += 2

  drawSectionTitle(state, '16. REGULATORY INFORMATION')
  drawWrappedLine(state, 'This product complies with all applicable cosmetic regulations in the country of sale.')
}

function drawApprovalFooter(doc: jsPDF, pageWidth: number, margin: number): void {
  const footerY = 257
  doc.setFont('NanumGothic', 'normal')
  doc.setFontSize(10)
  doc.text('Approved By  _______________', pageWidth - margin - 72, footerY)
  doc.text('Director R&D Center', pageWidth - margin - 72, footerY + 7)
  doc.text('EVAS Cosmetics Co., Ltd.', pageWidth - margin - 72, footerY + 14)
}

export async function generateMsdsPdf(data: CpnpProductData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const dateText = formatDate(new Date())
  const context = calculateAlcoholContext(data)

  let state: SectionRenderer = {
    doc,
    pageWidth,
    margin,
    y: drawHeader(doc, pageWidth, margin, dateText),
  }
  renderPage1(state, data, context)

  doc.addPage()
  state = {
    doc,
    pageWidth,
    margin,
    y: drawHeader(doc, pageWidth, margin, dateText),
  }
  renderPage2(state, context)

  doc.addPage()
  state = {
    doc,
    pageWidth,
    margin,
    y: drawHeader(doc, pageWidth, margin, dateText),
  }
  renderPage3(state, context)

  doc.addPage()
  state = {
    doc,
    pageWidth,
    margin,
    y: drawHeader(doc, pageWidth, margin, dateText),
  }
  renderPage4(state, context)
  drawApprovalFooter(doc, pageWidth, margin)

  return doc.output('blob')
}
