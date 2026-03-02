# RISE INTEL v2 — 메뉴 구조 및 페이지별 기능 정의

> 작성일: 2026-03-02
> 최종 수정: 2026-03-02 (PRD 기반 업데이트)
> 참조: `docs/PRD_V2.md`

---

## 설계 원칙

기존 v1은 기능 나열형 메뉴. v2는 **업무 흐름** 중심으로 재구성:

1. **PIF 중심** → 제품 라이프사이클 문서를 하나의 허브로 통합
2. **QC 통합** → 성적서, 정제수, 부자재 시험을 하나의 품질 그룹으로
3. **Lab Intel** → AI 기반 인텔리전스를 연구 지원 도구로 재편

---

## v1 → v2 메뉴 비교

| v1 (Current) | v2 (New) | 변경사항 |
|---|---|---|
| 제품표준서 > 제품 목록 | **PIF > 제품 리스트** | PIF로 승격, 문서 허브 통합 |
| 제품표준서 > 제품 생성/수정 | **PIF > 제품 등록** | UX 재설계 (개별 단계 리스팅) |
| _(없음)_ | **PIF > 제품 관리** | 🆕 일괄 관리 (상태, 브랜드) |
| 제품 > 문서 상세 (11종) | **PIF > 제품 상세** | 마스터-디테일 레이아웃 |
| 원료관리 > 원료 목록 | **원료관리 > 원료 리스트** | 유지 |
| 원료관리 > 원료입고 관리대장 | **원료관리 > 입고 관리대장** | 유지 |
| _(없음)_ | **원료관리 > 원료 문서 등록** | 🆕 Supabase Storage 업로드 |
| _(없음)_ | **원료관리 > 신규 원료 등록** | 🆕 원료 등록 워크플로우 |
| 시험성적서 | **QC > 성적서 발급** | QC 그룹으로 통합 |
| 정제수 관리 | **QC > 정제수 관리** | QC 그룹으로 통합 |
| _(없음)_ | **QC > 부자재 시험관리** | 🆕 purchases 기반 품질검사 |
| _(없음)_ | **Regulation** | 🆕 구조 예약 (기능 미정) |
| _(없음)_ | **신제품 개발** | 🆕 구조 예약 (기능 미정) |
| 성분 인텔리전스 | **Lab Intel > 성분 인텔리전스** | Lab Intel 그룹으로 이동 |
| _(없음)_ | **Lab Intel > Daily News** | 🆕 AI 뉴스 에이전트 |
| _(없음)_ | **Lab Intel > Product Report** | 🆕 제품 연구 보고서 아카이브 |

---

## v2 네비게이션 구조 (사이드바)

```
📊 대시보드                        /v2
📁 PIF
   ├─ 제품 리스트                  /v2/pif
   ├─ 제품 등록                    /v2/pif/new
   └─ 제품 관리                    /v2/pif/manage
🧪 원료관리
   ├─ 원료 리스트                  /v2/ingredients
   ├─ 입고 관리대장                /v2/ingredients/receipts
   ├─ 원료 문서 등록               /v2/ingredients/documents
   └─ 신규 원료 등록               /v2/ingredients/new
✅ QC
   ├─ 성적서 발급                  /v2/qc/certificates
   ├─ 정제수 관리                  /v2/qc/purified-water
   └─ 부자재 시험관리              /v2/qc/subsidiary-materials
⚖️ Regulation                     /v2/regulation
🚀 신제품 개발                     /v2/development
🧬 Lab Intel
   ├─ Daily News                   /v2/intel/news
   ├─ 성분 인텔리전스              /v2/intel/ingredients
   └─ Product Report               /v2/intel/reports
```

---

## 라우트 구조

```
src/app/v2/
├── page.tsx                                    # 대시보드
├── _components/
│   └── placeholder-page.tsx                    # 공통 플레이스홀더
├── pif/
│   ├── page.tsx                                # 제품 리스트
│   ├── new/page.tsx                            # 제품 등록
│   ├── manage/page.tsx                         # 제품 관리
│   └── [productCode]/
│       └── page.tsx                            # 제품 상세 (문서 허브)
├── ingredients/
│   ├── page.tsx                                # 원료 리스트
│   ├── new/page.tsx                            # 신규 원료 등록
│   ├── receipts/page.tsx                       # 입고 관리대장
│   └── documents/page.tsx                      # 원료 문서 등록
├── qc/
│   ├── certificates/page.tsx                   # 성적서 발급
│   ├── purified-water/page.tsx                 # 정제수 관리
│   └── subsidiary-materials/page.tsx           # 부자재 시험관리
├── regulation/
│   └── page.tsx                                # 규제 (미정)
├── development/
│   └── page.tsx                                # 신제품 개발 현황 (미정)
└── intel/
    ├── news/page.tsx                           # Daily News
    ├── ingredients/page.tsx                    # 성분 인텔리전스
    └── reports/page.tsx                        # Product Report
```

## 네비게이션 스위칭

사이드바 상단에 `Current` / `New` 탭으로 v1/v2 전환:
- 현재 경로가 `/v2/*`이면 자동으로 `New` 탭 활성화
- 탭 클릭 시 해당 버전의 홈으로 이동 (`/` 또는 `/v2`)

---

## 페이지별 상세 기능

> 각 모듈의 상세 기능 정의는 `docs/PRD_V2.md`를 참조하세요.
> 이 문서는 메뉴 구조와 라우트에 집중합니다.
