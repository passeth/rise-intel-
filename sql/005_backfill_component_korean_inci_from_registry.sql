-- Data migration: fill missing labdoc ingredient component Korean INCI names
-- Source: cosmetic_ingredient_registry, matched by normalized English INCI name.
-- Existing non-empty Korean names are preserved.

WITH registry_one AS (
  SELECT DISTINCT ON (normalized_eng_name)
    normalized_eng_name,
    ingr_kor_name
  FROM cosmetic_ingredient_registry
  WHERE normalized_eng_name IS NOT NULL
    AND normalized_eng_name <> ''
    AND ingr_kor_name IS NOT NULL
    AND btrim(ingr_kor_name) <> ''
  ORDER BY normalized_eng_name, source_no
), matched AS (
  SELECT c.id, r.ingr_kor_name
  FROM labdoc_ingredient_components c
  JOIN registry_one r
    ON lower(btrim(c.inci_name_en)) = r.normalized_eng_name
  WHERE c.inci_name_en IS NOT NULL
    AND btrim(c.inci_name_en) <> ''
    AND (c.inci_name_kr IS NULL OR btrim(c.inci_name_kr) = '')
)
UPDATE labdoc_ingredient_components c
SET inci_name_kr = matched.ingr_kor_name
FROM matched
WHERE c.id = matched.id;
