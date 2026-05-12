-- ============================================================
-- Migration: 원료 물성 DB + 제품 MSDS 물성 캐시 테이블
-- Purpose: MSDS 자동 생성에 필요한 물성 데이터 관리
-- ============================================================

-- 1. 원료별 물리/화학적 물성 테이블
-- 원료의 MSDS에서 추출한 물성 데이터를 저장
-- 제품 MSDS 자동 계산의 원천 데이터
CREATE TABLE IF NOT EXISTS labdoc_ingredient_physical_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_code TEXT NOT NULL REFERENCES labdoc_ingredients(ingredient_code) ON DELETE CASCADE,
  
  -- 물성 식별
  property_name TEXT NOT NULL,        -- 'melting_point', 'boiling_point', 'flash_point', 'density', 'vapor_pressure', 'solubility', 'refractive_index'
  property_name_en TEXT,              -- 'Melting/Freezing Point', 'Boiling Point', etc.
  property_name_kr TEXT,              -- '융점/빙점', '비점', etc.
  
  -- 값 (표시용 + 계산용)
  value_text TEXT,                    -- 표시용: '120-125°C', 'Not applicable', 'Miscible with water'
  value_min NUMERIC,                  -- 계산용 최소값: 120
  value_max NUMERIC,                  -- 계산용 최대값: 125 (범위인 경우)
  unit TEXT,                          -- '°C', 'g/cm³', 'hPa', etc.
  
  -- 메타데이터
  source TEXT,                        -- 'MSDS', 'COA', 'Measured', 'Literature'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 원료당 물성 항목은 유일해야 함
  UNIQUE(ingredient_code, property_name)
);

-- 2. 제품별 MSDS 물성 캐시 테이블
-- BOM 조성비 기반으로 자동 계산된 값을 저장
-- 필요 시 수동 오버라이드 가능
CREATE TABLE IF NOT EXISTS labdoc_product_msds_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES labdoc_products(product_code) ON DELETE CASCADE,
  
  -- 물성 식별
  property_name TEXT NOT NULL,        -- ingredient_physical_properties와 동일한 키
  property_name_en TEXT,
  
  -- 값
  calculated_value TEXT,              -- 자동 계산된 값 (표시용)
  calculated_numeric NUMERIC,         -- 자동 계산된 수치 (내부용)
  override_value TEXT,                -- 수동 오버라이드 (있으면 이 값 우선)
  
  -- 계산 정보
  calculation_method TEXT,            -- 'weighted_average', 'minimum', 'maximum', 'range'
  auto_calculated BOOLEAN DEFAULT TRUE,
  last_calculated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_code, property_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredient_phys_props_code 
  ON labdoc_ingredient_physical_properties(ingredient_code);

CREATE INDEX IF NOT EXISTS idx_product_msds_props_code 
  ON labdoc_product_msds_properties(product_code);

-- RLS (disable for now, enable if needed)
ALTER TABLE labdoc_ingredient_physical_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE labdoc_product_msds_properties ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON labdoc_ingredient_physical_properties
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON labdoc_product_msds_properties
  FOR ALL USING (true) WITH CHECK (true);
