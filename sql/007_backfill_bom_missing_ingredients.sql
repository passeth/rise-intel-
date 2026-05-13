-- Data migration: create ingredient master rows for BOM material codes missing in labdoc_ingredients
-- Purpose:
--   BOM must remain the source of truth and must not be rewritten to satisfy FK constraints.
--   This migration preserves bom_master as-is and creates missing labdoc_ingredients
--   rows using the normalized material code already used by the PIF code path.

WITH normalized_bom AS (
  SELECT
    CASE
      WHEN b.materialcode ~ '^[A-Z]{3}-[0-9]{4}[A-Z]-'
        THEN regexp_replace(b.materialcode, '[A-Z]-[0-9]+[A-Z]*$', '')
      ELSE b.materialcode
    END AS ingredient_code,
    min(NULLIF(btrim(b.materialname), '')) AS ingredient_name
  FROM bom_master b
  WHERE b.materialcode IS NOT NULL
    AND btrim(b.materialcode) <> ''
  GROUP BY 1
), missing AS (
  SELECT
    nb.ingredient_code,
    COALESCE(nb.ingredient_name, nb.ingredient_code) AS ingredient_name
  FROM normalized_bom nb
  LEFT JOIN labdoc_ingredients i ON i.ingredient_code = nb.ingredient_code
  WHERE i.ingredient_code IS NULL
)
INSERT INTO labdoc_ingredients (
  ingredient_code,
  ingredient_name,
  manufacturer,
  origin_country,
  coa_urls,
  composition_urls,
  msds_en_urls,
  msds_kr_urls,
  fragrance_urls,
  other_urls,
  created_at,
  updated_at
)
SELECT
  ingredient_code,
  ingredient_name,
  NULL,
  NULL,
  '{}',
  '{}',
  '{}',
  '{}',
  '{}',
  '{}',
  now(),
  now()
FROM missing
ON CONFLICT (ingredient_code) DO NOTHING;
