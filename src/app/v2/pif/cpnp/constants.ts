import { FileText, Shield, FlaskConical, ClipboardList, type LucideIcon } from 'lucide-react'
import type { CpnpDocumentType } from './types'

export interface CpnpDocumentTypeInfo {
  type: CpnpDocumentType
  label: string
  labelEn: string
  icon: LucideIcon
  description: string
  autoGeneratable: boolean
  category: 'generate' | 'collect'
}

export const CPNP_DOCUMENT_TYPES: CpnpDocumentTypeInfo[] = [
  {
    type: 'composition_formula',
    label: '복합전성분표',
    labelEn: 'Composition Formula',
    icon: FileText,
    description: '원료별 INCI 성분 상세 (복합)',
    autoGeneratable: true,
    category: 'generate',
  },
  {
    type: 'single_formula',
    label: '싱글전성분표',
    labelEn: 'Single Formula',
    icon: FileText,
    description: 'INCI 통합 전성분 (싱글)',
    autoGeneratable: true,
    category: 'generate',
  },
  {
    type: 'allergen_list',
    label: '알러젠 리스트',
    labelEn: 'Allergen List (83)',
    icon: Shield,
    description: 'EU 83항목 알러젠 분석',
    autoGeneratable: true,
    category: 'generate',
  },
  {
    type: 'specification',
    label: 'SPECIFICATION',
    labelEn: 'Specification',
    icon: ClipboardList,
    description: '완제품 시험규격서 (영문)',
    autoGeneratable: true,
    category: 'generate',
  },
  {
    type: 'coa',
    label: '완제품 COA',
    labelEn: 'Certificate of Analysis',
    icon: FileText,
    description: '완제품 시험성적서 (영문)',
    autoGeneratable: true,
    category: 'generate',
  },
  {
    type: 'msds',
    label: '완제품 MSDS',
    labelEn: 'Material Safety Data Sheet',
    icon: Shield,
    description: '물질안전보건자료 (영문)',
    autoGeneratable: false,
    category: 'generate',
  },
  {
    type: 'pet',
    label: 'Challenge Test (PET)',
    labelEn: 'Preservative Efficacy Test',
    icon: FlaskConical,
    description: '방부력 시험 (ISO 11930)',
    autoGeneratable: false,
    category: 'generate',
  },
  {
    type: 'stability',
    label: 'Stability Test',
    labelEn: 'Stability Test',
    icon: FlaskConical,
    description: '안정성 시험 (3개월)',
    autoGeneratable: false,
    category: 'generate',
  },
  {
    type: 'mlt',
    label: '미생물 테스트 (MLT)',
    labelEn: 'Microbial Limit Test',
    icon: FlaskConical,
    description: '미생물한도시험',
    autoGeneratable: false,
    category: 'generate',
  },
]

export const CPNP_AUTO_GENERATABLE_TYPES = CPNP_DOCUMENT_TYPES.filter(
  (d) => d.autoGeneratable
)
