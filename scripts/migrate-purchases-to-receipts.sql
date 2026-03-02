-- Migration: purchases → labdoc_ingredient_receipts
-- purchases 테이블은 READ-ONLY (SELECT만 수행)
-- 중복 기준: ingredient_code + receipt_date

-- 1. 먼저 대상 건수 확인 (dry-run)
SELECT
  (SELECT count(*) FROM purchases WHERE status = 'confirmed' AND material_type = 'raw_material' AND received_date IS NOT NULL) AS total_purchases,
  (SELECT count(*) FROM labdoc_ingredient_receipts) AS existing_receipts;

-- 2. 신규 INSERT 대상 미리보기 (상위 10건)
SELECT
  p.product_code AS ingredient_code,
  p.product_name AS ingredient_name,
  p.received_date AS receipt_date,
  p.received_qty AS receipt_qty,
  p.raw_material_lot AS lot_no,
  p.supplier_name AS supplier
FROM purchases p
WHERE p.status = 'confirmed'
  AND p.material_type = 'raw_material'
  AND p.received_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM labdoc_ingredient_receipts r
    WHERE r.ingredient_code = p.product_code
      AND r.receipt_date = p.received_date
  )
ORDER BY p.received_date
LIMIT 10;

-- 3. 실제 마이그레이션 (위 확인 후 실행)
INSERT INTO labdoc_ingredient_receipts (
  ingredient_code,
  ingredient_name,
  receipt_date,
  receipt_qty,
  lot_no,
  supplier,
  notes,
  year
)
SELECT
  p.product_code,
  COALESCE(p.product_name, p.product_code),
  p.received_date,
  p.received_qty,
  p.raw_material_lot,
  p.supplier_name,
  CASE WHEN p.order_number IS NOT NULL THEN '발주번호: ' || p.order_number ELSE NULL END,
  EXTRACT(YEAR FROM p.received_date)::int
FROM purchases p
WHERE p.status = 'confirmed'
  AND p.material_type = 'raw_material'
  AND p.received_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM labdoc_ingredient_receipts r
    WHERE r.ingredient_code = p.product_code
      AND r.receipt_date = p.received_date
  )
ORDER BY p.received_date;
