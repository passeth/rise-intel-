# RISE INTEL v2 — Product Requirements Document

> **작성일**: 2026-03-02
> **상태**: Draft v1
> **기반**: 사용자 기능 명세 + 코드베이스 분석 + DB 스키마 매핑

---

## 1. 개요

### 1.1 비전

RISE INTEL v2는 화장품 R&D 전주기를 커버하는 통합 연구 플랫폼으로, **제품 정보 파일(PIF) 관리**, **원료 관리**, **품질 관리(QC)**, **규제 시스템**, **신제품 개발 현황**, **AI 기반 연구 인텔리전스**를 하나의 시스템에서 제공한다.

### 1.2 설계 원칙

| 원칙 | 설명 |
|---|---|
| **기존 활용** | v1에서 검증된 로직과 문서 포맷을 최대한 재활용 |
| **UX 재설계** | 메뉴 구성과 사용자 흐름을 업무 중심으로 재편 |
| **완전 분리** | `/v2/*` 라우트 그룹으로 v1과 독립 운영 |
| **점진적 확장** | 미정 기능(Regulation, 신제품 개발)은 구조만 잡고 추후 확정 |

### 1.3 기술 스택

기존 스택 유지: Next.js 16 (App Router) + Supabase + shadcn/ui + Tailwind v4 + TanStack Query + Claude AI + jsPDF

---

## 2. 모듈 구조

```
RISE INTEL v2
├── 📊 대시보드
├── 📁 PIF (Product Information File)
│   ├── 제품 리스트
│   ├── 제품 상세 (문서 허브)
│   ├── 제품 등록
│   └── 제품 관리
├── 🧪 원료관리
│   ├── 원료 리스트
│   ├── 입고 관리대장
│   ├── 원료 문서 등록
│   └── 신규 원료 등록
├── ✅ QC (Quality Control)
│   ├── 성적서 발급
│   ├── 정제수 관리
│   └── 부자재 시험관리
├── ⚖️ Regulation
│   └── (기능 미정 — 구조만 예약)
├── 🚀 신제품 개발 현황
│   └── (기능 미정 — 구조만 예약)
└── 🧬 Lab Intel
    ├── Daily News
    ├── 성분 인텔리전스
    └── Product Report
```

---

## 3. PIF (Product Information File)

> 제품의 전체 라이프사이클 문서를 관리하는 핵심 모듈.
> 기존 v1의 `products/` + `products/[productCode]/docs/` 기능을 통합·확장.

### 3.1 제품 리스트 (`/v2/pif`)

제품 목록 조회 및 빠른 탐색.

| 항목 | 설명 | 기존 활용 |
|---|---|---|
| 제품코드 | 제품 고유 식별자 | `labdoc_products.product_code` |
| 관리번호 | 내부 관리 번호 (자동 발급) | `labdoc_products.management_code` |
| 제품명 국문 | 한글 제품명 | `labdoc_products.korean_name` |
| 제품명 영문 | 영문 제품명 | `labdoc_products.english_name` |
| 표시용량 | 제품 용량 표기 | `labdoc_products.display_volume` |
| 상태 | 활성/비활성 | **🆕 신규 컬럼 필요** |
| 브랜드 | 브랜드 분류 | **🆕 신규 컬럼 필요** |

**기능:**
- 검색: 제품코드, 관리번호, 제품명으로 검색
- 정렬: 각 컬럼별 정렬
- 클릭 → 제품 상세 페이지로 이동

**기존 구현 참조:** `src/app/products/actions.ts` (fetchProducts, updateProduct)

---

### 3.2 제품 상세 (`/v2/pif/[productCode]`)

제품 이미지 + 개요 + 문서 리스트를 좌측에, 선택한 문서를 우측에 표시하는 **마스터-디테일** 레이아웃.

#### 3.2.1 좌측 패널: 제품 개요

| 요소 | 설명 | 데이터 소스 |
|---|---|---|
| 제품 이미지 | 제품 사진 갤러리 | `product_images` |
| 제품 기본정보 | 코드, 명칭, 유형, 용량 | `labdoc_products` |
| 문서 리스트 | 관리문서 10종 + 추가 섹션 버튼 | — |

#### 3.2.2 관리문서 10종

각 문서는 **생성일/최종수정일**을 표기하고, 클릭 시 우측에 문서 포맷을 표시.

| # | 문서명 | 기능 | 기존 구현 | 데이터 소스 |
|---|---|---|---|---|
| 1 | **제품표준서** | 조회/수정/발급 | ✅ `docs/standard/page.tsx` | `labdoc_products`, `labdoc_product_revisions` |
| 2 | **국문 성분표** | 조회/발급 | ✅ `docs/ingredients/ko/page.tsx` | `bom_master`, `labdoc_ingredient_components` |
| 3 | **영문 성분표** | 조회/발급, **Function 매칭 (AI Intel)** | ✅ `docs/ingredients/en/page.tsx` — 🆕 Function 매칭 추가 필요 | `bom_master`, `labdoc_ingredient_components`, `lab_inci_matches` |
| 4 | **브레이크다운** | 조회/발급 | ✅ `docs/ingredients/breakdown/page.tsx` | `bom_master`, `labdoc_ingredient_components` |
| 5 | **INCI 합산** | 조회/발급, **Function 매칭 (AI Intel)** | ✅ `docs/ingredients/summary/page.tsx` — 🆕 Function 매칭 추가 필요 | `labdoc_product_inci`, `lab_inci_matches` |
| 6 | **영문 성적서** | 조회/발급 | ✅ `docs/specs/en/page.tsx` | `labdoc_product_qc_specs` |
| 7 | **반제품 기준** | 조회/수정/발급 | ✅ `docs/specs/semi/page.tsx` | `labdoc_product_qc_specs` (qc_type='반제품') |
| 8 | **완제품 기준** | 조회/수정/발급 | ✅ `docs/specs/final/page.tsx` | `labdoc_product_qc_specs` (qc_type='완제품') |
| 9 | **MSDS** | 조회/수정/발급 | ✅ `docs/msds/page.tsx` | `labdoc_products`, `labdoc_product_qc_specs`, `labdoc_ingredient_components` |
| 10 | **제조공정 기록서** | 조회/수정/발급 | ✅ `docs/manufacturing-process/page.tsx` | `labdoc_manufacturing_processes`, `labdoc_manufacturing_process_steps` |

> **Function 매칭 (AI Intel)**: 영문 성분표와 INCI 합산에서 각 성분의 CosIng Function을 AI가 자동 매칭하는 기능. `lab_inci_matches` 테이블의 데이터 + Claude AI 추론 활용.

**멀티셀렉 일괄 PDF 발급:**
- 문서 리스트에서 체크박스로 여러 문서 선택
- "일괄 발급" 버튼 → 최신 버전 기준 PDF 묶음 다운로드
- 기존 `window.print()` 방식에서 **jsPDF 서버사이드** 생성으로 전환 필요

**발급 내역 트래킹:**
- 각 문서의 발급 기록 (일시, 발급자, 버전)
- **🆕 신규 테이블**: `labdoc_document_issuance_log` (product_code, doc_type, issued_at, issued_by, version)

#### 3.2.3 생산입고 내역

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 연결 반제품 LOT 생성 | 반제품 코드 기반 LOT 번호 발급 | `labdoc_products.semi_product_code` → **🆕 lot 관리 테이블** |
| 제품 입고 생산 내역 | 생산 이력 조회 | **🆕 신규 테이블 or MES 연동** |

> ⚠️ 이 섹션은 MES 시스템과의 데이터 연동 범위 확정이 필요함.

#### 3.2.4 표준작업 명세서

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 소요 부자재 리스트 | 라벨, 박스, 용기 등 | `labdoc_product_subsidiary_materials` |
| 스펙 관리 | 부자재별 규격, 업체, 수량 | `labdoc_product_subsidiary_materials` |

**기존 구현 참조:** `labdoc_product_subsidiary_materials` 테이블 + `labdoc_product_work_specs` 테이블이 이미 존재. 제품 생성 wizard의 Step 6, 7에서 데이터 입력 UI 구현됨.

#### 3.2.5 디자인 아트웍

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 부자재 입고 내역 | 입고된 부자재 목록 | `purchases` 테이블 |
| Dropbox 연결 | 디자인 파일 조회/다운로드/업로드 | `dropbox_folder_path`, `dropbox_shared_link` |
| 아트웍 검수 내역 | 디자인 수정 요청 및 이력 | `purchases.artwork_revision_requests` (JSONB) |

> DB에 `purchases` 뷰와 `artwork_revision_requests` JSONB 컬럼이 이미 존재.
> `.env.local`에 `DROPBOX_ACCESS_TOKEN`, `DROPBOX_BASE_FOLDER` 설정됨.
> 🆕 Dropbox API 연동 UI 신규 구현 필요.

---

### 3.3 제품 등록 (`/v2/pif/new`)

새 제품을 등록하고 BOM 기반으로 문서를 자동 생성.

| 단계 | 설명 | 기존 구현 | 변경사항 |
|---|---|---|---|
| 관리번호 자동 발급 | 순번 기반 자동 생성 | ✅ `products/new/actions.ts` | 유지 |
| 기본정보 입력 | 제품코드, 명칭, 유형, 용량 등 | ✅ Step 1 | 유지 |
| 반제품/P제품 연결 | 반제품·P제품 코드 매칭 | ✅ Step 1 (semi/p_product_code) | 유지 |
| BOM 기반 문서 자동 생성 | BOM → 성분표, INCI, 브레이크다운 등 | ✅ Step 2~8 | **🆕 UX 변경 (아래 참조)** |
| 전성분 순서 수정 | INCI 리스트 드래그앤드롭 정렬 | ✅ `inci/InciModal` | 유지 |
| 시험성적서 기준 지정 | 모듈형 조합 (시험항목 선택 조합) | ✅ Step 3~4 | **🆕 모듈형 조합 UI** |
| 제조공정 등록 | **개별 단계 리스팅** (step별 X) | ✅ Step 8 (step별) | **🆕 개별 단계 리스팅으로 변경** |

**핵심 UX 변경 — 제조공정 등록:**
> 기존 v1은 step_num 순서대로 단계를 추가하는 wizard 방식.
> v2는 **개별 단계를 독립적으로 리스팅**하는 방식으로 변경.
> → 각 단계를 카드 형태로 나열, 순서 변경은 드래그앤드롭, 단계 추가/삭제 자유.

**시험성적서 모듈형 조합:**
> 기존 v1은 시험항목을 하나씩 추가하는 방식.
> v2는 **미리 정의된 시험항목 모듈**(예: 기본물성, 미생물, 중금속)을 조합하여 빠르게 구성.
> → `labdoc_test_specs` 또는 **🆕 시험항목 템플릿 테이블** 활용.

---

### 3.4 제품 관리 (`/v2/pif/manage`)

제품 일괄 관리 기능.

| 기능 | 설명 | 구현 방식 |
|---|---|---|
| 활성/비활성 토글 | 멀티셀렉 후 일괄 상태 변경 | **🆕** `labdoc_products.is_active` 컬럼 추가 |
| 브랜드 매칭 | 멀티셀렉 후 브랜드 일괄 지정 | **🆕** `labdoc_products.brand` 컬럼 추가 |
| 완제품-P제품-반제품 매칭 | 3단 계층 연결 관리 | 기존 `p_product_code`, `semi_product_code` 활용 |
| 표준서 작성일/작성자 | 이력 표시 | `labdoc_product_revisions` 활용 |

---

## 4. 원료관리

> 원료의 전체 라이프사이클 관리: 등록 → 입고 → 문서 → QC
> 기존 v1의 `ingredients/` 기능을 확장.

### 4.1 원료 리스트 (`/v2/ingredients`)

**기존 활용**: `src/app/ingredients/` 페이지 로직 그대로 이식.

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 검색/필터 | 원료코드, 원료명, 제조사 | `labdoc_ingredients` |
| 성분 구성 표시 | INCI Name, CAS No, 배합비율 | `labdoc_ingredient_components` |
| 문서 링크 | COA, MSDS, 조성표 URL | `labdoc_ingredients.coa_urls` 등 |
| 원료 상세 이동 | 코드 클릭 → 상세 페이지 | 기존 `[ingredientCode]/page.tsx` |

### 4.2 입고 관리대장 (`/v2/ingredients/receipts`)

**기존 활용**: `src/app/ingredients/receipts/` 페이지 로직 그대로 이식.

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 입고 기록 | 일자, 원료코드, 수량, LOT, 제조사 | `labdoc_ingredient_receipts` |
| 검색/필터 | 기간, 원료코드, 시험번호 | `labdoc_ingredient_receipts` |
| COA 연동 | 입고 시 성적서 자동 매칭 | `labdoc_ingredient_certificates` |

### 4.3 원료 관리문서 등록 (`/v2/ingredients/documents`) 🆕

원료별 관련 문서를 통합 등록·관리하는 **신규 기능**.

| 기능 | 설명 | 구현 방식 |
|---|---|---|
| 문서 업로드 | PDF, Excel, Word, JPG 등 | Supabase Storage |
| 문서 유형 분류 | 성적서(COA), 조성비(Composition), MSDS, 기타 | `labdoc_ingredients`의 기존 URL 배열 컬럼 확장 |
| 미리보기 | 업로드된 문서 인라인 프리뷰 | PDF.js 또는 iframe |
| 버전 관리 | 동일 문서 타입의 버전 이력 | **🆕 문서 메타데이터 테이블 또는 Storage 폴더 구조** |

> **기존 상태**: `labdoc_ingredients`에 `coa_urls`, `msds_kr_urls`, `msds_en_urls`, `composition_urls`, `fragrance_urls` 등 URL 배열 컬럼이 존재. 현재는 외부 URL 직접 입력 방식.
> **v2 변경**: Supabase Storage 기반 직접 업로드 + 미리보기로 전환.

### 4.4 신규 원료 등록 (`/v2/ingredients/new`) 🆕

새 원료를 시스템에 등록하는 워크플로우.

| 단계 | 설명 | 데이터 소스 |
|---|---|---|
| 기본정보 | 원료코드, 원료명, 제조사, 원산지 | `labdoc_ingredients` INSERT |
| 성분 구성 | INCI Name, CAS No, 조성비율 입력 | `labdoc_ingredient_components` INSERT |
| 문서 첨부 | COA, MSDS, 조성표 업로드 | Supabase Storage → URL 저장 |
| 시험규격 | 원료별 QC 기준 설정 | `labdoc_ingredient_specs` INSERT |

> **기존 참조**: `src/app/ingredients/[ingredientCode]/actions.ts`에 원료 상세/수정 로직 존재. INSERT 로직은 신규 구현 필요.

---

## 5. QC (Quality Control)

> 제품 및 원료의 품질 관리 전체를 담당.
> 기존 v1의 `certificates/` + `purified-water/` + 신규 부자재 시험관리.

### 5.1 성적서 발급 (`/v2/qc/certificates`)

**기존 활용**: `src/app/certificates/` 페이지 로직 이식.

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 성적서 목록 | 제품별 시험성적서 리스트 | `labdoc_test_certificates` |
| 성적서 생성 | 시험항목 템플릿 기반 결과 입력 | `labdoc_product_qc_specs` → 결과 입력 |
| PDF 발급 | jsPDF 기반 성적서 출력 | 기존 구현 (jsPDF + autotable) |
| 이력 관리 | 발급 이력 및 버전 트래킹 | `labdoc_test_certificates` |

### 5.2 정제수 관리 (`/v2/qc/purified-water`)

**기존 활용**: `src/app/purified-water/` 페이지 로직 이식.

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 일일 측정 기록 | pH, 전도도 등 일일 측정값 입력 | `qc_purified_water_measurements` |
| 성적서 발급 | 측정 데이터 기반 성적서 생성 | `qc_purified_water_certificates` |
| 트렌드 차트 | 기간별 수질 추이 | `qc_purified_water_measurements` |

### 5.3 부자재 시험관리 (`/v2/qc/subsidiary-materials`) 🆕

입고 자재의 품질 검사를 관리하는 **신규 기능**.

| 기능 | 설명 | 데이터 소스 |
|---|---|---|
| 입고자재 목록 | `purchases` 데이터 기반 입고 부자재 리스트 | `purchases` 테이블 (MES 공유) |
| 품질 레포트 | 부자재별 품질검사 결과 기록 | **🆕 `qc_subsidiary_material_reports` 테이블** |
| 사진 첨부 | 검수 사진 업로드 | Supabase Storage |
| 합격/불합격 판정 | 검사 결과 + 판정 기록 | **🆕 테이블에 판정 컬럼** |

> **purchases 테이블**: MES 시스템과 공유하는 구매 데이터. `artwork_revision_requests`, `dropbox_folder_path` 등 컬럼 보유.
> **신규 필요**: 품질 레포트 전용 테이블 + Storage 버킷 (사진 첨부용)

---

## 6. Regulation

> 다국가 규제 통합 시스템.
> ⚠️ **기능 미정** — 구조만 예약하고 추후 상세 기능 확정.

### 6.1 예상 라우트: `/v2/regulation`

| 후보 기능 | 설명 | 기존 데이터 |
|---|---|---|
| 규제 현황 대시보드 | EU/MFDS/FDA/NMPA 규제 현황 | `lab_regulations` 테이블 |
| 제품별 규제 검증 | 성분 기반 규제 자동 체크 | `lab_regulations` + `lab_inci_matches` |
| 알러젠 계산 | EU 향료 알러젠 함량 계산 | `labdoc_allergen_regulations`, `labdoc_fragrance_allergen_contents` |

> **기존 데이터**: `lab_regulations` 테이블에 EU/MFDS 규제 데이터가 부분적으로 존재. `labdoc_allergen_regulations`에 알러젠 규제 데이터 존재.
> **PRD_INTERVIEW.md**에 규제 관련 미답변 질문 다수 존재 (C1~C3). 기능 확정 시 해당 질문 답변 필요.

---

## 7. 신제품 개발 현황

> 개발 중인 제품의 연구 상황을 추적하는 대시보드.
> ⚠️ **기능 미정** — 구조만 예약하고 추후 상세 기능 확정.

### 7.1 예상 라우트: `/v2/development`

| 후보 기능 | 설명 | 데이터 연동 |
|---|---|---|
| 개발 파이프라인 보드 | 단계별 진행 현황 (Kanban/타임라인) | **🆕 신규 테이블** |
| 프로젝트 카드 | 개발 제품별 상태, 담당자, 일정 | **🆕 신규 테이블** |
| 연구 노트 연결 | Lab Intel의 리서치 리포트 연결 | `lab_research_reports` |

> 구체적인 기능은 실제 R&D 워크플로우 확인 후 확정 예정.

---

## 8. Lab Intel

> AI 기반 연구 인텔리전스.
> 기존 v1의 `ingredient-intelligence/` + `api/research-reports/` 기능을 재편·확장.

### 8.1 Daily News (`/v2/intel/news`) 🆕

AI 에이전트가 생성하는 인사이트 레포트 프레스 페이지.

| 기능 | 설명 | 구현 방식 |
|---|---|---|
| 데일리 인사이트 | AI가 정리한 화장품 업계 뉴스/트렌드 | **🆕 Claude AI 에이전트 + 스케줄러** |
| 성분 트렌드 | 주목받는 성분, 규제 변화 | 외부 소스 크롤링 + AI 요약 |
| 프레스 형식 UI | 뉴스 카드, 카테고리 필터 | **🆕 UI 신규 구현** |

> **🆕 완전 신규 기능**: 데이터 소스 수집 파이프라인 + AI 요약 + 프레스 UI 전체 신규 개발 필요.
> 스케줄러: Supabase Edge Functions 또는 Vercel Cron Jobs 활용 가능.

### 8.2 성분 인텔리전스 (`/v2/intel/ingredients`)

**기존 활용**: `src/app/ingredient-intelligence/` 전체 이식·개선.

| 기능 | 설명 | 기존 구현 |
|---|---|---|
| 성분 데이터베이스 | INCI Name 통합 검색, 필터링 | ✅ `ingredient-intelligence/page.tsx` |
| 성분 상세 분석 | 효능, 안전성, 시장 데이터, AI 리포트 | ✅ `[slug]/page.tsx` |
| 처방 분석 | INCI 리스트 입력 → AI 종합 분석 | ✅ `analyze-formula/page.tsx` |
| AI 리포트 생성 | 8종 리포트 타입 (Deep Dive, Efficacy, Clinical 등) | ✅ `_lib/report-prompts.ts` + API Route |

**데이터 파이프라인:**
```
INCIDecoder (외부) → vectors_ingredient → lab_inci_matches (브릿지)
                                              ↓
                      lab_ingredients ← → lab_regulations (규제)
                                              ↓
                                    Claude AI → lab_research_reports
```

### 8.3 Product Report (`/v2/intel/reports`)

제품 단위 연구 보고서 조회 및 생성.

| 기능 | 설명 | 기존 구현 |
|---|---|---|
| 리포트 목록 | 전체 리포트 아카이브 (필터: 타입, 성분, 일자) | ✅ 부분 구현 |
| 리포트 상세 | 마크다운 렌더링 | ✅ `react-markdown` |
| 리포트 생성 | 제품 선택 → AI 분석 → 리포트 | ✅ `api/research-reports/generate/route.ts` |
| PDF 내보내기 | jsPDF 기반 | ✅ 부분 구현 |
| 통계 | 토큰 사용량, 생성 시간 | `lab_research_reports` 메타데이터 |

---

## 9. 데이터 모델 변경 요약

### 9.1 기존 테이블 활용 (변경 없음)

| 테이블 | 사용 모듈 |
|---|---|
| `labdoc_products` | PIF 전체 |
| `labdoc_product_bom` | PIF 문서 |
| `labdoc_product_qc_specs` | PIF 문서, QC |
| `labdoc_product_english_specs` | PIF 문서 |
| `labdoc_product_inci` | PIF 문서 |
| `labdoc_product_subsidiary_materials` | PIF 표준작업 명세서 |
| `labdoc_product_work_specs` | PIF 표준작업 명세서 |
| `labdoc_product_revisions` | PIF 제품 관리 |
| `labdoc_manufacturing_processes` | PIF 문서 |
| `labdoc_manufacturing_process_steps` | PIF 문서 |
| `labdoc_ingredients` | 원료관리 |
| `labdoc_ingredient_components` | 원료관리 |
| `labdoc_ingredient_receipts` | 원료관리 |
| `labdoc_ingredient_certificates` | 원료관리 |
| `labdoc_ingredient_specs` | 원료관리 |
| `labdoc_test_certificates` | QC |
| `labdoc_test_specs` | QC |
| `qc_purified_water_measurements` | QC |
| `qc_purified_water_certificates` | QC |
| `labdoc_allergen_regulations` | Regulation |
| `labdoc_fragrance_allergen_contents` | Regulation |
| `lab_inci_matches` | Lab Intel |
| `lab_regulations` | Lab Intel, Regulation |
| `lab_ingredients` | Lab Intel |
| `lab_research_reports` | Lab Intel |
| `vectors_ingredient` | Lab Intel |
| `vp_ingredient` | Lab Intel |
| `bom_master` | PIF (READ-ONLY) |
| `rise_products` | PIF (READ-ONLY) |
| `product_images` | PIF (READ-ONLY) |
| `purchases` | PIF 디자인 아트웍 (READ-ONLY) |

### 9.2 기존 테이블 컬럼 추가

| 테이블 | 추가 컬럼 | 타입 | 용도 |
|---|---|---|---|
| `labdoc_products` | `is_active` | BOOLEAN DEFAULT true | 활성/비활성 상태 |
| `labdoc_products` | `brand` | TEXT | 브랜드 분류 |

### 9.3 신규 테이블

| 테이블명 | 용도 | 모듈 |
|---|---|---|
| `labdoc_document_issuance_log` | 문서 발급 이력 트래킹 | PIF |
| `qc_subsidiary_material_reports` | 부자재 품질검사 레포트 | QC |
| `dev_projects` (가칭) | 신제품 개발 프로젝트 | 신제품 개발 (미정) |
| `intel_daily_news` (가칭) | AI 데일리 뉴스 아카이브 | Lab Intel |

---

## 10. v2 라우트 구조 (확정)

```
src/app/v2/
├── page.tsx                                    # 대시보드
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

---

## 11. v2 네비게이션 구조 (사이드바)

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

## 12. 기존 구현 → v2 매핑 요약

### 재활용 가능 (코드 이식)

| v1 경로 | v2 경로 | 이식 범위 |
|---|---|---|
| `products/` (리스트) | `pif/` | 액션 + UI 구조 |
| `products/[code]/docs/*` (11종 문서) | `pif/[code]` | 핵심 로직 전체 |
| `products/new/` (9단계 wizard) | `pif/new` | 액션 전체, UI 재설계 |
| `ingredients/` (리스트) | `ingredients/` | 전체 |
| `ingredients/receipts/` | `ingredients/receipts` | 전체 |
| `ingredients/[code]/` (상세) | `ingredients/[code]` (추후) | 전체 |
| `certificates/` | `qc/certificates` | 전체 |
| `purified-water/` | `qc/purified-water` | 전체 |
| `ingredient-intelligence/` | `intel/ingredients` | 전체 |
| `ingredient-intelligence/analyze-formula/` | `intel/ingredients` (통합) | 전체 |
| `api/research-reports/` | `api/research-reports/` (유지) | API 유지 |

### 신규 개발 필요

| 기능 | 복잡도 | 우선순위 |
|---|---|---|
| PIF 문서 허브 (마스터-디테일 레이아웃) | **High** | P0 |
| 멀티셀렉 일괄 PDF 발급 | **High** | P0 |
| Function 매칭 (AI Intel) | **Medium** | P1 |
| 발급 내역 트래킹 | **Low** | P1 |
| 디자인 아트웍 (Dropbox 연동) | **High** | P1 |
| 생산입고 내역 (MES 연동) | **High** | P2 |
| 원료 문서 등록 (Storage + 미리보기) | **Medium** | P1 |
| 신규 원료 등록 폼 | **Medium** | P1 |
| 부자재 시험관리 | **Medium** | P1 |
| 제조공정 개별 단계 리스팅 UI | **Medium** | P1 |
| 시험성적서 모듈형 조합 UI | **Medium** | P1 |
| Daily News (AI 에이전트) | **High** | P2 |
| Regulation 시스템 | **TBD** | P2 |
| 신제품 개발 대시보드 | **TBD** | P2 |
| 제품 관리 (일괄 상태/브랜드) | **Low** | P1 |

---

## 13. 미확정 사항 (사용자 확인 필요)

| # | 항목 | 질문 | 영향 범위 |
|---|---|---|---|
| 1 | 생산입고 내역 | MES 데이터를 직접 조회? 별도 테이블에 동기화? | PIF 3.2.3 |
| 2 | Regulation 기능 | 구체적 기능 명세 필요 | 모듈 6 전체 |
| 3 | 신제품 개발 현황 | 구체적 기능 명세 필요 | 모듈 7 전체 |
| 4 | Daily News 소스 | 어떤 외부 소스에서 뉴스를 수집할지? | Lab Intel 8.1 |
| 5 | PDF 엔진 | window.print() 유지? jsPDF 서버사이드 전환? | PIF 전체 |
| 6 | 제품 상세 URL | `/v2/pif/[productCode]` vs `/v2/pif/[productCode]/docs` | PIF 라우트 |

---

*이 PRD는 Draft v1입니다. 미확정 사항 확인 후 업데이트됩니다.*
