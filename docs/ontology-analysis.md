# Rise-Intel System Ontology Analysis

> 분석일: 2026-03-23 | 대상: rise-intel (Cosmetics R&D Automation & Ingredient Intelligence)

---

## 1. System Overview

| 항목 | 수치 |
|------|------|
| **Tables** | 94개 |
| **Views** | 38개 |
| **RPCs/Functions** | ~80개 |
| **Schema** | public (단일) |
| **Shared DB** | commerce (RISE MES와 동일 Supabase 인스턴스) |
| **Code Architecture** | Next.js 16 + Server Actions (actions.ts 25개) |
| **External Data** | INCIDecoder, CosIng, MFDS, Vector Embeddings |

---

## 2. Domain Clusters (9개 도메인)

### 2.1 Lab Documentation (labdoc_*) — 핵심 도메인

화장품 R&D 문서 관리의 중심. 제품 사양서, 성분 관리, QC, 제조공정 등.

| 테이블 | 역할 | 주요 컬럼 |
|--------|------|-----------|
| `labdoc_products` | 제품 마스터 (PIF 중심) | product_code, cosmetic_type, inci, allergen, ph, viscosity, shelf_life |
| `labdoc_products_old` | 레거시 제품 데이터 | prdcode, category, status |
| `labdoc_ingredients` | 원료 마스터 | ingredient_code, manufacturer, coa_urls, msds_urls |
| `labdoc_ingredient_components` | 원료별 INCI 성분 | inci_name_en, cas_number, composition_ratio, function |
| `labdoc_ingredient_physical_properties` | 원료 물성 데이터 | property_name, value_min/max, unit |
| `labdoc_ingredient_specs` | 원료 시험 규격 | spec_item, spec_standard, test_method, result_value |
| `labdoc_ingredient_certificates` | 원료 시험성적서 | lot_no, results(JSON), overall_judgment, pdf_url |
| `labdoc_ingredient_receipts` | 원료 입고 기록 | receipt_date, lot_no, supplier, coa_reference |
| `labdoc_product_bom` | 제품별 BOM (배합표) | product_code → ingredient_code, content_ratio |
| `labdoc_product_inci` | 제품 INCI 선언 | (product_code 기반) |
| `labdoc_product_qc_specs` | 제품 QC 규격 | test_item, specification, test_method, qc_type |
| `labdoc_product_msds_properties` | 제품 MSDS 물성 | property_name, calculated_value, auto_calculated |
| `labdoc_product_english_specs` | 영문 사양서 | (product_code 기반) |
| `labdoc_product_revisions` | 제품 개정 이력 | revision_no, revision_date, revision_content |
| `labdoc_product_subsidiary_materials` | 부자재 정보 | material_name, material_spec, vendor |
| `labdoc_product_work_specs` | 작업 사양서 | fill_volume, color, production_cautions |
| `labdoc_manufacturing_processes` | 제조공정 | product_code, batch_number, mfg_date, step_count |
| `labdoc_manufacturing_process_steps` | 공정 단계 | step_num, step_name, step_desc, work_time |
| `labdoc_test_certificates` | 제품 시험성적서 | certificate_no, lot_no, qc_type, results(JSON) |
| `labdoc_test_specs` | 원료 시험 항목 | ingredient_code, test_item, specification |
| `labdoc_allergen_regulations` | 알레르겐 규정 | allergen_name, inci_name, cas_no, threshold |
| `labdoc_fragrance_allergen_contents` | 향료 알레르겐 함량 | fragrance_code, allergen_name, content_in_fragrance |
| `labdoc_msds_settings` | MSDS 설정값 | caution_threshold, flammable_threshold |

**FK 관계:**
- `labdoc_ingredient_certificates` → `labdoc_ingredient_receipts` (receipt_id)
- `labdoc_ingredient_components` → `labdoc_ingredients` (ingredient_code)
- `labdoc_ingredient_physical_properties` → `labdoc_ingredients` (ingredient_code)
- `labdoc_manufacturing_process_steps` → `labdoc_manufacturing_processes` (process_id)
- `labdoc_product_msds_properties` → `labdoc_products` (product_code)
- `labdoc_product_qc_specs` → `labdoc_products` (product_code, via qc_type)
- `labdoc_test_certificates` → `labdoc_products` (product_code)
- `labdoc_test_specs` → `labdoc_ingredients` (ingredient_code)

---

### 2.2 Lab Intelligence (lab_*) — AI/크롤링 기반 성분 DB

외부 데이터 소스(INCIDecoder, CosIng, MFDS)에서 수집한 성분 인텔리전스.

| 테이블 | 역할 | 주요 컬럼 |
|--------|------|-----------|
| `lab_ingredients` | INCIDecoder 성분 DB | slug, name, rating, functions[], cosing_cas/ec_number |
| `lab_products` | INCIDecoder 제품 DB | slug, brand, ingredients_list, highlights |
| `lab_ingredient_product` | 성분↔제품 매핑 (M:N) | ingredient_slug, product_slug |
| `lab_inci_matches` | INCI 매칭 엔진 결과 | inci_name_normalized, match_confidence, mfds_registered |
| `lab_regulations` | 규제 정보 (EU/MFDS) | regulation_source, annex, max_concentration, warnings |
| `lab_categories` | 성분 카테고리 | name |
| `lab_research_reports` | AI 연구 보고서 | subject_type, report_content(JSON), model_used |

---

### 2.3 Commerce/Coupang (cm_*) — 커머스 운영

| 테이블 | 역할 |
|--------|------|
| `cm_coupang_orders` | 쿠팡 발주 |
| `cm_coupang_shipments` | 쿠팡 출하 |
| `cm_coupang_fulfillment_centers` | 쿠팡 물류센터 |
| `cm_coupang_sku_mapping` | SKU 매핑 |
| `cm_product_master` / `cm_products_master` | 상품 마스터 |
| `cm_production_lots` | 생산 LOT |
| `cm_lot_manufacturing_dates` | LOT 제조일 |
| `cm_erp_inventory` / `cm_erp_products` | ERP 연동 |
| `cm_gift_promotions` / `cm_promo_rules` | 프로모션 |
| `cm_order_gifts` | 사은품 |
| `cm_kit_bom_items` | 키트 BOM |
| `cm_raw_order_lines` / `cm_raw_mapping_rules` | 주문 매핑 |
| `cm_sales_platforms` | 판매 플랫폼 |
| `cm_export_history` | 수출 이력 |
| `cms_product_master` / `cms_sales_data` | 판매 데이터 |

---

### 2.4 Vector/AI (vectors_*, vp_*) — AI 엔진

| 테이블 | 역할 |
|--------|------|
| `vectors_formula` | 배합 벡터 임베딩 |
| `vectors_ingredient` | 성분 벡터 임베딩 |
| `vp_creative_formula` | AI 창작 배합 |
| `vp_formula` | 배합 레시피 |
| `vp_formula_ingredients` | 배합 성분 |
| `vp_ingredient` | VP 성분 마스터 |
| `vp_productlink` | 제품 링크 |

---

### 2.5 RISE MES Shared (rise_*) — MES 공유 데이터

| 테이블 | 역할 | 접근 방식 |
|--------|------|-----------|
| `bom_master` | BOM 마스터 | 공유 읽기전용 |
| `product_images` | 제품 이미지 | 공유 읽기전용 |
| `rise_erp_inventory` | ERP 재고 | 공유 |
| `rise_erp_materials` | ERP 자재 | 공유 |
| `rise_purchase_orders` | 발주 | 공유 |
| `rise_suppliers` | 거래처 | 공유 |

**Views (MES 데이터):** `rise_products`, `rise_products_view`, `rise_lots_view`, `rise_production_plans_view`, `rise_calendar_schedules_view`, `rise_schedules_full`, `rise_work_operations`, `rise_workers`, `rise_workers_v2`, `rise_equipments`

---

### 2.6 RiseWork (risework_*) — 업무 관리

| 테이블 | 역할 |
|--------|------|
| `risework_projects` | 프로젝트 |
| `risework_tasks` | 태스크 |
| `risework_task_files` | 첨부파일 |
| `risework_daily_tasks` | 일일 업무 |
| `risework_calendar_events` | 캘린더 |
| `risework_team_members` | 팀원 |

---

### 2.7 RU (ru_*) — 해외 거래

| 테이블 | 역할 |
|--------|------|
| `ru_orders` / `ru_order_items` | 해외 주문 |
| `ru_invoices` | 인보이스 |
| `ru_packing_lists` / `ru_packing_items` | 패킹리스트 |
| `ru_prices` / `ru_products` | 해외 가격/상품 |
| `ru_users` | 해외 사용자 |

---

### 2.8 Market Intelligence (product_*) — 시장 분석

| 테이블 | 역할 |
|--------|------|
| `product_catalog` | 제품 카탈로그 |
| `product_inci_master` | 크롤링 기반 INCI 분석 |
| `product_images` | 제품 이미지 |

---

### 2.9 System/Auth

| 테이블 | 역할 |
|--------|------|
| `user_profiles` | 사용자 프로필 |
| `user_roles` | 역할 관리 |
| `role_permissions` | 권한 관리 |
| `agent_memory_bank` | AI 에이전트 메모리 |
| `ceo_ai_analyses` | CEO AI 분석 |
| `meeting_logs` | 회의록 |
| `n8n_chat_histories` | n8n 챗 이력 |
| `work_requests` | 업무 요청 |
| `tiktok_posts` | TikTok 콘텐츠 |
| `vive_result` | Vive 결과 |
| `nu_*` (4 tables) | 뉴트리션 컨설팅 |

---

## 3. Entity Relationship Summary

### 핵심 관계 허브

```
labdoc_products (product_code)
    ├── labdoc_product_bom → labdoc_ingredients (ingredient_code)
    │       ├── labdoc_ingredient_components (INCI 성분)
    │       ├── labdoc_ingredient_physical_properties (물성)
    │       ├── labdoc_ingredient_specs (시험규격)
    │       ├── labdoc_ingredient_receipts (입고)
    │       │       └── labdoc_ingredient_certificates (시험성적서)
    │       └── labdoc_test_specs (시험항목)
    ├── labdoc_product_qc_specs (QC 규격)
    ├── labdoc_product_msds_properties (MSDS 물성)
    ├── labdoc_product_inci (INCI 선언)
    ├── labdoc_product_english_specs (영문사양)
    ├── labdoc_product_revisions (개정이력)
    ├── labdoc_product_subsidiary_materials (부자재)
    ├── labdoc_product_work_specs (작업사양)
    ├── labdoc_manufacturing_processes (제조공정)
    │       └── labdoc_manufacturing_process_steps (공정단계)
    ├── labdoc_test_certificates (시험성적서)
    └── labdoc_allergen_regulations ← labdoc_fragrance_allergen_contents
```

### Intelligence Layer

```
lab_ingredients (slug) ←→ lab_ingredient_product ←→ lab_products (slug)
       ↑
lab_inci_matches (inci_name_normalized → incidecoder_slug)
       ↑
labdoc_ingredient_components (inci_name_en) — 논리적 연결

lab_regulations (inci_name, cas_number) — 규제 크로스레퍼런스
lab_research_reports (subject_identifier) — AI 연구 결과
```

### Cross-Domain 연결

```
bom_master (MES) ←― product_code ―→ labdoc_products (Intel)
rise_products (MES View) ← 제품 메타데이터 공유
product_images (MES) ← 이미지 공유
```

---

## 4. Page × Table Matrix (주요 페이지)

### v1 Routes

| 페이지 | 주요 테이블 | 작업 |
|--------|-------------|------|
| /products | labdoc_products, product_images | R |
| /products/[code] | labdoc_products, labdoc_product_bom, labdoc_ingredient_components, labdoc_product_qc_specs | R/U |
| /products/[code]/inci | labdoc_product_inci, labdoc_ingredient_components | R/C |
| /products/[code]/english | labdoc_product_english_specs | R/U |
| /products/[code]/msds | labdoc_product_msds_properties, labdoc_msds_settings | R/U |
| /ingredients | labdoc_ingredients, labdoc_ingredient_components | R |
| /ingredients/[code] | labdoc_ingredients, labdoc_ingredient_components, labdoc_ingredient_physical_properties, labdoc_ingredient_specs | R/U |
| /ingredients/[code]/receipts | labdoc_ingredient_receipts, labdoc_ingredient_certificates | R/C |
| /qc | labdoc_test_certificates, labdoc_product_qc_specs | R/C |
| /manufacturing | labdoc_manufacturing_processes, labdoc_manufacturing_process_steps | R/U |
| /allergen | labdoc_allergen_regulations, labdoc_fragrance_allergen_contents | R |
| /intelligence | lab_ingredients, lab_inci_matches, lab_regulations | R |
| /intelligence/research | lab_research_reports | R/C |

### v2 Routes (PIF 중심 구조)

| 페이지 | 주요 테이블 | 작업 |
|--------|-------------|------|
| /v2/pif | labdoc_products (PIF 목록) | R |
| /v2/pif/[code] | labdoc_products + 모든 하위 테이블 | R/U |
| /v2/qc | labdoc_test_certificates | R/C/U |
| /v2/intelligence | lab_* 테이블 전체 | R |

---

## 5. RPC/Functions 분류

### 제조/생산 (MES 공유)
`complete_manufacturing_report`, `complete_production_plan_v2`, `complete_work_operations`, `create_production_plan_v2`, `insert_lot`, `insert_production_plan_report`, `reopen_manufacturing_report`, `rise_calculate_material_requirements`, `rise_sync_bom`, `transfer_remaining_qty_v2`, `update_manufacturing_report`, `update_operations_by_plan_date`, `update_plan_target_date`, `update_production_plan_report`, `update_production_plan_v2`, `update_production_report`, `upsert_work_operation`, `upsert_work_operation_v2`, `add_lot_entry_v2`, `update_lot_weighing_url`

### AI/검색 (Intelligence)
`find_ingredients_by_names`, `find_similar_ingredients`, `match_formulas_by_embedding`, `match_ingredients_by_embedding`, `recommend_ingredients_*` (5개), `search_by_text`, `search_integrated_insights`, `search_market_trends`, `search_products_*` (4개), `search_similar_*` (4개), `get_comprehensive_recommendations_fixed`, `get_robust_recommendations`, `get_smart_recommendations`, `validate_research_quality`, `update_ingredient_research`

### 커머스 운영
`fn_get_coupang_order_summary`, `fn_get_dispatch_summary`, `get_daily_shipments`, `cm_calculate_lot_remaining`, `apply_mapping_rule`, `op_*` (3개)

### 시스템
`get_user_permissions`, `get_user_role`, `has_permission`, `add_credits`, `deduct_credits`, `grant_credits`, `analyze_all_tables`, `get_dashboard_stats_v2`

---

## 6. 아키텍처 특성

### 강점
- **Zero `as any`/`@ts-ignore`** — 타입 안전성 우수
- **Server Actions 패턴** — actions.ts 25개 파일로 일관된 구조
- **AI-Native 설계** — 벡터 임베딩, 연구 보고서, INCI 매칭 엔진 내장
- **풍부한 외부 데이터 통합** — INCIDecoder, CosIng, MFDS 규제 DB

### 특이사항
- **MES와 DB 공유** — 동일 Supabase 인스턴스에서 rise_* Views로 MES 데이터 접근
- **RPC 0개 (코드 레벨)** — 앱에서 `.rpc()` 직접 호출 없음, 모든 RPC는 Views/DB trigger 레벨
- **이중 제품 체계** — labdoc_products (신규) + labdoc_products_old (레거시)
- **v1/v2 병행** — PIF 중심 v2로 전환 중, v1 라우트 유지

### 개선 기회
- labdoc_products에 FK 미설정 (product_code 기반 논리적 관계만 존재)
- lab_ingredients ↔ labdoc_ingredient_components 간 물리적 FK 없음
- 규제 데이터(lab_regulations)와 제품 데이터 간 자동 크로스체크 부재

---

## 7. MES ↔ Intel 통합 지점

| MES 테이블/뷰 | Intel 사용처 | 연결 키 |
|---------------|-------------|---------|
| `bom_master` | 제품 BOM 참조 | prdcode = product_code |
| `rise_products` (View) | 제품 메타데이터 | product_code |
| `product_images` | 제품 이미지 표시 | product_code |
| `rise_erp_inventory` | 재고 현황 참조 | product_code |
| `rise_lots_view` (View) | LOT 추적 | lot_no |
| `rise_production_plans_view` (View) | 생산계획 참조 | plan_id |

---

*이 문서는 rise-intel 프로젝트의 94개 테이블, 38개 Views, ~80개 RPC를 9개 도메인으로 분류한 시스템 온톨로지입니다.*
