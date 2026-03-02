# 제품 마스터 파일 문서 체계도

> 작성일: 2026-02-25
> 목적: 제품별 문서(Product Master File) 구조, 데이터 소스 매핑, 자동화 가능성 분석

---

## 1. 문서 목록 (11개 유형)

| # | 문서명 | 영문명 | 데이터 소스 | 자동화 |
|---|--------|--------|-------------|--------|
| 1 | 제품표준서 | Product Standard | `labdoc_products` | ✅ 완전 자동 |
| 2 | 국문 성분표 | Korean Ingredients | BOM + `labdoc_ingredient_components` | ✅ 완전 자동 |
| 3 | 영문 성분표 | English Ingredients | BOM + `labdoc_ingredient_components` | ✅ 완전 자동 |
| 4 | 브레이크다운 | Breakdown (Composition) | `labdoc_ingredient_components` | ✅ 완전 자동 |
| 5 | INCI 합산 | INCI List (Merged) | `labdoc_product_inci` | ✅ 완전 자동 |
| 6 | 영문 성적서 | COA (English) | `labdoc_product_qc_specs` | ✅ 완전 자동 |
| 7 | 반제품 시험기준 | Semi-Product Specs | `labdoc_product_qc_specs` (qc_type='반제품') | ✅ 완전 자동 |
| 8 | 완제품 시험기준 | Finished Product Specs | `labdoc_product_qc_specs` (qc_type='완제품') | ✅ 완전 자동 |
| 9 | 원료 COA | Raw Material COAs | `labdoc_ingredients.coa_urls` | 🔶 PDF 연동 필요 |
| 10 | MSDS | Material Safety Data Sheet | `labdoc_products` + INCI 데이터 | 🔷 LLM 생성 필요 |
| 11 | 제조공정 기록서 | Manufacturing Process Record | `labdoc_manufacturing_processes` | 🔶 데이터 입력 필요 |

### 자동화 수준 범례

- ✅ **완전 자동**: DB 데이터만으로 문서 생성 가능
- 🔶 **부분 자동**: 외부 파일 연동 또는 데이터 입력 선행 필요
- 🔷 **LLM 필요**: AI 기반 텍스트 생성이 필요한 문서

---

## 2. 데이터 연결 다이어그램

```
labdoc_products (제품 기본정보)
    │
    ├── labdoc_product_inci (전성분: 국문/영문/CPNP/FDA)
    │       └── labdoc_ingredient_components (성분 상세: INCI명, CAS No, 조성비율)
    │               └── labdoc_ingredients (원료 master: COA, MSDS URL 보관)
    │
    ├── labdoc_product_qc_specs (QC 규격: 반제품/완제품/영문)
    │
    ├── labdoc_manufacturing_processes (제조 공정 기본정보)
    │       └── labdoc_manufacturing_process_steps (공정 단계별 상세)
    │
    ├── labdoc_product_revisions (개정 이력)
    │
    └── BOM (rise.products → bom → materials)
            └── labdoc_ingredients (원료 COA 취합 경로)
```

---

## 3. 테이블별 상세

### 3.1 labdoc_products (제품 기본정보)

제품표준서 및 MSDS의 핵심 소스.

| 컬럼 | 타입 | 용도 |
|------|------|------|
| product_code | TEXT (PK) | 제품 코드 |
| korean_name / english_name | TEXT | 제품명 (국/영문) |
| cosmetic_type | TEXT | 화장품 유형 |
| appearance | TEXT | 성상 |
| ph_standard | TEXT | pH 기준 |
| specific_gravity | NUMERIC | 비중 |
| viscosity_standard | TEXT | 점경도 기준 |
| shelf_life | TEXT | 사용기한 |
| usage_instructions | TEXT | 사용법 |
| functional_claim | TEXT | 효능/효과 |
| storage_method | TEXT | 저장방법 |
| allergen_korean / allergen_english | TEXT | 알러젠 표기 |
| p_product_code / semi_product_code | TEXT | P제품/반제품 코드 연결 |

### 3.2 labdoc_ingredients (원료 마스터)

원료 COA 취합 및 MSDS 참조 소스.

| 컬럼 | 타입 | 용도 |
|------|------|------|
| ingredient_code | TEXT (PK) | 원료 코드 |
| ingredient_name | TEXT | 원료명 |
| manufacturer | TEXT | 제조사 |
| coa_urls | TEXT[] | COA 문서 URL 배열 |
| msds_kr_urls / msds_en_urls | TEXT[] | MSDS 한/영문 URL 배열 |
| composition_urls | TEXT[] | 조성표 URL 배열 |
| fragrance_urls | TEXT[] | 향료 관련 문서 URL |

### 3.3 labdoc_ingredient_components (원료 성분 상세)

성분표, 브레이크다운, INCI 합산의 핵심 소스.

| 컬럼 | 타입 | 용도 |
|------|------|------|
| ingredient_code | TEXT (FK) | 원료 코드 |
| inci_name_en / inci_name_kr | TEXT | INCI명 (영/국문) |
| cas_number | TEXT | CAS 번호 |
| composition_ratio | NUMERIC | 조성 비율 (%) |
| function | TEXT | 성분 기능 |

### 3.4 labdoc_product_qc_specs (QC 규격)

시험기준 및 영문 성적서 소스.

| 컬럼 | 타입 | 용도 |
|------|------|------|
| product_code | TEXT (FK) | 제품 코드 |
| qc_type | TEXT | '반제품' / '완제품' |
| test_item / test_item_en | TEXT | 시험 항목 (국/영문) |
| specification / specification_en | TEXT | 규격 (국/영문) |
| test_method | TEXT | 시험 방법 |
| sequence_no | INT | 표시 순서 |

### 3.5 labdoc_manufacturing_processes (제조 공정)

| 컬럼 | 타입 | 용도 |
|------|------|------|
| product_code | TEXT (FK) | 제품 코드 |
| batch_unit / actual_qty | TEXT | 배치 단위/수량 |
| total_time | TEXT | 총 소요시간 |

### 3.6 labdoc_manufacturing_process_steps (공정 단계)

| 컬럼 | 타입 | 용도 |
|------|------|------|
| process_id | UUID (FK) | 공정 ID |
| step_num | INT | 단계 번호 |
| step_name | TEXT | 단계명 |
| step_desc | TEXT | 상세 설명 |
| work_time | TEXT | 작업 시간 |

---

## 4. 페이지 매핑

현재 문서 조회 UI는 `/lab/products/[productCode]/docs/` 하위에 구현되어 있음.

| 라우트 | 문서 # | 상태 |
|--------|--------|------|
| `.../docs` (올인원) | 1~11 전체 | ✅ 구현 완료 (921줄) |
| `.../docs/standard` | 1. 제품표준서 | ✅ 구현 완료 |
| `.../docs/ingredients/ko` | 2. 국문 성분표 | ✅ 구현 완료 |
| `.../docs/ingredients/en` | 3. 영문 성분표 | ✅ 구현 완료 |
| `.../docs/ingredients/breakdown` | 4. 브레이크다운 | ✅ 구현 완료 |
| `.../docs/ingredients/summary` | 5. INCI 합산 | ✅ 구현 완료 |
| `.../docs/specs/en` | 6. 영문 성적서 | ✅ 구현 완료 |
| `.../docs/specs/semi` | 7. 반제품 시험기준 | ✅ 구현 완료 |
| `.../docs/specs/final` | 8. 완제품 시험기준 | ✅ 구현 완료 |
| `.../docs/raw-materials/coa` | 9. 원료 COA | ✅ 구현 완료 |
| `.../docs/msds` | 10. MSDS | ✅ 구현 완료 |
| `.../docs/manufacturing-process` | 11. 제조공정 기록서 | ✅ 구현 완료 |

> **참고**: 현재는 UI 조회만 가능하며, PDF Export 기능은 미구현 상태.

---

## 5. 구현 로드맵

### Phase 1: PDF 발급 시스템 (우선)

| 단계 | 작업 | 복잡도 |
|------|------|--------|
| 1.1 | PDF 템플릿 구조 설계 | Low |
| 1.2 | 제품표준서 PDF | Medium |
| 1.3 | 국문/영문 성분표 PDF | Medium |
| 1.4 | 시험기준 (QC Specs) PDF | Medium |
| 1.5 | 원료 COA 취합 PDF | High |
| 1.6 | 제조공정 기록서 PDF | High |
| 1.7 | 배치 PDF 발급 (ZIP) | Medium |

### Phase 2: LLM 확장

| 단계 | 작업 | 복잡도 |
|------|------|--------|
| 2.1 | MSDS 자동 생성 (LLM) | High |
| 2.2 | INCI 선언문 검증 | Medium |
| 2.3 | 성분 안전성 분석 | High |
| 2.4 | 규제 준수 체크 (MFDS/EU) | High |
| 2.5 | 자연어 기반 문서 검색 | Medium |

### 권장 일정

```
Month 1~2: Phase 1.1 ~ 1.4 (핵심 PDF 4종)
Month 3:   Phase 1.5 ~ 1.7 (고급 PDF + 배치)
Month 4+:  Phase 2 (LLM 확장)
```
