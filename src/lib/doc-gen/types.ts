export interface IngredientsEnRow {
  no: number
  ingredientName: string
  wtPercent: number
  source: string
  casNo: string
  function: string
}

export interface FragranceAllergenRow {
  no: number
  inciName: string
  casNo: string
  wtPercent: number
}

export interface BreakdownRow {
  no: number
  rawMaterial: string
  wtPercent: number
  componentInci: string
  ratioInRaw: number
  calculatedPercent: number
  isFirstOfGroup: boolean
  groupSize: number
}

export interface InciSummaryRow {
  no: number
  inciName: string
  wtPercent: number
  function: string
  casNo: string
}

export interface ProductMeta {
  productCode: string
  englishName: string
  koreanName: string
  packagingUnit?: string
  createdDate?: string
}

export interface DocUrls {
  ingredients_en_pdf_url?: string
  ingredients_en_csv_url?: string
  formula_breakdown_pdf_url?: string
  formula_breakdown_csv_url?: string
  inci_summary_pdf_url?: string
  inci_summary_csv_url?: string
}
