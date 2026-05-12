# CPNP 문서 생성 테이블 매핑

이 문서는 `/v2/pif/cpnp` 화면에서 생성하는 9가지 CPNP 문서가 어떤 Supabase 테이블과 컬럼을 읽고, 어떤 계산 로직으로 PDF 항목을 만드는지 정리한다.

기준 코드:
- 데이터 수집: `src/app/v2/pif/cpnp/data.ts`
- 생성 API: `src/app/api/cpnp/generate/route.ts`
- PDF 생성기: `src/lib/doc-gen/cpnp/*.ts`
- 문서 타입 정의: `src/app/v2/pif/cpnp/constants.ts`

## 생성 흐름

1. `/api/cpnp/generate`가 `productCodes`, `documents`를 받는다.
2. 각 `productCode`마다 `fetchCpnpProductData(productCode)`로 공통 데이터를 조회한다.
3. 요청된 문서 타입별 PDF 생성기를 실행한다.
4. 생성된 PDF를 Supabase Storage `documents` bucket에 업로드한다.
5. 가능하면 `cpnp_document_generations` 테이블에 생성 이력을 저장한다.

저장 경로:

```text
documents/cpnp/{productCode}/{documentType}/{productCode}_{productEnglishName}_{yymmdd}.pdf
```

파일명은 품목코드, 품목영문명, 한국 시간 기준 생성일 `yymmdd`를 조합한다.
예: `ABC001_Product Name_260512.pdf`

생성 이력 테이블:

```text
cpnp_document_generations
```

사용 컬럼:

```text
product_code
document_type
generated_at
pdf_url
status
metadata
```

현재 구현에서는 새 Supabase 환경에 `cpnp_document_generations` 테이블이 없어도 PDF 생성 자체는 실패하지 않고, 이력 조회는 빈 배열로 처리한다.

## 공통 조회 테이블

현재 구현은 특정 문서 하나만 생성해도 아래 공통 데이터를 한 번에 조회한다.

### `labdoc_products`

기준 조건:

```text
product_code = 요청 productCode
```

조회 컬럼:

```text
product_code
korean_name
english_name
management_code
label_volume
fill_volume
ph_standard
viscosity_standard
appearance
cosmetic_type
semi_product_code
shelf_life
storage_method
```

주요 사용처:
- 제품명: `english_name` 우선, 없으면 `korean_name`
- 제품 기준 코드: `product_code`
- COA reference: `management_code`
- Specification capacity: `label_volume`
- BOM 조회 키: `semi_product_code`
- MSDS 물성 fallback: `appearance`, `ph_standard`
- 알러젠 기준: `cosmetic_type`

### `bom_master`

기준 조건:

```text
prdcode = labdoc_products.semi_product_code
```

조회 컬럼:

```text
materialcode
materialname
usemount
```

정렬:

```text
usemount desc
```

로직:
- `materialcode`를 `normalizeIngredientCode()`로 정규화한다.
- 같은 base ingredient code가 여러 줄이면 `usemount`를 합산한다.
- `usemount`는 완제품 내 원료 투입비율, 즉 원료 `WT%`로 사용한다.
- 정규화된 원료 코드를 기준으로 원료 구성성분과 원료명을 다시 조회한다.

주의:
- 정규화 로직은 특정 BOM 코드 패턴에서 suffix를 제거한다.
- 최종 `bom`은 `content_ratio` 내림차순으로 정렬된다.

### `labdoc_ingredient_components`

기준 조건:

```text
ingredient_code in 정규화된 bom_master.materialcode 목록
```

조회 컬럼:

```text
ingredient_code
inci_name_en
inci_name_kr
cas_number
composition_ratio
function
component_order
```

정렬:

```text
component_order asc
```

주요 계산:

```text
완제품 내 개별 INCI 함량 = bom_master.usemount * composition_ratio / 100
```

### `labdoc_ingredients`

기준 조건:

```text
ingredient_code in 정규화된 BOM 원료 코드 목록
```

조회 컬럼:

```text
ingredient_code
ingredient_name
coa_urls
msds_en_urls
composition_urls
fragrance_urls
```

주요 사용처:
- `ingredient_name`: BOM 원료명 보완
- URL 컬럼들: 현재 공통 데이터로 조회하지만, 9종 PDF 생성기에서는 직접 출력하지 않는다.

### `labdoc_product_qc_specs`

기준 조건:

```text
product_code = 요청 productCode
```

조회 컬럼:

```text
test_item
test_item_en
specification
specification_en
test_method
qc_type
sequence_no
```

정렬:

```text
sequence_no asc
```

주요 사용처:
- Specification fallback
- COA fallback
- MSDS appearance / odor / pH fallback

### `labdoc_product_english_specs`

기준 조건:

```text
product_code = 요청 productCode
```

조회 컬럼:

```text
test_item
specification
result
```

주요 사용처:
- Specification 1순위 데이터
- COA 1순위 데이터
- MSDS 물성 1순위 데이터

### `labdoc_allergen_regulations`

조회 컬럼:

```text
id
allergen_name
inci_name
cas_no
threshold_leave_on
threshold_rinse_off
```

주요 사용처:
- 알러젠 리스트의 83개 기준 물질 목록
- Leave-on / Rinse-off threshold 기준값

### `labdoc_fragrance_allergen_contents`

기준 조건:

```text
fragrance_code in 정규화된 BOM 원료 코드 목록
```

조회 컬럼:

```text
fragrance_code
fragrance_name
allergen_name
cas_no
content_in_fragrance
```

주요 사용처:
- 향료 원료 내 알러젠 함량 계산

### `labdoc_product_inci`

기준 조건:

```text
product_code = 요청 productCode
```

조회 컬럼:

```text
inci_ko
inci_en
inci_cpnp
```

주의:
- 현재 공통 데이터로 조회하지만, 9종 PDF 생성기에서는 직접 출력하지 않는다.

### `labdoc_test_certificates`

기준 조건:

```text
product_code = 요청 productCode
qc_type in ('pet', 'stability', 'mlt')
```

공통 정렬:

```text
test_date desc
limit 1
```

공통 사용 컬럼:

```text
certificate_no
lot_no
test_date
judgment_date
overall_judgment
approver
tester
results
notes
manufacture_date
```

주의:
- `select('*')`로 조회한다.
- PET / Stability / MLT별 추가 필드는 대부분 `notes` JSON에서 보완 조회한다.

## 9가지 문서별 매핑

### 1. 복합전성분표

문서 타입:

```text
composition_formula
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-composition-formula.ts
```

사용 테이블:
- `labdoc_products`
- `bom_master`
- `labdoc_ingredient_components`
- `labdoc_ingredients`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| References | `labdoc_products.product_code` | 그대로 출력 |
| No | BOM 순번 | `sequence_no` 또는 index |
| Trade Name | `labdoc_ingredients.ingredient_name`, `bom_master.materialname` | 원료명 우선, 없으면 BOM명 |
| WT% | `bom_master.usemount` | 같은 base code는 합산 |
| INCI Name | `labdoc_ingredient_components.inci_name_en`, `inci_name_kr` | 영문 INCI 우선 |
| % in Raw Material | `composition_ratio` | 원료 내 구성성분 비율 |
| % Calculated | `usemount`, `composition_ratio` | `usemount * composition_ratio / 100` |
| Function | `function` | 그대로 출력 |
| CAS No | `cas_number` | 그대로 출력 |
| Total | `bom.content_ratio` 합계 | 원료 WT% 합산 |

핵심 계산:

```text
percentCalculated = bom_master.usemount * labdoc_ingredient_components.composition_ratio / 100
```

### 2. 싱글전성분표

문서 타입:

```text
single_formula
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-single-formula.ts
```

사용 테이블:
- `labdoc_products`
- `bom_master`
- `labdoc_ingredient_components`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| References | `labdoc_products.product_code` | 그대로 출력 |
| INCI Name | `labdoc_ingredient_components.inci_name_en` | 영문 INCI만 사용, 없으면 `Unknown` |
| WT% | `bom_master.usemount`, `composition_ratio` | 같은 INCI명끼리 합산 |
| Function | `function` | 최초 발견값 사용 |
| CAS No | `cas_number` | 최초 발견값 사용 |
| Total | 계산된 INCI WT% 합계 | 모든 INCI 합산 |

핵심 계산:

```text
calculatedPercent = bom_master.usemount * composition_ratio / 100
INCI별 WT% = 같은 inci_name_en의 calculatedPercent 합계
```

주의:
- 현재 단일전성분표는 `inci_name_kr` fallback을 쓰지 않는다.
- `inci_name_en`이 비어 있으면 `Unknown`으로 병합될 수 있다.

### 3. 알러젠 리스트

문서 타입:

```text
allergen_list
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-allergen-list.ts
```

사용 테이블:
- `labdoc_products`
- `bom_master`
- `labdoc_allergen_regulations`
- `labdoc_fragrance_allergen_contents`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| References | `labdoc_products.product_code` | 그대로 출력 |
| Product Type | `labdoc_products.cosmetic_type` | Leave-on / Rinse-off 추정 |
| Allergen Name | `labdoc_allergen_regulations.allergen_name` | 기준 목록 |
| INCI Name | `labdoc_allergen_regulations.inci_name` | 기준 목록 |
| CAS No | `labdoc_allergen_regulations.cas_no` | 기준 목록 |
| Direct Use (%) | 현재 계산 없음 | 항상 `0` |
| Via Natural Product (%) | `bom_master.usemount`, `content_in_fragrance` | 향료 유래 알러젠 계산 |
| Total (%) | Direct + Via Natural | 현재는 Via Natural과 동일 |
| % in Final Product | Total | 그대로 사용 |
| Detected | threshold 비교 | `percentInFinalProduct >= threshold` |

제품 타입 판정:

```text
cosmetic_type에 rinse, wash, shampoo, cleanser, soap 포함 -> Rinse-off
그 외 -> Leave-on
```

threshold:

```text
Rinse-off: labdoc_allergen_regulations.threshold_rinse_off, 없으면 0.01
Leave-on: labdoc_allergen_regulations.threshold_leave_on, 없으면 0.001
```

핵심 계산:

```text
fragranceRatio = BOM에서 fragrance_code와 같은 ingredient_code의 usemount 합계
viaNaturalPercent = fragranceRatio * content_in_fragrance / 100
```

주의:
- 직접 첨가 알러젠 계산은 현재 구현되어 있지 않아 `Direct Use (%) = 0`이다.
- 향료 알러젠만 `labdoc_fragrance_allergen_contents`를 통해 계산한다.

### 4. Specification

문서 타입:

```text
specification
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-specification.ts
```

사용 테이블:
- `labdoc_products`
- `labdoc_product_english_specs`
- `labdoc_product_qc_specs`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| Capacity | `labdoc_products.label_volume` | 없으면 `—` |
| Test Items | `labdoc_product_english_specs.test_item` | 1순위 |
| Specification | `labdoc_product_english_specs.specification` | 1순위 |
| Method of Testing | `labdoc_product_english_specs.result` | 1순위에서 method로 사용 |

fallback:
- `labdoc_product_english_specs`에 출력 가능한 행이 있으면 그것만 사용한다.
- 없으면 `labdoc_product_qc_specs`를 사용한다.

fallback 컬럼:

| PDF 항목 | fallback 컬럼 |
|---|---|
| Test Items | `test_item_en` |
| Specification | `specification_en` |
| Method of Testing | `test_method` |

fallback 필터:

```text
qc_type = '완제품' 또는 영문 필드가 존재하는 행
```

### 5. 완제품 COA

문서 타입:

```text
coa
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-coa.ts
```

사용 테이블:
- `labdoc_products`
- `labdoc_product_english_specs`
- `labdoc_product_qc_specs`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| References | `labdoc_products.management_code` | 없으면 `—` |
| Date of issue | 현재 날짜 | 생성일 |
| Tests | `labdoc_product_english_specs.test_item` | 1순위 |
| Specifications | `labdoc_product_english_specs.specification` | 1순위 |
| Results | `labdoc_product_english_specs.result` | 없으면 `PASSED TO THE TEST` |
| Conclusion | 고정값 | `ACCEPTED` |

fallback:
- `labdoc_product_english_specs`에 test item이 있으면 그것만 사용한다.
- 없으면 `labdoc_product_qc_specs`를 사용한다.

fallback 컬럼:

| PDF 항목 | fallback 컬럼 |
|---|---|
| Tests | `test_item_en` |
| Specifications | `specification_en` |
| Results | 현재 타입에는 없지만 `result`가 있으면 사용, 없으면 `PASSED TO THE TEST` |

fallback 필터:

```text
test_item_en이 있는 행
qc_type = '완제품' 또는 test_item_en 존재
```

### 6. 완제품 MSDS

문서 타입:

```text
msds
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-msds.ts
```

사용 테이블:
- `labdoc_products`
- `bom_master`
- `labdoc_ingredient_components`
- `labdoc_product_english_specs`
- `labdoc_product_qc_specs`

출력 항목 매핑:

| PDF 항목 | 원천 테이블/컬럼 | 로직 |
|---|---|---|
| Finished Product Name | `labdoc_products.english_name`, `korean_name` | 영문명 우선 |
| Product Application | `labdoc_products.cosmetic_type` | 없으면 `Skin care cosmetics` |
| INCI Name | `labdoc_ingredient_components.inci_name_en`, `inci_name_kr` | 영문 우선 |
| CAS No | `cas_number` | 없으면 `-` |
| Reference | 고정값 | `ICID` |
| Function | `function` | 없으면 `-` |
| Appearance | specs 또는 `labdoc_products.appearance` | 아래 물성 조회 |
| Fragrance | specs | odor/odour 검색, 없으면 `Same as Standard` |
| pH | specs 또는 `labdoc_products.ph_standard` | 아래 물성 조회 |
| Estimated Alcohol Content | BOM + 구성성분 계산 | 알코올 성분만 합산 |
| Flash Point | 알코올 위험도 계산 | 추정 문구 |

물성 조회 순서:

```text
1. labdoc_product_english_specs.test_item에 keyword 포함
2. labdoc_product_qc_specs.test_item_en 또는 test_item에 keyword 포함
3. product fallback
```

알코올 함량 계산:

```text
alcoholPercent = sum(bom_master.usemount * composition_ratio / 100)
단, INCI명 또는 한글명에 ethanol, alcohol denat., isopropyl alcohol, 에탄올 등 패턴이 매칭되는 구성성분만 포함
```

위험도:

```text
0 이하: none
0 초과 24 미만: caution
24 이상: flammable
```

Flash point 문구:

```text
flammable: Below 60°C (estimated, final product flash point verification required)
caution: Above 60°C or not applicable under normal cosmetic use (estimated)
none: Not applicable
```

주의:
- MSDS는 규제 확정값이 아니라 현재 데이터 기반 추정 문구를 출력한다.

### 7. Challenge Test (PET)

문서 타입:

```text
pet
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-pet.ts
```

사용 테이블:
- `labdoc_products`
- `labdoc_test_certificates`

조회 조건:

```text
product_code = 요청 productCode
qc_type = 'pet'
test_date desc
limit 1
```

기본 출력 항목:

| PDF 항목 | 원천 컬럼 |
|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` |
| Lab No. | `notes.lab_no` 또는 raw `lab_no` |
| Test Date | `notes.test_start_date`, `notes.test_end_date`, `test_date` |
| Criteria | `notes.criteria` 또는 raw `criteria` |
| Date of Decision | `judgment_date`, `test_end_date` |
| Final Decision | `overall_judgment` |

`results` JSON 매핑:

| PDF 항목 | results key 후보 |
|---|---|
| Challenge Organism | `organism`, `test_item` |
| Count D0 | `initial_count`, `count_d0` |
| Log Reduction D7 | `log_reduction_d7`, `d7` |
| D14 | `log_reduction_d14`, `d14` |
| D28 | `log_reduction_d28`, `d28` |
| Conclusion | `conclusion`, `judgment` |

대상 균주 매칭:
- `S. aureus`
- `P. aeruginosa`
- `E. coli`
- `C. albicans`
- `A. brasiliensis`

주의:
- 기준표 자체는 PDF 생성기 내부 고정 템플릿이다.
- 결과값은 `labdoc_test_certificates.results` JSON에서 균주명 matcher로 찾아 채운다.

### 8. Stability Test

문서 타입:

```text
stability
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-stability.ts
```

사용 테이블:
- `labdoc_products`
- `labdoc_test_certificates`

조회 조건:

```text
product_code = 요청 productCode
qc_type = 'stability'
test_date desc
limit 1
```

기본 출력 항목:

| PDF 항목 | 원천 컬럼 |
|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` |
| Lot No. | `lot_no` |
| Manufacturing Date | `manufacture_date` |
| Date of Decision | `judgment_date`, `test_date` |
| Final Decision | `overall_judgment` |

`results` JSON 매핑:

| 내부 항목 | results key 후보 |
|---|---|
| parameter | `parameter`, `test_item` |
| temperature | `temperature`, `condition` |
| 0 day | `day_0`, `d0` |
| 14 days | `day_14`, `d14` |
| 1 month | `month_1`, `m1` |
| 2 months | `month_2`, `m2` |
| 3 months | `month_3`, `m3` |

고정 조건:

```text
4°C
25°C / 60% RH
45°C / 75% RH
```

고정 파라미터:

```text
Appearance
Color
Odour
pH
Viscosity
```

매칭 로직:

```text
results.temperature에 조건 문자열 포함
results.parameter에 파라미터 문자열 포함
```

### 9. 미생물 테스트 (MLT)

문서 타입:

```text
mlt
```

PDF 생성기:

```text
src/lib/doc-gen/cpnp/pdf-mlt.ts
```

사용 테이블:
- `labdoc_products`
- `labdoc_test_certificates`

조회 조건:

```text
product_code = 요청 productCode
qc_type = 'mlt'
test_date desc
limit 1
```

기본 출력 항목:

| PDF 항목 | 원천 컬럼 |
|---|---|
| Product Name | `labdoc_products.english_name`, `korean_name` |
| Lot No. | `lot_no` |
| Test Start Date | `notes.test_start_date`, `test_date` |
| Test End Date | `notes.test_end_date`, `test_date` |
| Tester | `tester` |
| Test method | `notes.method` 또는 raw `method`, 없으면 고정 문구 |
| Date of Decision | `judgment_date`, `test_end_date` |
| Final Decision | `overall_judgment`, 없으면 `PASS` |

`results` JSON 매핑:

| 내부 항목 | results key 후보 |
|---|---|
| test_item | `test_item`, `organism` |
| specification | `specification` |
| result | `result` |

고정 시험 항목 및 규격:

| Test Item | Specification | matcher |
|---|---|---|
| Total Aerobic Microbial Count | `≤ 1,000 CFU/g(ml)` | `total aerobic microbial count`, `tamc` |
| Total Combined Yeasts & Molds Count | `≤ 100 CFU/g(ml)` | `total combined yeasts`, `tymc` |
| Escherichia Coli | `Not Detected in 1g(ml)` | `escherichia coli`, `e. coli` |
| Pseudomonas Aeruginosa | `Not Detected in 1g(ml)` | `pseudomonas aeruginosa`, `p. aeruginosa` |
| Staphylococcus Aureus | `Not Detected in 1g(ml)` | `staphylococcus aureus`, `s. aureus` |
| Candida Albicans | `Not Detected in 1g(ml)` | `candida albicans`, `c. albicans` |

주의:
- PDF에 표시되는 규격은 `labdoc_test_certificates.results.specification`이 아니라 생성기 내부 고정 규격을 사용한다.
- Supabase 결과에서는 각 항목의 `result`만 matcher로 찾아 채운다.

## 문서 타입별 테이블 요약

| 문서 | 핵심 테이블 |
|---|---|
| 복합전성분표 | `labdoc_products`, `bom_master`, `labdoc_ingredient_components`, `labdoc_ingredients` |
| 싱글전성분표 | `labdoc_products`, `bom_master`, `labdoc_ingredient_components` |
| 알러젠 리스트 | `labdoc_products`, `bom_master`, `labdoc_allergen_regulations`, `labdoc_fragrance_allergen_contents` |
| Specification | `labdoc_products`, `labdoc_product_english_specs`, `labdoc_product_qc_specs` |
| 완제품 COA | `labdoc_products`, `labdoc_product_english_specs`, `labdoc_product_qc_specs` |
| 완제품 MSDS | `labdoc_products`, `bom_master`, `labdoc_ingredient_components`, `labdoc_product_english_specs`, `labdoc_product_qc_specs` |
| Challenge Test (PET) | `labdoc_products`, `labdoc_test_certificates` |
| Stability Test | `labdoc_products`, `labdoc_test_certificates` |
| 미생물 테스트 (MLT) | `labdoc_products`, `labdoc_test_certificates` |

## 현재 구현상 주의점

- 공통 조회 구조라서 선택한 문서가 일부여도 여러 테이블을 같이 조회한다.
- `labdoc_product_inci`와 `labdoc_ingredients`의 문서 URL 컬럼들은 현재 조회되지만 PDF 출력에는 직접 쓰이지 않는다.
- 복합전성분표와 단일전성분표의 핵심 정확도는 `bom_master.usemount`와 `labdoc_ingredient_components.composition_ratio`에 의존한다.
- 단일전성분표는 현재 `inci_name_en`만 사용한다. 영문 INCI가 없으면 `Unknown`으로 출력 및 병합된다.
- 알러젠 리스트는 향료 유래 알러젠만 계산하고, 직접 첨가 알러젠은 현재 `0`으로 처리한다.
- PET, Stability, MLT는 `labdoc_test_certificates.results` JSON 구조가 matcher와 맞아야 값이 채워진다.
- `cpnp_document_generations` 테이블은 생성 이력용이다. 없어도 PDF 생성은 가능하지만, 이력 목록은 비어 보인다.
