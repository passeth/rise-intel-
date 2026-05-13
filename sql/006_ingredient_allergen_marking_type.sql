-- Migration: ingredient allergen marking management category
-- Purpose:
--   Mark raw materials that need allergen labeling management because they are
--   fragrance, essential oil, or another allergen-relevant material category.

ALTER TABLE labdoc_ingredients
  ADD COLUMN IF NOT EXISTS allergen_marking_type TEXT;

ALTER TABLE labdoc_ingredients
  DROP CONSTRAINT IF EXISTS labdoc_ingredients_allergen_marking_type_check;

ALTER TABLE labdoc_ingredients
  ADD CONSTRAINT labdoc_ingredients_allergen_marking_type_check
  CHECK (allergen_marking_type IS NULL OR allergen_marking_type IN ('fragrance', 'essential_oil', 'others'));

CREATE INDEX IF NOT EXISTS idx_labdoc_ingredients_allergen_marking_type
  ON labdoc_ingredients(allergen_marking_type);
