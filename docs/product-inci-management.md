# 제품 전성분 / 1% 미만 성분 관리

## 목적

제품별 INCI 합산 결과를 전성분 표시 데이터로 저장하고, 추후 1% 미만 성분의 표시 순서를 자유롭게 조정할 수 있도록 구조화 데이터를 유지한다.

## 테이블

### `labdoc_product_inci`

제품표준서 화면에서 바로 표시하는 전성분 문자열 테이블이다.

- `inci_ko`: 국문 전성분 문자열
- `inci_en`: 영문 전성분 문자열
- `inci_cpnp`: CPNP용 전성분 문자열
- `inci_fda`: FDA용 전성분 문자열

### `labdoc_product_inci_items`

제품별 전성분 항목을 구조화해 저장하는 테이블이다.

- `product_code`: 제품코드
- `merge_key`: 동일 INCI 합산 키
- `inci_name_ko`: 국문 INCI명
- `inci_name_en`: 영문 INCI명
- `wt_percent`: 제품 내 계산 함량
- `is_below_one_percent`: 1% 미만 여부
- `sort_group`: `gte_1` 또는 `lt_1`
- `calculated_order`: 함량 기준 계산 순서
- `declared_order`: 표시 순서. 1% 미만 성분 순서 조정 UI는 이 값을 변경한다.
- `source_ingredient_codes`: 합산에 사용된 원료코드 배열

## 정렬 기준

1. `wt_percent >= 1`: 함량 내림차순 고정 정렬 대상
2. `wt_percent < 1`: 기본값은 함량 내림차순이지만, 향후 표시 순서는 `declared_order`로 자유 조정 가능

## 생성/재생성 스크립트

```bash
# 전체 제품 전성분 문자열 + 구조화 항목 재생성
node scripts/migrate-product-inci-from-summary.mjs --overwrite

# 특정 제품만 재생성
node scripts/migrate-product-inci-from-summary.mjs --product=BTBC006 --overwrite

# 문자열은 건드리지 않고 구조화 항목만 재생성
node scripts/migrate-product-inci-from-summary.mjs --items-only
```

## 국문 INCI 보정

`cosmetic_ingredient_registry`의 `ingr_eng_name`과 `labdoc_ingredient_components.inci_name_en`을 정규화 매칭해 누락된 `inci_name_kr`를 보정한다.

적용 SQL: `sql/005_backfill_component_korean_inci_from_registry.sql`
