-- Data repair: remove BOM-derived ingredient master rows for non-raw BOM categories.
--
-- Only BOM rows with 품목구분 = '[원재료]' represent cosmetic ingredients.
-- Rows whose normalized BOM code appears only as [부재료], [반제품], [상품], etc.
-- must not live in labdoc_ingredients. This repair deletes only safe, empty
-- master rows that were created from non-raw BOM codes and have no component/doc data.

WITH normalized_bom AS (
  SELECT
    CASE
      WHEN b.materialcode ~ '^[A-Z]{3}-[0-9]{4}[A-Z]-'
        THEN regexp_replace(b.materialcode, '[A-Z]-[0-9]+[A-Z]*$', '')
      ELSE b.materialcode
    END AS ingredient_code,
    b."품목구분" AS item_type
  FROM bom_master b
  WHERE b.materialcode IS NOT NULL
    AND btrim(b.materialcode) <> ''
  GROUP BY 1, 2
), code_types AS (
  SELECT
    ingredient_code,
    bool_or(item_type = '[원재료]') AS has_raw,
    bool_or(item_type IS DISTINCT FROM '[원재료]') AS has_non_raw
  FROM normalized_bom
  GROUP BY ingredient_code
), safe_delete_candidates AS (
  SELECT i.ingredient_code
  FROM labdoc_ingredients i
  JOIN code_types ct ON ct.ingredient_code = i.ingredient_code
  WHERE ct.has_non_raw
    AND NOT ct.has_raw
    AND i.manufacturer IS NULL
    AND i.origin_country IS NULL
    AND coalesce(i.coa_urls, '{}') = '{}'
    AND coalesce(i.composition_urls, '{}') = '{}'
    AND coalesce(i.msds_en_urls, '{}') = '{}'
    AND coalesce(i.msds_kr_urls, '{}') = '{}'
    AND coalesce(i.fragrance_urls, '{}') = '{}'
    AND coalesce(i.other_urls, '{}') = '{}'
    AND NOT EXISTS (
      SELECT 1
      FROM labdoc_ingredient_components c
      WHERE c.ingredient_code = i.ingredient_code
    )
), delete_structured_inci_items AS (
  DELETE FROM labdoc_product_inci_items item
  USING safe_delete_candidates c
  WHERE c.ingredient_code = ANY(item.source_ingredient_codes)
  RETURNING item.id
), delete_ingredient_masters AS (
  DELETE FROM labdoc_ingredients i
  USING safe_delete_candidates c
  WHERE i.ingredient_code = c.ingredient_code
  RETURNING i.ingredient_code
)
SELECT
  (SELECT count(*) FROM safe_delete_candidates) AS safe_delete_candidates,
  (SELECT count(*) FROM delete_structured_inci_items) AS deleted_structured_inci_items,
  (SELECT count(*) FROM delete_ingredient_masters) AS deleted_ingredient_masters;
