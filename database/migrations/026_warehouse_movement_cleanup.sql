-- Noņem kustības no atceltām (melnraksta) saņemšanas pavadzīmēm un vecos atcelšanas ierakstus.
-- Pēc tam pārrēķina preču atlikumus no atlikušajām kustībām.

DELETE FROM warehouse_product_movements
WHERE movement_type = 'out'
  AND reference_type = 'receipt'
  AND notes LIKE 'Atcelta saņemšana%';

DELETE m FROM warehouse_product_movements m
INNER JOIN warehouse_receipts r ON r.id = m.reference_id
WHERE m.reference_type = 'receipt'
  AND r.status = 'draft';

UPDATE warehouse_products p
LEFT JOIN (
  SELECT m.product_id, m.quantity_after
  FROM warehouse_product_movements m
  INNER JOIN (
    SELECT product_id, MAX(created_at) AS max_created
    FROM warehouse_product_movements
    GROUP BY product_id
  ) latest ON latest.product_id = m.product_id AND latest.max_created = m.created_at
) last_move ON last_move.product_id = p.id
SET p.quantity_on_hand = COALESCE(last_move.quantity_after, 0)
WHERE p.is_service = 0 AND p.is_active = 1;
