# CPSR Data Gap Analysis: Rise-Intel vs EU Regulation 1223/2009

> 분석일: 2026-03-23 | 규정: EU Regulation (EC) No 1223/2009, Annex I
> 목적: CPSR 자동 생성을 위한 데이터 갭 식별

---

## Executive Summary

Rise-Intel의 labdoc_* 및 lab_* 테이블은 CPSR Part A의 약 **55~60%** 데이터를 이미 보유하고 있습니다.
특히 **제품 식별, 성분 조성, QC 규격, 제조공정** 영역이 강점이며,
**독성학 프로파일, 노출 평가, MoS 계산, Part B 안전성 평가** 영역이 완전 부재합니다.

### Coverage Summary

| CPSR 섹션 | 커버리지 | 상태 |
|-----------|----------|------|
| Part A §1: 제품 식별 | 🟢 75% | 대부분 존재, 일부 보강 필요 |
| Part A §2: 성분 조성 | 🟡 65% | INCI/CAS 있음, 농도/불순물 보강 필요 |
| Part A §3: 물리화학적 특성 & 안정성 | 🟡 50% | pH/비중/점도 있음, 안정성 시험 미구축 |
| Part A §4: 미생물학적 품질 | 🟠 30% | QC 규격 존재, 방부력 시험 전용 테이블 없음 |
| Part A §5: 독성학 프로파일 | 🔴 5% | 거의 전무 — 핵심 갭 |
| Part A §6: 노출 평가 | 🔴 0% | 완전 부재 |
| Part A §7: 이상반응 | 🔴 0% | 완전 부재 |
| Part A §8: 포장재 정보 | 🟠 20% | 부자재 테이블에 일부 |
| Part A §9: 제조 & GMP | 🟡 60% | 제조공정 있음, GMP 인증 미관리 |
| Part B: 안전성 평가 | 🔴 0% | 완전 부재 (안전성 평가사 시스템 필요) |

---

## Part A: Detailed Gap Analysis

### §1. 제품 식별 & 분류 (Product Identification)

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Product Name (Trade Name) | `labdoc_products.korean_name` / `.english_name` | ✅ | — |
| Product Code | `labdoc_products.product_code` | ✅ | — |
| Cosmetic Category | `labdoc_products.cosmetic_type` | ✅ | EU 카테고리 코드 매핑 필요 |
| Intended Use | `labdoc_products.usage_instructions` | ✅ | 내러티브 형식 보강 |
| Target Population | — | ❌ | **신규 필드 필요** |
| Application Area (face/body/etc.) | — | ❌ | **신규 필드 필요** |
| Frequency of Use | — | ❌ | **신규 필드 필요** |
| Duration of Use | — | ❌ | **신규 필드 필요** |
| Reasonably Foreseeable Misuse | — | ❌ | **신규 필드 필요** |
| Recommended Age | `labdoc_products.recommended_age` | ✅ | — |
| Dosage/Form | `labdoc_products.dosage` | ✅ | — |
| Fill Volume | `labdoc_products.fill_volume` | ✅ | — |

**갭 요약**: 5개 신규 필드 필요 (target_population, application_area, use_frequency, use_duration, foreseeable_misuse)

---

### §2. 성분 조성 (Quantitative & Qualitative Composition)

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| INCI Name (EN) | `labdoc_ingredient_components.inci_name_en` | ✅ | — |
| INCI Name (KR) | `labdoc_ingredient_components.inci_name_kr` | ✅ | — |
| CAS Number | `labdoc_ingredient_components.cas_number` | ✅ | — |
| EC Number | `lab_ingredients.cosing_ec_number` | ✅ | labdoc 테이블에 없음, lab 테이블 참조 |
| IUPAC Name | `lab_ingredients.cosing_chemical_iupac_name` | ✅ | lab 테이블에만 존재 |
| Concentration (%) | `labdoc_product_bom.content_ratio` | ✅ | — |
| Component Ratio in Raw Material | `labdoc_ingredient_components.composition_ratio` | ✅ | — |
| Intended Function | `labdoc_ingredient_components.function` | ✅ | — |
| Classification (Preservative/Colorant/etc.) | — | ❌ | **신규 필드 필요** (ingredient_classification) |
| Complete INCI Declaration | `labdoc_product_inci` (테이블 존재) | ✅ | — |
| Formula Revision Date | `labdoc_product_revisions.revision_date` | ✅ | — |
| CMR Impurities | — | ❌ | **신규 테이블 필요** |
| Manufacturing Process Impurities | — | ❌ | **신규 필드 필요** |

**갭 요약**: ingredient_classification 필드 + impurities 추적 테이블 필요. EC/IUPAC는 lab_ingredients에서 JOIN으로 해결 가능하나, labdoc_ingredient_components에 직접 추가 권장.

---

### §3. 물리화학적 특성 & 안정성 (Physical/Chemical & Stability)

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Physical Form | `labdoc_products.appearance` | ⚠️ | 전용 enum 필드로 분리 권장 |
| Color | `labdoc_product_work_specs.color` | ✅ | — |
| pH Value | `labdoc_products.ph_standard` | ✅ | — |
| Specific Gravity | `labdoc_products.specific_gravity` | ✅ | — |
| Viscosity | `labdoc_products.viscosity_standard` | ✅ | — |
| Alcohol Content | `labdoc_products.msds_alcohol_content` | ✅ | — |
| Flammability | `labdoc_products.msds_flammability` | ✅ | — |
| **Accelerated Stability Test** | — | ❌ | **신규 테이블 필요** |
| **Real-Time Stability Test** | — | ❌ | **신규 테이블 필요** |
| Shelf Life | `labdoc_products.shelf_life` | ✅ | — |
| Storage Conditions | `labdoc_products.storage_method` | ✅ | — |
| Stability Protocol | — | ❌ | **신규 필드 필요** |

**갭 요약**: 안정성 시험 데이터 테이블 완전 부재 — `cpsr_stability_tests` 테이블 신규 필요 (test_type, conditions, duration, results, protocol)

---

### §4. 미생물학적 품질 (Microbiological Quality)

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Preservative System | `labdoc_ingredient_components.function` (방부제 필터) | ⚠️ | 전용 필드 없음, 간접 추출 |
| Preservative Concentration | `labdoc_product_bom.content_ratio` (방부제 필터) | ⚠️ | 간접 추출 가능 |
| Challenge Test (PET) Results | — | ❌ | **신규 테이블 필요** |
| Microbial Count (Total) | `labdoc_product_qc_specs` (test_item 필터) | ⚠️ | QC에 포함 가능하나 구조화 안됨 |
| *P. aeruginosa* | `labdoc_product_qc_specs` (test_item 필터) | ⚠️ | 상동 |
| *S. aureus* | `labdoc_product_qc_specs` (test_item 필터) | ⚠️ | 상동 |
| *C. albicans* | `labdoc_product_qc_specs` (test_item 필터) | ⚠️ | 상동 |

**갭 요약**: QC 규격에 미생물 항목이 포함될 수 있으나, CPSR용 구조화된 미생물 시험 결과 테이블 필요. 방부력 시험(PET) 전용 테이블 필요.

---

### §5. 독성학 프로파일 (Toxicological Profile) — 🔴 핵심 갭

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Hazard Identification | `lab_regulations.regulation_type` | ⚠️ | 규제 유형만 있음, 독성 분류 없음 |
| CLP Classification (H-statements) | — | ❌ | **완전 부재** |
| Dermal Absorption Rate (%) | — | ❌ | **완전 부재** |
| Systemic Exposure Dose (SED) | — | ❌ | **완전 부재** |
| NOAEL / LOAEL | — | ❌ | **완전 부재** |
| Margin of Safety (MoS) | — | ❌ | **완전 부재** |
| MoS > 100 판정 | — | ❌ | **완전 부재** |
| CMR Classification | — | ❌ | **완전 부재** |
| Safety Data Sheet (SDS) | `labdoc_ingredients.msds_kr_urls` / `.msds_en_urls` | ✅ | URL만 존재, 구조화 데이터 없음 |

**갭 요약**: CPSR의 가장 중대한 갭. `cpsr_ingredient_toxicology` 테이블 신규 필요:
- `ingredient_code`, `hazard_class`, `h_statements[]`, `dermal_absorption_pct`, `noael`, `loael`, `sed`, `mos`, `cmr_classification`, `sensitization_potential`, `references`
- MoS 자동 계산 엔진 (SED / NOAEL × 100) 필요

---

### §6. 노출 평가 (Exposure Assessment) — 🔴 완전 부재

| CPSR 필수 필드 | 상태 |
|----------------|------|
| Exposure Duration (hours/day) | ❌ |
| Exposure Frequency (days/week) | ❌ |
| Exposure Area (cm²) | ❌ |
| Application Amount (mg/application) | ❌ |
| Dermal Absorption (%) | ❌ |
| Calculated SED | ❌ |

**갭 요약**: `cpsr_exposure_scenarios` 테이블 신규 필요. SCCS Notes of Guidance 기반 기본값 사전 설정 가능 (제품 카테고리별 표준 노출량).

---

### §7. 이상반응 (Adverse Effects) — 🔴 완전 부재

| CPSR 필수 필드 | 상태 |
|----------------|------|
| Known Adverse Effects | ❌ |
| Serious Adverse Effects (SUE) | ❌ |
| Complaint Handling System | ❌ |
| Post-Market Surveillance Plan | ❌ |

**갭 요약**: `cpsr_adverse_events` 테이블 + PMS(Post-Market Surveillance) 워크플로우 필요.

---

### §8. 포장재 정보 (Packaging)

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Packaging Material Composition | `labdoc_product_subsidiary_materials.material_name` / `.material_spec` | ⚠️ | 부자재로 관리, 포장재 전용 아님 |
| Compatibility Assessment | — | ❌ | **신규 필드 필요** |
| Migration Testing | — | ❌ | **신규 필드 필요** |
| Recycling Grade | `labdoc_products.recycling_grade` | ✅ | — |

---

### §9. 제조 & GMP

| CPSR 필수 필드 | 기존 테이블.컬럼 | 상태 | 갭 |
|----------------|------------------|------|-----|
| Manufacturing Process | `labdoc_manufacturing_processes` | ✅ | — |
| Process Steps | `labdoc_manufacturing_process_steps` | ✅ | — |
| Batch Number | `labdoc_manufacturing_processes.batch_number` | ✅ | — |
| Manufacturing Date | `labdoc_manufacturing_processes.mfg_date` | ✅ | — |
| GMP Certification (ISO 22716) | — | ❌ | **신규 필드 필요** |
| Quality Control Procedures | `labdoc_product_qc_specs` | ✅ | — |
| Batch Release Protocol | — | ❌ | **신규 필드 필요** |
| Facility Info | — | ❌ | **신규 테이블 필요** (manufacturing_facilities) |

---

## Part B: Safety Assessment — 🔴 완전 부재

Part B는 자격을 갖춘 안전성 평가사(Safety Assessor)가 작성하는 영역으로,
현재 Rise-Intel에는 관련 데이터 구조가 전혀 없습니다.

### 필요한 신규 테이블

| 테이블명 (제안) | 용도 | 주요 컬럼 |
|----------------|------|-----------|
| `cpsr_safety_assessments` | 안전성 평가 보고서 | product_code, assessor_id, conclusion, risk_level, assessment_date, signature |
| `cpsr_safety_assessors` | 평가사 등록 | name, qualifications, certifications, experience_years, organization |
| `cpsr_risk_characterizations` | 위험 특성 평가 | assessment_id, hazard_summary, mitigation_measures, remaining_risk |
| `cpsr_label_requirements` | 라벨 요구사항 | assessment_id, warnings[], instructions, restrictions, contraindications |

---

## 3. Implementation Roadmap (우선순위)

### Phase 1: Quick Wins — 기존 테이블 확장 (1~2주)

labdoc_products에 CPSR 필드 추가:
```sql
ALTER TABLE labdoc_products ADD COLUMN
  target_population text[],           -- §1
  application_area text[],            -- §1
  use_frequency text,                 -- §1
  use_duration text,                  -- §1
  foreseeable_misuse text,            -- §1
  physical_form text,                 -- §3 (appearance에서 분리)
  gmp_certification_ref text,         -- §9
  gmp_expiry_date date;              -- §9
```

labdoc_ingredient_components에 추가:
```sql
ALTER TABLE labdoc_ingredient_components ADD COLUMN
  ec_number text,                     -- §2 (lab_ingredients JOIN 대체)
  iupac_name text,                    -- §2
  ingredient_classification text;     -- §2 (preservative/colorant/UV filter/etc.)
```

### Phase 2: 핵심 신규 테이블 (2~4주)

```sql
-- 독성학 프로파일 (§5) — 가장 중요
CREATE TABLE cpsr_ingredient_toxicology (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_code text NOT NULL REFERENCES labdoc_ingredients(ingredient_code),
  hazard_class text,
  h_statements text[],
  dermal_absorption_pct numeric,
  noael numeric,                      -- mg/kg bw/day
  loael numeric,
  sed numeric,                        -- Systemic Exposure Dose
  mos numeric GENERATED ALWAYS AS (CASE WHEN sed > 0 THEN noael / sed ELSE NULL END) STORED,
  mos_acceptable boolean GENERATED ALWAYS AS (CASE WHEN sed > 0 THEN (noael / sed) >= 100 ELSE NULL END) STORED,
  cmr_classification text,
  sensitization_potential text,
  data_source text,
  references text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 노출 시나리오 (§6)
CREATE TABLE cpsr_exposure_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  cosmetic_category text,
  exposure_duration_hours numeric,
  exposure_frequency_per_week numeric,
  exposure_area_cm2 numeric,
  application_amount_mg numeric,
  dermal_absorption_pct numeric,
  calculated_sed numeric,
  sccs_reference text,
  created_at timestamptz DEFAULT now()
);

-- 안정성 시험 (§3)
CREATE TABLE cpsr_stability_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  test_type text NOT NULL,            -- 'accelerated' | 'real_time' | 'freeze_thaw'
  storage_conditions text,            -- '40°C/75%RH'
  duration_months integer,
  start_date date,
  end_date date,
  results jsonb,
  conclusion text,                    -- 'pass' | 'fail' | 'conditional'
  protocol_reference text,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- 방부력 시험 (§4)
CREATE TABLE cpsr_preservative_efficacy_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  test_date date,
  test_method text,                   -- 'ISO 11930' | 'USP <51>'
  challenge_organisms jsonb,          -- [{name, inoculation_cfu, day7, day14, day28}]
  overall_result text,                -- 'A' | 'B' | 'fail'
  pdf_url text,
  created_at timestamptz DEFAULT now()
);
```

### Phase 3: Part B & PMS (4~8주)

```sql
-- 안전성 평가사
CREATE TABLE cpsr_safety_assessors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  qualifications text[],              -- ['Pharmacy', 'Toxicology']
  certifications text[],              -- ['SCS', 'IFSCC']
  experience_years integer,
  organization text,
  contact_info jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 안전성 평가 보고서
CREATE TABLE cpsr_safety_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  assessor_id uuid REFERENCES cpsr_safety_assessors(id),
  assessment_version integer DEFAULT 1,
  conclusion text NOT NULL,           -- 'safe' | 'not_safe' | 'conditional'
  conclusion_summary text,
  risk_summary text,
  identified_hazards jsonb,
  mitigation_measures text,
  remaining_risk_level text,          -- 'low' | 'medium' | 'high'
  label_warnings text[],
  usage_instructions text,
  restrictions text[],
  contraindications text[],
  sccs_version text,
  referenced_standards text[],
  literature_citations text[],
  digital_signature_url text,
  assessment_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 이상반응 추적 (§7)
CREATE TABLE cpsr_adverse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  event_date date,
  severity text,                      -- 'minor' | 'serious' | 'sue'
  description text,
  reporter_type text,                 -- 'consumer' | 'professional' | 'authority'
  outcome text,
  corrective_action text,
  reported_to_authority boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 제조 시설 (§9)
CREATE TABLE cpsr_manufacturing_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name text NOT NULL,
  address text,
  gmp_standard text,                  -- 'ISO 22716' | 'CGMP'
  certification_number text,
  certification_expiry date,
  audit_date date,
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## 4. 자동화 가능 영역

CPSR의 많은 부분을 **데이터가 채워지면 자동 생성** 가능합니다:

| 섹션 | 자동화 수준 | 방법 |
|------|------------|------|
| §1 제품 식별 | 🟢 90% | labdoc_products에서 직접 추출 |
| §2 성분 조성 | 🟢 85% | BOM + ingredient_components JOIN |
| §3 물리화학적 | 🟡 60% | 기존 데이터 + 안정성 시험 결과 |
| §4 미생물 | 🟡 50% | QC + PET 결과 JOIN |
| §5 독성학 | 🟠 30% | 데이터 입력 후 MoS 자동 계산 가능 |
| §6 노출 평가 | 🟢 80% | SCCS 기준값으로 자동 계산 엔진 |
| §9 제조/GMP | 🟡 70% | 기존 공정 + GMP 인증 데이터 |
| Part B | 🔴 10% | 평가사 수작업 필수 (서명/날인) |

### AI 활용 가능 영역

Rise-Intel의 기존 AI 인프라(lab_research_reports, 벡터 검색)를 활용:

1. **자동 독성 데이터 수집**: INCI → CosIng/ECHA DB 검색 → 독성 데이터 자동 입력
2. **MoS 자동 계산**: SED = (concentration × absorption × application_amount) / body_weight
3. **규제 크로스체크**: lab_regulations 테이블로 Annex II/III/IV 자동 검증
4. **CPSR PDF 자동 생성**: 기존 @react-pdf/renderer 활용

---

## 5. 신규 테이블 요약

| 테이블 | Phase | CPSR 섹션 | 행 추정 |
|--------|-------|-----------|---------|
| `cpsr_ingredient_toxicology` | 2 | §5 | 성분 수 × 1 |
| `cpsr_exposure_scenarios` | 2 | §6 | 제품 수 × 1 |
| `cpsr_stability_tests` | 2 | §3 | 제품 수 × 2~3 |
| `cpsr_preservative_efficacy_tests` | 2 | §4 | 제품 수 × 1 |
| `cpsr_safety_assessors` | 3 | Part B | ~5 |
| `cpsr_safety_assessments` | 3 | Part B | 제품 수 × 1 |
| `cpsr_adverse_events` | 3 | §7 | 가변 |
| `cpsr_manufacturing_facilities` | 3 | §9 | ~3 |

**총 8개 신규 테이블 + 기존 2개 테이블 ALTER**

---

*이 분석은 EU Regulation 1223/2009 Annex I (CPSR) 요구사항을 Rise-Intel의 기존 94개 테이블과 대조하여 데이터 갭을 식별한 문서입니다. Phase 1부터 순차 구현 시 약 8~12주 내 CPSR 자동 생성 파이프라인 구축이 가능합니다.*
