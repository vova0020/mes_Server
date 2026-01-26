-- Миграция для заполнения полей облицовки кромок в таблице parts
-- из данных package_composition

-- Обновляем поля edging для деталей на основе данных из package_composition
UPDATE parts p
SET 
  edging_name_l1 = pc.edging_name_l1,
  edging_name_l2 = pc.edging_name_l2,
  edging_name_w1 = pc.edging_name_w1,
  edging_name_w2 = pc.edging_name_w2
FROM (
  SELECT DISTINCT ON (p2.part_id)
    p2.part_id,
    pc2.edging_name_l1,
    pc2.edging_name_l2,
    pc2.edging_name_w1,
    pc2.edging_name_w2
  FROM parts p2
  INNER JOIN production_package_parts ppp ON p2.part_id = ppp.part_id
  INNER JOIN package_composition pc2 ON ppp.package_id = pc2.package_id 
    AND p2.part_code = pc2.part_code
    AND p2.route_id = pc2.route_id
) pc
WHERE p.part_id = pc.part_id
  AND (
    p.edging_name_l1 IS NULL OR
    p.edging_name_l2 IS NULL OR
    p.edging_name_w1 IS NULL OR
    p.edging_name_w2 IS NULL
  );
