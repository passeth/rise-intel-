-- Migration: MFDS cosmetic ingredient registry import table
-- Source file: 화장품원료성분정보조회_20250918.csv
-- Purpose:
--   Store the official cosmetic ingredient lookup data used to fill missing
--   Korean INCI/component names and expose the registry in the admin UI.

CREATE TABLE IF NOT EXISTS cosmetic_ingredient_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_no INTEGER NOT NULL,
  ingr_kor_name TEXT NOT NULL,
  ingr_eng_name TEXT,
  cas_no TEXT,
  origin_major_kor_name TEXT,
  ingr_synonym TEXT,
  source_rownum INTEGER,
  normalized_kor_name TEXT NOT NULL,
  normalized_eng_name TEXT,
  source_file TEXT NOT NULL DEFAULT '화장품원료성분정보조회_20250918.csv',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cosmetic_ingredient_registry_source_no_unique UNIQUE(source_no)
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_ingredient_registry_kor
  ON cosmetic_ingredient_registry(normalized_kor_name);

CREATE INDEX IF NOT EXISTS idx_cosmetic_ingredient_registry_eng
  ON cosmetic_ingredient_registry(normalized_eng_name);

CREATE INDEX IF NOT EXISTS idx_cosmetic_ingredient_registry_cas
  ON cosmetic_ingredient_registry(cas_no);

ALTER TABLE cosmetic_ingredient_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON cosmetic_ingredient_registry;
CREATE POLICY "Allow all for authenticated" ON cosmetic_ingredient_registry
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
