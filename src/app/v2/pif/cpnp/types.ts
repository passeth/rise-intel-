// Document type union
export type CpnpDocumentType =
  | 'composition_formula'
  | 'single_formula'
  | 'allergen_list'
  | 'specification'
  | 'coa'
  | 'msds'
  | 'pet'
  | 'stability'
  | 'mlt'

// Generation request
export interface CpnpGenerationRequest {
  productCodes: string[]
  documents: CpnpDocumentType[]
}

// Per-document result
export interface CpnpDocumentResult {
  type: CpnpDocumentType
  url?: string
  error?: string
}

// Per-product result
export interface CpnpProductResult {
  productCode: string
  productName: string
  documents: CpnpDocumentResult[]
}

// Generation response
export interface CpnpGenerationResponse {
  status: 'success' | 'partial' | 'error'
  results: CpnpProductResult[]
}

// Product data needed for CPNP generation
export interface CpnpProductData {
  product: {
    product_code: string
    korean_name: string | null
    english_name: string | null
    management_code: string | null
    label_volume: string | null
    fill_volume: string | null
    ph_standard: string | null
    viscosity_standard: string | null
    appearance: string | null
    cosmetic_type: string | null
    semi_product_code: string | null
    shelf_life: string | null
    storage_method: string | null
  }
  bom: CpnpBomItem[]
  qcSpecs: CpnpQcSpec[]
  englishSpecs: CpnpEnglishSpec[]
  allergenRegulations: CpnpAllergenRegulation[]
  fragranceAllergens: CpnpFragranceAllergen[]
  ingredientDocs: CpnpIngredientDoc[]
  inci: CpnpInci | null
}

// BOM item with ingredient components
export interface CpnpBomItem {
  ingredient_code: string
  ingredient_name: string
  content_ratio: number
  sequence_no: number
  components: CpnpIngredientComponent[]
}

export interface CpnpIngredientComponent {
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  function: string | null
  component_order: number | null
}

export interface CpnpQcSpec {
  test_item: string | null
  test_item_en: string | null
  specification: string | null
  specification_en: string | null
  test_method: string | null
  qc_type: string | null
  sequence_no: number | null
}

export interface CpnpEnglishSpec {
  test_item: string | null
  specification: string | null
  result: string | null
}

export interface CpnpAllergenRegulation {
  id: string
  allergen_name: string
  inci_name: string | null
  cas_no: string | null
  threshold_leave_on: number | null
  threshold_rinse_off: number | null
}

export interface CpnpFragranceAllergen {
  fragrance_code: string
  fragrance_name: string | null
  allergen_name: string
  cas_no: string | null
  content_in_fragrance: number | null
}

export interface CpnpIngredientDoc {
  ingredient_code: string
  ingredient_name: string | null
  coa_urls: string[] | null
  msds_en_urls: string[] | null
  composition_urls: string[] | null
  fragrance_urls: string[] | null
}

export interface CpnpInci {
  inci_ko: string | null
  inci_en: string | null
  inci_cpnp: string | null
}
