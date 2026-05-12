'use client'

import type {
  CpnpAllergenRegulation,
  CpnpDocumentType,
  CpnpMltResult,
  CpnpPetResult,
  CpnpProductData,
  CpnpStabilityMeasurement,
} from './types'
import {
  getAlcoholRiskLevel,
  getFlashPointText,
  isAlcoholComponentName,
  type AlcoholRiskLevel,
} from '@/lib/msds/flammability'

type DocumentPreviewProps = {
  type: CpnpDocumentType
  data: CpnpProductData
}

type PaperProps = {
  orientation?: 'portrait' | 'landscape'
  title: string
  children: React.ReactNode
}

type PreviewRow = {
  cells: React.ReactNode[]
  emphasis?: boolean
}

const COMPANY = 'EVAS Cosmetics Co., Ltd.'
const ADDRESS = '35-5, Sandan-ro, Pyeongtaek-si, Gyeonggi-do, Korea'
const CONTACT = 'Tel : +82-31-611-7252  Fax : +82-31-611-5764'

function text(value: string | null | undefined, fallback = '-'): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

function productName(data: CpnpProductData): string {
  return text(data.product.english_name || data.product.korean_name)
}

function formatPercent(value: number | null | undefined, digits = 5): string {
  if (value == null || Number.isNaN(value)) return ''
  return value.toFixed(digits)
}

function isoDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '-'
}

function issueDate(): string {
  const date = new Date()
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}`
}

function monthDate(): string {
  const date = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function Paper({ orientation = 'portrait', title, children }: PaperProps) {
  return (
    <article
      className={`mx-auto bg-white p-10 text-black shadow-xl ${
        orientation === 'landscape' ? 'w-[1123px] min-h-[794px]' : 'w-[794px] min-h-[1123px]'
      }`}
      style={{ fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif' }}
    >
      <header className="border-b border-black pb-3 text-center">
        <h2 className="text-[16px] font-bold">{COMPANY}</h2>
        <p className="mt-1 text-[11px]">{ADDRESS}</p>
        <p className="text-[11px]">{CONTACT}</p>
        <h1 className="mt-4 text-[22px] font-bold tracking-wide">{title}</h1>
      </header>
      <div className="pt-5 text-[12px]">{children}</div>
    </article>
  )
}

function FieldLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 leading-6">
      <span className="min-w-32 font-semibold">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function DocTable({ headers, rows }: { headers: string[]; rows: PreviewRow[] }) {
  return (
    <table className="mt-4 w-full border-collapse text-[11px]">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} className="border border-black bg-[#eeeeee] px-2 py-2 text-center font-bold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={row.emphasis ? 'bg-[#f5f5f5] font-bold' : undefined}>
            {row.cells.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-black px-2 py-1.5 align-middle">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ApprovalFooter() {
  return (
    <div className="mt-10 grid grid-cols-3 text-[12px]">
      {['Prepared by', 'Reviewed by', 'Approved by'].map((label) => (
        <div key={label} className="border border-black p-3">
          <p className="font-semibold">{label}</p>
          <div className="mt-8 border-t border-black pt-2">Signature</div>
        </div>
      ))}
    </div>
  )
}

function compositionRows(data: CpnpProductData): PreviewRow[] {
  const rows: PreviewRow[] = []

  data.bom.forEach((bomItem, bomIndex) => {
    const components = [...bomItem.components].sort(
      (a, b) => (a.component_order ?? Number.MAX_SAFE_INTEGER) - (b.component_order ?? Number.MAX_SAFE_INTEGER)
    )
    const no = String(bomItem.sequence_no ?? bomIndex + 1)
    const wtPercent = formatPercent(bomItem.content_ratio, 5)

    if (components.length === 0) {
      rows.push({
        cells: [no, bomItem.ingredient_name, '', wtPercent, '', '', '', '', ''],
      })
      return
    }

    components.forEach((component, componentIndex) => {
      const calculated = (bomItem.content_ratio * (component.composition_ratio ?? 0)) / 100
      rows.push({
        cells: [
          componentIndex === 0 ? no : '',
          componentIndex === 0 ? bomItem.ingredient_name : '',
          text(component.inci_name_en || component.inci_name_kr, ''),
          componentIndex === 0 ? wtPercent : '',
          formatPercent(component.composition_ratio, 2),
          formatPercent(calculated, 5),
          text(component.function, ''),
          text(component.cas_number, ''),
          '',
        ],
      })
    })
  })

  rows.push({
    emphasis: true,
    cells: ['', '', 'Total', formatPercent(data.bom.reduce((sum, item) => sum + item.content_ratio, 0), 5), '', '', '', '', ''],
  })

  return rows
}

function renderCompositionFormula(data: CpnpProductData) {
  return (
    <Paper orientation="landscape" title="COMPOSITION FORMULA">
      <FieldLine label="Product Name :" value={productName(data)} />
      <FieldLine label="References :" value={data.product.product_code} />
      <DocTable
        headers={['No', 'Trade Name', 'INCI Name', 'WT%', '% in Raw Material', '% Calculated', 'Function', 'CAS No', 'Remark']}
        rows={compositionRows(data)}
      />
      <ApprovalFooter />
    </Paper>
  )
}

function singleRows(data: CpnpProductData): PreviewRow[] {
  const merged = new Map<string, { inciName: string; wtPercent: number; functionName: string; casNo: string }>()

  for (const bomItem of data.bom) {
    for (const component of bomItem.components) {
      const inciName = text(component.inci_name_en, 'Unknown')
      const key = inciName.toLowerCase()
      const calculated = (bomItem.content_ratio * (component.composition_ratio ?? 0)) / 100
      const current = merged.get(key)

      if (current) {
        current.wtPercent += calculated
      } else {
        merged.set(key, {
          inciName,
          wtPercent: calculated,
          functionName: text(component.function, ''),
          casNo: text(component.cas_number, ''),
        })
      }
    }
  }

  const rows = Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent)
  const total = rows.reduce((sum, row) => sum + row.wtPercent, 0)

  return [
    ...rows.map((row, index) => ({
      cells: [String(index + 1), row.inciName, row.wtPercent.toFixed(6), row.functionName, row.casNo, ''],
    })),
    { emphasis: true, cells: ['', 'Total', total.toFixed(6), '', '', ''] },
  ]
}

function renderSingleFormula(data: CpnpProductData) {
  return (
    <Paper title="SINGLE FORMULA (INCI)">
      <FieldLine label="Product Name :" value={productName(data)} />
      <FieldLine label="References :" value={data.product.product_code} />
      <DocTable headers={['No', 'INCI Name', 'WT%', 'Function', 'CAS No', 'Remark']} rows={singleRows(data)} />
      <ApprovalFooter />
    </Paper>
  )
}

type ProductKind = 'Leave-on' | 'Rinse-off'

function inferProductType(cosmeticType: string | null | undefined): ProductKind {
  const value = normalize(cosmeticType)
  if (['rinse', 'wash', 'shampoo', 'cleanser', 'soap'].some((word) => value.includes(word))) {
    return 'Rinse-off'
  }
  return 'Leave-on'
}

function allergenKey(allergenName: string | null | undefined, casNo: string | null | undefined): string {
  return `${normalize(allergenName)}::${normalize(casNo)}`
}

function threshold(regulation: CpnpAllergenRegulation, productType: ProductKind): number {
  if (productType === 'Rinse-off') return regulation.threshold_rinse_off ?? 0.01
  return regulation.threshold_leave_on ?? 0.001
}

function allergenRows(data: CpnpProductData): PreviewRow[] {
  const productType = inferProductType(data.product.cosmetic_type)
  const fragranceRatioMap = new Map<string, number>()
  const viaNaturalByAllergen = new Map<string, number>()

  for (const bomItem of data.bom) {
    const key = normalize(bomItem.ingredient_code)
    fragranceRatioMap.set(key, (fragranceRatioMap.get(key) ?? 0) + bomItem.content_ratio)
  }

  for (const fragranceAllergen of data.fragranceAllergens) {
    const fragranceRatio = fragranceRatioMap.get(normalize(fragranceAllergen.fragrance_code)) ?? 0
    const content = fragranceAllergen.content_in_fragrance ?? 0
    const key = allergenKey(fragranceAllergen.allergen_name, fragranceAllergen.cas_no)
    viaNaturalByAllergen.set(key, (viaNaturalByAllergen.get(key) ?? 0) + (fragranceRatio * content) / 100)
  }

  return data.allergenRegulations.map((regulation, index) => {
    const viaNatural = viaNaturalByAllergen.get(allergenKey(regulation.allergen_name, regulation.cas_no)) ?? 0
    const limit = threshold(regulation, productType)

    return {
      cells: [
        String(index + 1),
        regulation.allergen_name,
        text(regulation.inci_name),
        text(regulation.cas_no),
        '0.000000',
        viaNatural.toFixed(6),
        viaNatural.toFixed(6),
        viaNatural.toFixed(6),
        viaNatural >= limit ? 'Detected' : 'Not Detected',
      ],
    }
  })
}

function renderAllergenList(data: CpnpProductData) {
  const productType = inferProductType(data.product.cosmetic_type)
  return (
    <Paper orientation="landscape" title="ALLERGEN LIST (83 SCCNFP)">
      <FieldLine label="Product Name:" value={productName(data)} />
      <FieldLine label="References:" value={data.product.product_code} />
      <FieldLine label="Product Type:" value={productType} />
      <DocTable
        headers={['No', 'Allergen Name', 'INCI Name', 'CAS No', 'Direct Use (%)', 'Via Natural Product (%)', 'Total (%)', '% in Final Product', 'Detected']}
        rows={allergenRows(data)}
      />
    </Paper>
  )
}

function specificationRows(data: CpnpProductData): PreviewRow[] {
  const englishRows = data.englishSpecs
    .map((spec, index) => ({
      cells: [String(index + 1), text(spec.test_item, ''), text(spec.specification, ''), text(spec.result, '')],
    }))
    .filter((row) => row.cells.some(Boolean))

  if (englishRows.length > 0) return englishRows

  return data.qcSpecs
    .filter((spec) => spec.qc_type === '완제품' || Boolean(text(spec.test_item_en, '') || text(spec.specification_en, '') || text(spec.test_method, '')))
    .map((spec, index) => ({
      cells: [String(index + 1), text(spec.test_item_en), text(spec.specification_en), text(spec.test_method)],
    }))
}

function renderSpecification(data: CpnpProductData) {
  return (
    <Paper title="SPECIFICATION">
      <FieldLine label="Manufacturer:" value={COMPANY} />
      <FieldLine label="Product Name:" value={productName(data)} />
      <FieldLine label="Lot No.:" value="___________" />
      <FieldLine label="Date:" value="___________" />
      <FieldLine label="Capacity:" value={text(data.product.label_volume)} />
      <DocTable headers={['No', 'Test Items', 'Specification', 'Method of Testing']} rows={specificationRows(data)} />
      <ApprovalFooter />
    </Paper>
  )
}

function coaRows(data: CpnpProductData): PreviewRow[] {
  const englishRows = data.englishSpecs
    .filter((spec) => text(spec.test_item, '').length > 0)
    .map((spec) => ({
      cells: [text(spec.test_item), text(spec.specification), text(spec.result, 'PASSED TO THE TEST')],
    }))

  const rows =
    englishRows.length > 0
      ? englishRows
      : data.qcSpecs
          .filter((spec) => text(spec.test_item_en, '').length > 0)
          .map((spec) => ({
            cells: [text(spec.test_item_en), text(spec.specification_en), 'PASSED TO THE TEST'],
          }))

  return [...rows, { emphasis: true, cells: ['CONCLUSION', '', 'ACCEPTED'] }]
}

function renderCoa(data: CpnpProductData) {
  return (
    <Paper title="CERTIFICATE OF ANALYSIS">
      <p className="mb-4">We Hereby Certify the Following Specifications :</p>
      <FieldLine label="PRODUCT NAME :" value={productName(data)} />
      <FieldLine label="REFERENCES :" value={text(data.product.management_code)} />
      <FieldLine label="Date of issue :" value={issueDate()} />
      <DocTable headers={['TESTS', 'SPECIFICATIONS', 'RESULTS']} rows={coaRows(data)} />
      <div className="ml-auto mt-12 w-72 text-[13px] leading-7">
        <p>Approved By _______________</p>
        <p>Director R&D Center</p>
        <p>{COMPANY}</p>
      </div>
    </Paper>
  )
}

function findSpec(data: CpnpProductData, englishKey: string): string {
  const key = englishKey.trim().toLowerCase()
  const englishSpec = data.englishSpecs.find((spec) => normalize(spec.test_item).includes(key))
  if (englishSpec?.specification) return englishSpec.specification

  const qcSpec = data.qcSpecs.find((spec) => normalize(spec.test_item_en).includes(key) || normalize(spec.test_item).includes(key))
  return text(qcSpec?.specification_en || qcSpec?.specification, '')
}

function alcoholContext(data: CpnpProductData): { alcoholPercent: number; riskLevel: AlcoholRiskLevel; flashPointText: string } {
  let alcoholPercent = 0

  for (const bomItem of data.bom) {
    for (const component of bomItem.components) {
      if (isAlcoholComponentName(component.inci_name_en || component.inci_name_kr)) {
        alcoholPercent += (bomItem.content_ratio * (component.composition_ratio ?? 0)) / 100
      }
    }
  }

  const rounded = Number(alcoholPercent.toFixed(2))
  const riskLevel = getAlcoholRiskLevel(rounded)
  return { alcoholPercent: rounded, riskLevel, flashPointText: getFlashPointText(riskLevel) }
}

function msdsIngredientRows(data: CpnpProductData): PreviewRow[] {
  const unique = new Map<string, PreviewRow>()

  for (const bomItem of data.bom) {
    for (const component of bomItem.components) {
      const inciName = text(component.inci_name_en || component.inci_name_kr, '')
      if (!inciName) continue
      const key = inciName.toLowerCase()
      if (!unique.has(key)) {
        unique.set(key, {
          cells: [inciName, text(component.cas_number), 'ICID', text(component.function)],
        })
      }
    }
  }

  return Array.from(unique.values())
}

function hazardText(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') return 'Flammable liquid and vapor. Keep away from heat, sparks, hot surfaces, and open flame.'
  if (riskLevel === 'caution') return 'May cause mild irritation. Keep away from direct heat and ignition sources.'
  return 'This product is not classified as hazardous under normal use conditions.'
}

function renderMsds(data: CpnpProductData) {
  const context = alcoholContext(data)
  const appearance = findSpec(data, 'appearance') || text(data.product.appearance, 'N/A')
  const fragrance = findSpec(data, 'odor') || findSpec(data, 'odour') || 'Same as Standard'
  const phText = findSpec(data, 'ph') || text(data.product.ph_standard, 'N/A')

  return (
    <Paper title="MATERIAL SAFETY DATA SHEET">
      <div className="mb-4 text-right text-[12px]">DATE : {monthDate()}</div>
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">1. IDENTITY OF PRODUCT AND COMPANY</h3>
      <FieldLine label="Finished Product Name :" value={productName(data)} />
      <FieldLine label="Company Name :" value={COMPANY} />
      <FieldLine label="Address :" value={ADDRESS} />
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">2. PRODUCT APPLICATION</h3>
      <p className="py-2">{text(data.product.cosmetic_type, 'Skin care cosmetics')}</p>
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">3. COMPOSITION AND INGREDIENTS</h3>
      <DocTable headers={['INCI Name', 'CAS No', 'Reference', 'Function']} rows={msdsIngredientRows(data)} />
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">4. PHYSICAL AND CHEMICAL PROPERTIES</h3>
      <FieldLine label="Appearance :" value={appearance} />
      <FieldLine label="Fragrance :" value={fragrance} />
      <FieldLine label="pH(25℃) :" value={phText} />
      <FieldLine label="Estimated Alcohol Content :" value={`${context.alcoholPercent.toFixed(2)}%`} />
      <FieldLine label="Flash Point (Estimate) :" value={context.flashPointText} />
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">5. HAZARD IDENTIFICATION</h3>
      <p className="py-2">{hazardText(context.riskLevel)}</p>
      <h3 className="mt-4 bg-slate-100 px-2 py-1 font-bold">6-16. SAFETY INFORMATION</h3>
      <p className="leading-6">
        First aid, fire-fighting, handling, storage, toxicological, ecological, disposal, transport, and regulatory
        information are prepared according to the estimated product risk level.
      </p>
    </Paper>
  )
}

const PET_ORGANISMS = [
  { label: 'S. aureus', atcc: 'ATCC 6538', matchers: ['s. aureus', 'staphylococcus aureus'] },
  { label: 'P. aeruginosa', atcc: 'ATCC 9027', matchers: ['p. aeruginosa', 'pseudomonas aeruginosa'] },
  { label: 'E. coli', atcc: 'ATCC 8739', matchers: ['e. coli', 'escherichia coli'] },
  { label: 'C. albicans', atcc: 'ATCC 10231', matchers: ['c. albicans', 'candida albicans'] },
  { label: 'A. brasiliensis', atcc: 'ATCC 16404', matchers: ['a. brasiliensis', 'aspergillus brasiliensis'] },
]

function findPetResult(results: CpnpPetResult[], matchers: string[]): CpnpPetResult | null {
  return results.find((result) => matchers.some((matcher) => normalize(result.organism).includes(matcher))) ?? null
}

function renderPet(data: CpnpProductData) {
  const cert = data.petCertificate
  const criteria = cert?.criteria?.toUpperCase() === 'B' ? 'B' : 'A'
  const resultRows = PET_ORGANISMS.map((organism) => {
    const result = findPetResult(cert?.results ?? [], organism.matchers)
    return {
      cells: [
        `${organism.label} ${organism.atcc}`,
        text(result?.initial_count),
        text(result?.log_reduction_d7),
        text(result?.log_reduction_d14),
        text(result?.log_reduction_d28),
        text(result?.conclusion),
      ],
    }
  })

  return (
    <Paper title="PRESERVATIVE EFFICACY TEST REPORT">
      <p className="mb-4 text-center">(ISO 11930:2019)</p>
      <FieldLine label="PRODUCT NAME :" value={productName(data)} />
      <FieldLine label="Lab No. :" value={text(cert?.lab_no)} />
      <FieldLine label="Test Date :" value={`${isoDate(cert?.test_start_date)} ~ ${isoDate(cert?.test_end_date || cert?.test_date)}`} />
      <FieldLine label="Reference :" value="ISO 11930:2019" />
      <FieldLine label="Criteria :" value={`A ${criteria === 'A' ? '■' : '□'}   B ${criteria === 'B' ? '■' : '□'}`} />
      <DocTable
        headers={['Challenge Organism', 'Count (cfu/ml) D0', 'Log Reduction D7', 'D14', 'D28', 'Conclusion']}
        rows={resultRows}
      />
      <FieldLine label="Date of Decision :" value={isoDate(cert?.judgment_date || cert?.test_end_date)} />
      <FieldLine label="Final Decision :" value={text(cert?.overall_judgment)} />
    </Paper>
  )
}

const STABILITY_CONDITIONS = ['4°C', '25°C / 60% RH', '45°C / 75% RH']
const STABILITY_PARAMETERS = ['Appearance', 'Color', 'Odour', 'pH', 'Viscosity']

function findMeasurement(measurements: CpnpStabilityMeasurement[], condition: string, parameter: string): CpnpStabilityMeasurement | null {
  return (
    measurements.find((measurement) => normalize(measurement.temperature).includes(normalize(condition)) && normalize(measurement.parameter).includes(normalize(parameter))) ?? null
  )
}

function renderStability(data: CpnpProductData) {
  const cert = data.stabilityCertificate
  const rows = STABILITY_CONDITIONS.flatMap((condition) =>
    STABILITY_PARAMETERS.map((parameter, index) => {
      const found = findMeasurement(cert?.results ?? [], condition, parameter)
      return {
        cells: [
          index === 0 ? condition : '',
          parameter,
          text(found?.day_0),
          text(found?.day_14),
          text(found?.month_1),
          text(found?.month_2),
          text(found?.month_3),
        ],
      }
    })
  )

  return (
    <Paper orientation="landscape" title="3 MONTHS STABILITY TEST REPORT">
      <FieldLine label="PRODUCT NAME :" value={productName(data)} />
      <FieldLine label="Lot No. :" value={text(cert?.lot_no)} />
      <FieldLine label="Manufacturing Date :" value={isoDate(cert?.manufacturing_date)} />
      <DocTable headers={['Test Condition', 'Parameters', '0 day', '14 days', '1 month', '2 months', '3 months']} rows={rows} />
      <p className="mt-4 text-[11px]">Remark: A = No change, B = Slight change, C = Medium change, D = Significant change</p>
      <FieldLine label="Date of Decision :" value={isoDate(cert?.judgment_date || cert?.test_date)} />
      <FieldLine label="Final Decision :" value={text(cert?.overall_judgment)} />
    </Paper>
  )
}

const MLT_ROWS = [
  { testItem: 'Total Aerobic Microbial Count', specification: '≤ 1,000 CFU/g(ml)', matchers: ['total aerobic microbial count', 'tamc'] },
  { testItem: 'Total Combined Yeasts & Molds Count', specification: '≤ 100 CFU/g(ml)', matchers: ['total combined yeasts', 'tymc'] },
  { testItem: 'Escherichia Coli', specification: 'Not Detected in 1g(ml)', matchers: ['escherichia coli', 'e. coli'] },
  { testItem: 'Pseudomonas Aeruginosa', specification: 'Not Detected in 1g(ml)', matchers: ['pseudomonas aeruginosa', 'p. aeruginosa'] },
  { testItem: 'Staphylococcus Aureus', specification: 'Not Detected in 1g(ml)', matchers: ['staphylococcus aureus', 's. aureus'] },
  { testItem: 'Candida Albicans', specification: 'Not Detected in 1g(ml)', matchers: ['candida albicans', 'c. albicans'] },
]

function findMltResult(results: CpnpMltResult[], matchers: string[]): CpnpMltResult | null {
  return results.find((result) => matchers.some((matcher) => normalize(result.test_item).includes(matcher))) ?? null
}

function renderMlt(data: CpnpProductData) {
  const cert = data.mltCertificate
  const rows = MLT_ROWS.map((row) => {
    const found = findMltResult(cert?.results ?? [], row.matchers)
    return { cells: [row.testItem, row.specification, text(found?.result)] }
  })

  return (
    <Paper title="MICROBIAL LIMIT TEST REPORT">
      <FieldLine label="PRODUCT NAME :" value={productName(data)} />
      <FieldLine label="Lot No. :" value={text(cert?.lot_no)} />
      <FieldLine label="Test Start Date :" value={isoDate(cert?.test_start_date || cert?.test_date)} />
      <FieldLine label="Test End Date :" value={isoDate(cert?.test_end_date || cert?.test_date)} />
      <FieldLine label="Tester :" value={text(cert?.tester)} />
      <DocTable headers={['Test Items', 'Specification', 'Result']} rows={rows} />
      <p className="mt-4 text-[11px]">
        {cert?.method || '(Test method : KFDA - Cosmetic microbial limits test methods and standards guidelines)'}
      </p>
      <FieldLine label="Date of Decision :" value={isoDate(cert?.judgment_date || cert?.test_end_date)} />
      <FieldLine label="Final Decision :" value={text(cert?.overall_judgment || 'PASS')} />
    </Paper>
  )
}

export function CpnpDocumentHtmlPreview({ type, data }: DocumentPreviewProps) {
  if (type === 'composition_formula') return renderCompositionFormula(data)
  if (type === 'single_formula') return renderSingleFormula(data)
  if (type === 'allergen_list') return renderAllergenList(data)
  if (type === 'specification') return renderSpecification(data)
  if (type === 'coa') return renderCoa(data)
  if (type === 'msds') return renderMsds(data)
  if (type === 'pet') return renderPet(data)
  if (type === 'stability') return renderStability(data)
  if (type === 'mlt') return renderMlt(data)

  return (
    <Paper title="DOCUMENT PREVIEW">
      <p>지원하지 않는 문서 유형입니다.</p>
    </Paper>
  )
}
