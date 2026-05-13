-- Migration: structured product INCI declaration items
-- Purpose:
--   Store calculated per-product INCI rows alongside labdoc_product_inci text fields.
--   This preserves wt_percent and <1% flags so future UI can freely reorder
--   ingredients under 1% without recalculating or losing the generated source order.

CREATE TABLE IF NOT EXISTS labdoc_product_inci_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES labdoc_products(product_code) ON DELETE CASCADE,
  merge_key TEXT NOT NULL,
  inci_name_ko TEXT,
  inci_name_en TEXT NOT NULL,
  cas_no TEXT,
  function_name TEXT,
  wt_percent NUMERIC(12, 8) NOT NULL,
  is_below_one_percent BOOLEAN NOT NULL DEFAULT false,
  sort_group TEXT NOT NULL DEFAULT 'gte_1',
  calculated_order INTEGER NOT NULL,
  declared_order INTEGER NOT NULL,
  source_ingredient_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT labdoc_product_inci_items_unique UNIQUE(product_code, merge_key),
  CONSTRAINT labdoc_product_inci_items_sort_group_check CHECK (sort_group IN ('gte_1', 'lt_1')),
  CONSTRAINT labdoc_product_inci_items_declared_order_check CHECK (declared_order > 0),
  CONSTRAINT labdoc_product_inci_items_calculated_order_check CHECK (calculated_order > 0),
  CONSTRAINT labdoc_product_inci_items_wt_percent_check CHECK (wt_percent >= 0)
);

CREATE INDEX IF NOT EXISTS idx_labdoc_product_inci_items_product
  ON labdoc_product_inci_items(product_code, declared_order);

CREATE INDEX IF NOT EXISTS idx_labdoc_product_inci_items_below_one
  ON labdoc_product_inci_items(product_code, is_below_one_percent, declared_order);

ALTER TABLE labdoc_product_inci_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON labdoc_product_inci_items;
CREATE POLICY "Allow all for authenticated" ON labdoc_product_inci_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
