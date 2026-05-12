export type AlcoholRiskLevel = 'non_flammable' | 'caution' | 'flammable'

export interface FlammabilityThresholds {
  cautionThreshold: number
  flammableThreshold: number
}

export const DEFAULT_FLAMMABILITY_THRESHOLDS: FlammabilityThresholds = {
  cautionThreshold: 1,
  flammableThreshold: 24,
}

const ALCOHOL_NAME_PATTERNS = [
  /\balcohol\b/i,
  /\bethanol\b/i,
  /\bethylic alcohol\b/i,
  /\balcohol denat\.?\b/i,
  /\bdenatured alcohol\b/i,
  /\bsd alcohol\b/i,
  /\bisopropyl alcohol\b/i,
  /\bisopropanol\b/i,
  /\bipa\b/i,
  /\bethyl alcohol\b/i,
  /\bpropanol\b/i,
  /\bn-propyl alcohol\b/i,
  /\bmethanol\b/i,
  /에탄올/,
  /변성알코올/,
  /알코올\s*데나트/,
  /이소프로필\s*알코올/,
  /아이소프로필\s*알코올/,
]

export function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function isAlcoholComponentName(name: string | null | undefined): boolean {
  const normalizedName = name?.trim()
  if (!normalizedName) {
    return false
  }

  return ALCOHOL_NAME_PATTERNS.some((pattern) => pattern.test(normalizedName))
}

export function normalizeIngredientCodeForMsds(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '')
  }
  return code
}

export function normalizeFlammabilityThresholds(
  input: Partial<FlammabilityThresholds> | null | undefined
): FlammabilityThresholds {
  const caution = parseNumericValue(input?.cautionThreshold)
  const flammable = parseNumericValue(input?.flammableThreshold)

  if (flammable <= caution || flammable <= 0) {
    return DEFAULT_FLAMMABILITY_THRESHOLDS
  }

  return {
    cautionThreshold: caution,
    flammableThreshold: flammable,
  }
}

export function getAlcoholRiskLevel(
  alcoholPercent: number,
  thresholds: FlammabilityThresholds = DEFAULT_FLAMMABILITY_THRESHOLDS
): AlcoholRiskLevel {
  if (!Number.isFinite(alcoholPercent) || alcoholPercent <= 0) {
    return 'non_flammable'
  }

  if (alcoholPercent >= thresholds.flammableThreshold) {
    return 'flammable'
  }

  if (alcoholPercent >= thresholds.cautionThreshold) {
    return 'caution'
  }

  return 'non_flammable'
}

export function getFlashPointText(riskLevel: AlcoholRiskLevel): string {
  if (riskLevel === 'flammable') {
    return 'Below 60°C (estimated, final product flash point verification required)'
  }

  if (riskLevel === 'caution') {
    return 'Above 60°C or not applicable under normal cosmetic use (estimated)'
  }

  return 'Not applicable'
}

export function isAlcoholRiskLevel(value: string | null | undefined): value is AlcoholRiskLevel {
  return value === 'non_flammable' || value === 'caution' || value === 'flammable'
}
