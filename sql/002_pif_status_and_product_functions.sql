-- ============================================================
-- Migration: PIF active/inactive status + product-scoped functions
-- Purpose:
--   1) Allow products to be classified as active/inactive in PIF.
--   2) Preserve ingredient/component master functions while allowing
--      product-specific function overrides for INCI and document output.
--   3) Backfill product-specific defaults from current component functions.
-- ============================================================

ALTER TABLE labdoc_products
  ADD COLUMN IF NOT EXISTS pif_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE labdoc_products
  DROP CONSTRAINT IF EXISTS labdoc_products_pif_status_check;

ALTER TABLE labdoc_products
  ADD CONSTRAINT labdoc_products_pif_status_check
  CHECK (pif_status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_labdoc_products_pif_status
  ON labdoc_products(pif_status);

CREATE TABLE IF NOT EXISTS labdoc_product_ingredient_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES labdoc_products(product_code) ON DELETE CASCADE,
  ingredient_code TEXT NOT NULL REFERENCES labdoc_ingredients(ingredient_code) ON DELETE CASCADE,
  function TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_code, ingredient_code)
);

CREATE TABLE IF NOT EXISTS labdoc_product_component_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES labdoc_products(product_code) ON DELETE CASCADE,
  ingredient_code TEXT NOT NULL REFERENCES labdoc_ingredients(ingredient_code) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES labdoc_ingredient_components(id) ON DELETE CASCADE,
  function TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_code, component_id)
);

CREATE INDEX IF NOT EXISTS idx_labdoc_product_ingredient_functions_product
  ON labdoc_product_ingredient_functions(product_code);

CREATE INDEX IF NOT EXISTS idx_labdoc_product_component_functions_product
  ON labdoc_product_component_functions(product_code);

-- Backfill product-level component functions from current ingredient component master data.
WITH normalized_bom AS (
  SELECT DISTINCT
    p.product_code,
    CASE
      WHEN b.materialcode ~ '^[A-Z]{3}-[0-9]{4}[A-Z]-'
        THEN regexp_replace(b.materialcode, '[A-Z]-[0-9]+[A-Z]*$', '')
      ELSE b.materialcode
    END AS ingredient_code
  FROM labdoc_products p
  JOIN bom_master b ON b.prdcode = p.semi_product_code
  WHERE b.materialcode IS NOT NULL
), component_defaults AS (
  SELECT
    nb.product_code,
    c.ingredient_code,
    c.id AS component_id,
    c.function
  FROM normalized_bom nb
  JOIN labdoc_ingredient_components c ON c.ingredient_code = nb.ingredient_code
)
INSERT INTO labdoc_product_component_functions (
  product_code,
  ingredient_code,
  component_id,
  function
)
SELECT product_code, ingredient_code, component_id, function
FROM component_defaults
ON CONFLICT (product_code, component_id) DO NOTHING;

-- Backfill raw-material/ingredient function from the distinct component functions per product.
WITH normalized_bom AS (
  SELECT DISTINCT
    p.product_code,
    CASE
      WHEN b.materialcode ~ '^[A-Z]{3}-[0-9]{4}[A-Z]-'
        THEN regexp_replace(b.materialcode, '[A-Z]-[0-9]+[A-Z]*$', '')
      ELSE b.materialcode
    END AS ingredient_code
  FROM labdoc_products p
  JOIN bom_master b ON b.prdcode = p.semi_product_code
  WHERE b.materialcode IS NOT NULL
), ingredient_defaults AS (
  SELECT
    nb.product_code,
    nb.ingredient_code,
    NULLIF(string_agg(DISTINCT c.function, ', ' ORDER BY c.function) FILTER (WHERE c.function IS NOT NULL AND length(trim(c.function)) > 0), '') AS function
  FROM normalized_bom nb
  LEFT JOIN labdoc_ingredient_components c ON c.ingredient_code = nb.ingredient_code
  GROUP BY nb.product_code, nb.ingredient_code
)
INSERT INTO labdoc_product_ingredient_functions (
  product_code,
  ingredient_code,
  function
)
SELECT product_code, ingredient_code, function
FROM ingredient_defaults
ON CONFLICT (product_code, ingredient_code) DO NOTHING;

ALTER TABLE labdoc_product_ingredient_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE labdoc_product_component_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON labdoc_product_ingredient_functions;
CREATE POLICY "Allow all for authenticated" ON labdoc_product_ingredient_functions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON labdoc_product_component_functions;
CREATE POLICY "Allow all for authenticated" ON labdoc_product_component_functions
  FOR ALL USING (true) WITH CHECK (true);
