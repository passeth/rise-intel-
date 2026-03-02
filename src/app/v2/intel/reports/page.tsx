import { PlaceholderPage } from '../../_components/placeholder-page'

export default function V2IntelReportsPage() {
  return (
    <PlaceholderPage
      title="Product Report"
      description="제품 단위 연구 보고서 조회 및 생성"
      features={[
        '리포트 목록 — 전체 아카이브 (필터: 타입, 성분, 일자)',
        '리포트 상세 — 마크다운 렌더링',
        '리포트 생성 — 제품 선택 → AI 분석 → 리포트',
        'PDF 내보내기 — jsPDF 기반',
        '통계 — 토큰 사용량, 생성 시간',
      ]}
    />
  )
}
