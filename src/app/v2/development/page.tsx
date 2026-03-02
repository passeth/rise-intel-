import { PlaceholderPage } from '../_components/placeholder-page'

export default function V2DevelopmentPage() {
  return (
    <PlaceholderPage
      title="신제품 개발 현황"
      description="개발 중인 제품의 연구 상황 대시보드 — 기능 미정"
      features={[
        '개발 파이프라인 보드 — 단계별 진행 현황',
        '프로젝트 카드 — 개발 제품별 상태, 담당자, 일정',
        '연구 노트 연결 — Lab Intel 리서치 리포트',
      ]}
    />
  )
}
