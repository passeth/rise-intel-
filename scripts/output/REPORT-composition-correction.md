# 성분 조성비 교정 작업 보고서

**작업 기간**: 2025-03-18 ~ 2025-03-19
**작업자**: AI 자동화 + 수동 검수
**대상 DB**: `labdoc_ingredient_components` (Supabase)

---

## 1. 배경

제품표준서 문서(CSV/PDF) 자동 생성 시, 성분 조성비(composition_ratio) 합계가 100%가 되지 않는 품목이 다수 발견됨.

**원인**: `labdoc_ingredient_components` 테이블에서 `composition_ratio = 0`으로 저장된 성분들.
코드 로직상 `null → 100%` (단일 성분 취급), `0 → 0%` (기여도 없음)으로 처리되어 문서의 성분 비율 합계가 100%에서 벗어남.

**계산 공식**: `calculatedPercent = (usemount / 1000) × (composition_ratio ?? 100) / 100`

---

## 2. 분석 결과 (교정 전)

| 항목 | 수치 |
|---|---|
| 전체 분석 품목 | 581개 (BOM 있는 제품) |
| 조성비 ≠ 100% 품목 | **204개** |
| 문제 원료 | **17개** |

---

## 3. Round 1 교정 — 원본 Excel 추출 (2025-03-18)

**데이터 소스**: `/에바스 원료리스트 원본.xls` → `조성비` 컬럼

| 원료코드 | 원료명 | 교정 내용 | 영향 품목 |
|---|---|---|---|
| MAB-0014 | — | INCI명 수정 + ratio 0→0.5 | 다수 |
| MAL-0022 | — | 누락 성분(Lactobacillus Ferment Filtrate) INSERT, ratio=97 | 다수 |
| MSM-0004 | — | Water ratio 70→69.5 | 다수 |
| MSM-0036 | — | Water 0→70, Coco-Betaine 0→30 | 다수 |
| MAP-0030 | Phyto Aqua HA-05 | Tremella Fuciformis Polysaccharide 0→0.5 | 4개 |

**결과**: 204 → **125개** 문제 품목, 17 → 13개 문제 원료
**문서 재발급**: 138개 제품 (각 12파일 = 1,656파일)

---

## 4. Round 2 교정 — 공급처 자료 확보 (2025-03-19)

### 4-1. 공급처 자료 확보 (7개 원료)

| 원료코드 | 원료명 | 공급처 | 조성비 | 비고 |
|---|---|---|---|---|
| MVC-0010 | Esaflor EC3 | lamberti / 코스파인 | 90, 10 | UPDATE 2건 |
| MAN-0011 | Nanoactive RAL | HANGZHOU LINGEBA / 에코텍 | 1.0, 3.5, 26.5, 0.2, 35, 33.8 | UPDATE 6건 + INCI명 변경 |
| MOF-0006 | Florasun-90 | 한주씨앤씨 | 99.95, 0.05 | UPDATE 2건 |
| MSE-0025 | Eumulgin HPS | BASF / 한백씨앤에프 | 39.02, 39.02, 14.64, 7.32 | UPDATE 3건 + INSERT Water |
| MVA-0007 | Adekanol GT-730 | hanskorea / 블루켐 | 29.94, 50.00, 20.00, 0.03, 0.03 | UPDATE 3건 + INSERT 2건 |
| MVB-0003 | Bentone Gel VS5PC-V | 이현에프앤씨 | 80.65, 13.44, 5.91 | UPDATE 3건 |
| MPS-0001 | Spectrastat | (미확인) | 70, 15, 15 | UPDATE 3건 + 순서 변경 |

### 4-2. INCI 성분명 갱신 (MPK-0001)

| 원료코드 | 원료명 | 공급처 | 변경 | 비고 |
|---|---|---|---|---|
| MPK-0001 | Kathon CG | Dupont / 태창물산 | 2→5개 성분으로 변경 + 조성비 입력 | DELETE 2건 + INSERT 5건 |

**변경 전**: Methylchloroisothiazolinone, Methylisothiazolinone (2개)
**변경 후**: 5-Chloro-2-methyl-4-isothiazolin-3-one(1.17), 2-Methyl-4-isothiazolin-3-one(0.38), Magnesium Chloride(0.75), Magnesium dinitrate(22.24), Water(75.46)

### 4-3. 단종 원료 (교정 불가)

| 원료코드 | 원료명 | 사유 | 영향 품목 |
|---|---|---|---|
| MDS-0012 | Silight 10M DS | 단종 | PDLB001 |
| MAA-0016 | Anti-Shadow Complex | 단종 | RSEX000 |

### 4-4. Round 2 결과

**문서 재발급**: 142개 + 18개 = **160개** 제품 (일부 중복 포함, 각 12파일)

---

## 5. 최종 결과

| 항목 | 교정 전 | Round 1 후 | Round 2 후 |
|---|---|---|---|
| 문제 품목 | 204개 | 125개 | **3개** |
| 문제 원료 | 17개 | 13개 | **5개** |
| 해결률 | — | 38.7% | **98.5%** |

### 미해결 3개 품목

| 품목코드 | 품목명 | 편차 | 원인 |
|---|---|---|---|
| PDLB001 | 페디슨 뉴트리티브 인퓨젼 립 수딩 밤 | -16.00% | MDS-0012 단종 (ratio sum=0%) |
| RSEX000 | 로즈문 리치 카멜리아 트리트먼트 에센스 | -0.04% | MAA-0016 단종 + MAP-0030 반올림 |
| AOHE001 | 샤샤 아르간 오일 웨이브 볼륨 에센스 | +0.03% | MXM-0003 반올림 (100.5%) |

### 미해결 5개 원료 (잔여)

| 원료코드 | 원료명 | 조성비 합 | 편차 | 사유 |
|---|---|---|---|---|
| MDS-0012 | Silight 10M DS | 0% | -100% | 단종 |
| MAA-0016 | Anti-Shadow Complex | 0% | -100% | 단종 |
| MXM-0003 | Mihapol PQ11-20 | 100.5% | +0.5% | 소수점 반올림 |
| MAP-0030 | Phyto Aqua HA-05 | 100.25% | +0.25% | 소수점 반올림 |
| MXB-0006 | BioGenic PCM CSS(28) 50T-XHO | 100.2% | +0.2% | 소수점 반올림 |

> MXM-0003, MAP-0030, MXB-0006는 편차 0.5% 이하로 실질적 영향 없음.

---

## 6. 산출물

| 파일 | 설명 |
|---|---|
| `scripts/analyze-composition.ts` | 전체 품목 조성비 분석 스크립트 |
| `scripts/apply-round2-corrections.ts` | Round 2 DB 교정 스크립트 |
| `scripts/batch-generate-docs.ts` | 문서 배치 재발급 스크립트 |
| `scripts/output/products-composition-issues.csv` | 미해결 품목 리스트 (3건) |
| `scripts/output/ingredients-composition-issues.csv` | 미해결 원료 리스트 (5건) |
| `scripts/output/supplier-request-composition-ratios.csv` | 공급처 자료 요청/수신 기록 |
| `scripts/output/composition-corrections-from-source.csv` | Round 1 Excel 추출 교정 데이터 |

---

## 7. 후속 조치 필요 사항

1. **MDS-0012 (Silight 10M DS)**: PDLB001 품목이 현행 제품인 경우, 대체 원료 또는 조성비 자료 확보 필요
2. **MAA-0016 (Anti-Shadow Complex)**: RSEX000 품목 동일
3. **반올림 오차 원료 3건**: 공급처에 정확한 소수점 조성비 재확인 가능 (현재 영향 미미)
