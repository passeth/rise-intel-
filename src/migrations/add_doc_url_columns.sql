-- Migration: Add document URL columns to labdoc_products
-- Run this in the Supabase Dashboard SQL Editor (project: usvjbuudnofwhmclwhfl)
-- Date: 2026-03-19

ALTER TABLE labdoc_products
  ADD COLUMN IF NOT EXISTS ingredients_en_pdf_url text,
  ADD COLUMN IF NOT EXISTS ingredients_en_csv_url text,
  ADD COLUMN IF NOT EXISTS formula_breakdown_pdf_url text,
  ADD COLUMN IF NOT EXISTS formula_breakdown_csv_url text,
  ADD COLUMN IF NOT EXISTS inci_summary_pdf_url text,
  ADD COLUMN IF NOT EXISTS inci_summary_csv_url text;

COMMENT ON COLUMN labdoc_products.ingredients_en_pdf_url IS 'Formula Ingredients Statement (EN) PDF URL in Supabase Storage';
COMMENT ON COLUMN labdoc_products.ingredients_en_csv_url IS 'Formula Ingredients Statement (EN) CSV URL in Supabase Storage';
COMMENT ON COLUMN labdoc_products.formula_breakdown_pdf_url IS 'Formula Breakdown PDF URL in Supabase Storage';
COMMENT ON COLUMN labdoc_products.formula_breakdown_csv_url IS 'Formula Breakdown CSV URL in Supabase Storage';
COMMENT ON COLUMN labdoc_products.inci_summary_pdf_url IS 'INCI Ingredient Summary PDF URL in Supabase Storage';
COMMENT ON COLUMN labdoc_products.inci_summary_csv_url IS 'INCI Ingredient Summary CSV URL in Supabase Storage';
