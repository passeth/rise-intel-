# RISE INTEL

## 프로젝트 개요

**RISE INTEL**은 화장품 연구 자동화 및 성분 인텔리전스 시스템입니다.
RISE MES(risemes)의 LAB 모듈을 별도 프로젝트로 분리하여, 
CosIng 온톨로지 + 규제 검증 + 문서 자동 생성 기능을 확장 구현합니다.

### 핵심 가치

- **연구 자동화**: 성분 입력 → 연구 문서 자동 생성
- **규제 검증**: CosIng + EU/MFDS/FDA 규제 자동 검증
- **성분 인텔리전스**: AI 기반 성분 분석 및 처방 설계 지원

---

## 기술 스택

| 기술 | 용도 |
|---|---|
| **Next.js 16** | App Router 프레임워크 |
| **Supabase** | PostgreSQL DB + Auth + Storage |
| **shadcn/ui** | UI 컴포넌트 |
| **Tailwind CSS v4** | 스타일링 |
| **Anthropic Claude** | AI 연구 리포트 생성 |
| **jsPDF** | PDF 문서 생성 |
| **TanStack Query** | 서버 상태 관리 |

---

## 프로젝트 구조

```
rise-intel-/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 홈 (LAB 대시보드)
│   │   ├── products/                   # 제품표준서
│   │   │   ├── [productCode]/docs/     # 제품 상세 문서
│   │   │   └── new/                    # 제품 생성/수정
│   │   ├── ingredients/                # 원료관리
│   │   │   ├── [ingredientCode]/       # 원료 상세
│   │   │   └── receipts/              # 입고 관리대장
│   │   ├── certificates/              # 시험성적서
│   │   ├── purified-water/            # 정제수 관리
│   │   ├── standards/                 # 시험규격
│   │   ├── ingredient-intelligence/   # 성분 인텔리전스
│   │   │   ├── [slug]/                # 성분 상세 분석
│   │   │   └── analyze-formula/       # 처방 분석
│   │   └── api/research-reports/      # AI 리포트 API
│   ├── components/
│   │   ├── layout/                    # 헤더, 사이드바, 레이아웃
│   │   └── ui/                        # shadcn/ui 컴포넌트
│   ├── lib/
│   │   ├── supabase/                  # Supabase 클라이언트
│   │   ├── claude.ts                  # Claude AI 클라이언트
│   │   ├── pdf/                       # PDF 생성 유틸
│   │   └── utils.ts                   # 공통 유틸
│   ├── providers/                     # React Context Providers
│   └── types/                         # TypeScript 타입 (Supabase)
└── public/
    └── fonts/                         # 한글 폰트 (NanumGothic)
```

---

## 데이터베이스 (Supabase — risemes와 공유)

### INTEL 전용 테이블

| 그룹 | 테이블 |
|---|---|
| **제품표준서** | `labdoc_products`, `labdoc_product_bom`, `labdoc_product_qc_specs`, `labdoc_product_english_specs`, `labdoc_product_inci`, `labdoc_product_subsidiary_materials`, `labdoc_product_work_specs`, `labdoc_product_revisions` |
| **제조공정** | `labdoc_manufacturing_processes`, `labdoc_manufacturing_process_steps` |
| **원료** | `labdoc_ingredients`, `labdoc_ingredient_components`, `labdoc_ingredient_specs`, `labdoc_ingredient_receipts`, `labdoc_ingredient_certificates` |
| **알러젠** | `labdoc_allergen_regulations`, `labdoc_fragrance_allergen_contents` |
| **성적서** | `labdoc_test_certificates`, `labdoc_test_specs` |
| **인텔리전스** | `lab_inci_matches`, `lab_regulations`, `lab_ingredients`, `lab_products`, `lab_ingredient_product`, `lab_categories`, `lab_research_reports` |
| **정제수** | `qc_purified_water_measurements`, `qc_purified_water_certificates` |
| **벡터/AI** | `vectors_ingredient`, `vp_ingredient`, `vp_formula`, `vp_formula_ingredients` |

### 공유 테이블 (READ-ONLY)

| 테이블 | 용도 |
|---|---|
| `bom_master` | 제품 원료 BOM 조회 |
| `rise_products` | 제품 존재 여부 확인 |
| `product_images` | 제품 이미지 표시 |

---

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
```

### 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

---

## 원본 프로젝트

- **RISE MES**: https://github.com/passeth/risemes.git
- LAB 모듈을 분리하여 이 프로젝트로 이식
- 동일 Supabase 인스턴스 공유
