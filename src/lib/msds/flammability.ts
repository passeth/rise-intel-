export type AlcoholRiskLevel = 'none' | 'caution' | 'flammable'

const ALCOHOL_NAME_PATTERNS = [
  /\bethanol\b/i,
  /\bethylic alcohol\b/i,
  /\balcohol denat\.?\b/i,
  /\bdenatured alcohol\b/i,
  /\bisopropyl alcohol\b/i,
  /\bisopropanol\b/i,
  /\bipa\b/i,
  /\bethyl alcohol\b/i,
  /에탄올/,
  /변성알코올/,
  /알코올\s*데나트/,
  /이소프로필\s*알코올/,
  /아이소프로필\s*알코올/,
]

export function isAlcoholComponentName(name: string | null | undefined): boolean {
  const normalizedName = name?.trim()
  if (!normalizedName) {
    return false
  }

  return ALCOHOL_NAME_PATTERNS.some((pattern) => pattern.test(normalizedName))
}

export function getAlcoholRiskLevel(alcoholPercent: number): AlcoholRiskLevel {
  if (!Number.isFinite(alcoholPercent) || alcoholPercent <= 0) {
    return 'none'
  }

  if (alcoholPercent >= 24) {
    return 'flammable'
  }

  return 'caution'
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
