import { PlaceholderPage } from '../../_components/placeholder-page'

export default function V2IntelIngredientsPage() {
  return (
    <PlaceholderPage
      title="성분 인텔리전스"
      description="AI 기반 성분 분석 및 처방 설계"
      features={[
        '성분 데이터베이스 — INCI Name 통합 검색, 필터링',
        '성분 상세 분석 — 효능, 안전성, 시장 데이터',
        '처방 분석 — INCI 리스트 입력 → AI 종합 분석',
        'AI 리포트 생성 — Deep Dive, Efficacy, Clinical 등 8종',
      ]}
    />
  )
}
