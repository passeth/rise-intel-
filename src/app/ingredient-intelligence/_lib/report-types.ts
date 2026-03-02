/**
 * Report type definitions for Ingredient Intelligence Research Reports
 */

export interface ReportTypeConfig {
  id: string
  label: string
  labelKr: string
  icon: string
  description: string
  descriptionKr: string
  requiresSecondIngredient?: boolean
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'deep_dive',
    label: 'Deep Dive',
    labelKr: '심층 분석',
    icon: '🔬',
    description: 'Mechanism, clinical evidence, formulation considerations',
    descriptionKr: '메커니즘, 임상근거, 처방 고려사항 종합 리포트',
  },
  {
    id: 'efficacy',
    label: 'Efficacy',
    labelKr: '효능 분석',
    icon: '💊',
    description: 'Action mechanisms, efficacy categories, clinical data',
    descriptionKr: '작용기전, 효능 카테고리, 임상 데이터 분석',
  },
  {
    id: 'compatibility',
    label: 'Compatibility',
    labelKr: '호환성 체크',
    icon: '⚗️',
    description: 'Compatibility analysis with another ingredient',
    descriptionKr: '선택한 다른 성분과의 호환/비호환 분석',
    requiresSecondIngredient: true,
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    labelKr: '규제 풀체크',
    icon: '⚖️',
    description: 'Korea/EU/China/US/Japan regulatory full check',
    descriptionKr: '한국/EU/중국/미국/일본 규제 일괄 분석',
  },
  {
    id: 'stability',
    label: 'Stability',
    labelKr: '안정성 예측',
    icon: '🧪',
    description: 'Stability prediction and accelerated testing guide',
    descriptionKr: '안정성 예측, 가속 시험 설계 가이드',
  },
  {
    id: 'formulation',
    label: 'Formulation',
    labelKr: '처방 전략',
    icon: '🧴',
    description: 'Optimal vehicle, concentration, delivery system',
    descriptionKr: '최적 제형, 농도, 전달 시스템 추천',
  },
  {
    id: 'clinical',
    label: 'Clinical',
    labelKr: '임상 근거',
    icon: '📚',
    description: 'Literature-based clinical evidence collection',
    descriptionKr: '논문 기반 임상 근거 수집 및 분석',
  },
  {
    id: 'trend',
    label: 'Trend',
    labelKr: '트렌드',
    icon: '📈',
    description: 'Global usage trends and new applications',
    descriptionKr: '글로벌 사용 트렌드, 신규 응용 분석',
  },
]

export function getReportTypeConfig(reportType: string): ReportTypeConfig | undefined {
  return REPORT_TYPES.find((rt) => rt.id === reportType)
}

// DB report row type
export interface ResearchReport {
  id: string
  subject_type: string
  subject_identifier: string
  subject_name: string | null
  report_type: string
  report_title: string
  report_status: string
  report_content: Record<string, unknown>
  report_markdown: string | null
  report_summary: string | null
  model_used: string | null
  skills_used: string[] | null
  input_context: Record<string, unknown> | null
  token_usage: { input_tokens?: number; output_tokens?: number } | null
  generation_time_ms: number | null
  related_ingredients: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}
