-- =====================================================
-- Скрипт для проверки данных machine-uptime
-- =====================================================

-- 1. Текущая дата и время
SELECT NOW() as current_datetime;

-- 2. Диапазон для DAY (сегодня с 00:00 до текущего момента)
WITH date_range AS (
  SELECT 
    DATE_TRUNC('day', NOW()) as start_date,
    NOW() as end_date
)
SELECT * FROM date_range;

-- 3. Список всех станков и их текущий статус
SELECT 
  machine_id,
  machine_name,
  status as current_status
FROM machines
ORDER BY machine_name;

-- 4. История статусов за сегодня (DAY)
SELECT 
  msh.machine_id,
  m.machine_name,
  msh.new_status,
  msh.created_at,
  msh.old_status
FROM machine_status_history msh
JOIN machines m ON m.machine_id = msh.machine_id
WHERE msh.created_at >= DATE_TRUNC('day', NOW())
  AND msh.created_at <= NOW()
ORDER BY msh.machine_id, msh.created_at;

-- 5. Последний статус ПЕРЕД началом периода (для каждого станка)
WITH date_range AS (
  SELECT DATE_TRUNC('day', NOW()) as start_date
)
SELECT DISTINCT ON (m.machine_id)
  m.machine_id,
  m.machine_name,
  m.status as current_status,
  COALESCE(msh.new_status, m.status) as status_before_period,
  msh.created_at as last_change_before_period
FROM machines m
LEFT JOIN machine_status_history msh ON msh.machine_id = m.machine_id
  AND msh.created_at < (SELECT start_date FROM date_range)
ORDER BY m.machine_id, msh.created_at DESC NULLS LAST;

-- 6. Полный расчет времени работы для каждого станка за сегодня
WITH date_range AS (
  SELECT 
    DATE_TRUNC('day', NOW()) as start_date,
    NOW() as end_date
),
-- Получаем начальный статус для каждого станка (последний перед началом периода)
initial_status AS (
  SELECT DISTINCT ON (m.machine_id)
    m.machine_id,
    COALESCE(msh.new_status, m.status) as status
  FROM machines m
  LEFT JOIN machine_status_history msh ON msh.machine_id = m.machine_id
    AND msh.created_at < (SELECT start_date FROM date_range)
  ORDER BY m.machine_id, msh.created_at DESC NULLS LAST
),
-- История изменений в период
period_history AS (
  SELECT 
    msh.machine_id,
    msh.new_status,
    msh.created_at
  FROM machine_status_history msh
  CROSS JOIN date_range dr
  WHERE msh.created_at >= dr.start_date
    AND msh.created_at <= dr.end_date
),
-- Собираем временные интервалы
status_intervals AS (
  SELECT 
    m.machine_id,
    m.machine_name,
    -- Начальный статус (либо из истории, либо текущий)
    init.status as start_status,
    -- Все изменения статуса
    (SELECT json_agg(
      json_build_object(
        'status', ph.new_status,
        'timestamp', ph.created_at
      ) ORDER BY ph.created_at
    ) FROM period_history ph WHERE ph.machine_id = m.machine_id) as changes
  FROM machines m
  CROSS JOIN date_range dr
  LEFT JOIN initial_status init ON init.machine_id = m.machine_id
)
SELECT 
  machine_id,
  machine_name,
  start_status,
  changes,
  (SELECT start_date FROM date_range) as period_start,
  (SELECT end_date FROM date_range) as period_end
FROM status_intervals
ORDER BY machine_name;

-- 7. Упрощенный подсчет для одного станка (пример для machine_id = 1)
WITH date_range AS (
  SELECT 
    DATE_TRUNC('day', NOW()) as start_date,
    NOW() as end_date
),
-- Получаем все события (начальный статус + изменения)
timeline AS (
  -- Начальный статус
  SELECT 
    1 as machine_id,
    (SELECT start_date FROM date_range) as event_time,
    COALESCE(
      (SELECT msh.new_status 
       FROM machine_status_history msh 
       WHERE msh.machine_id = 1 
         AND msh.created_at < (SELECT start_date FROM date_range)
       ORDER BY msh.created_at DESC 
       LIMIT 1),
      (SELECT status FROM machines WHERE machine_id = 1)
    ) as status
  
  UNION ALL
  
  -- Изменения в период
  SELECT 
    msh.machine_id,
    msh.created_at as event_time,
    msh.new_status as status
  FROM machine_status_history msh
  CROSS JOIN date_range dr
  WHERE msh.machine_id = 1
    AND msh.created_at >= dr.start_date
    AND msh.created_at <= dr.end_date
  
  ORDER BY event_time
),
-- Считаем длительность каждого статуса
durations AS (
  SELECT 
    t.status,
    COALESCE(
      EXTRACT(EPOCH FROM (LEAD(t.event_time) OVER (ORDER BY t.event_time) - t.event_time)) / 3600,
      EXTRACT(EPOCH FROM ((SELECT end_date FROM date_range) - t.event_time)) / 3600
    ) as hours
  FROM timeline t
)
SELECT 
  status,
  ROUND(SUM(hours)::numeric, 2) as total_hours,
  ROUND((SUM(hours) / (SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / 3600 FROM date_range) * 100)::numeric, 2) as percentage
FROM durations
GROUP BY status
ORDER BY total_hours DESC;

-- 8. Подсчет для ВСЕХ станков
WITH date_range AS (
  SELECT 
    DATE_TRUNC('day', NOW()) as start_date,
    NOW() as end_date
),
machines_list AS (
  SELECT machine_id FROM machines
),
-- Для каждого станка получаем временную линию
timeline AS (
  SELECT 
    m.machine_id,
    (SELECT start_date FROM date_range) as event_time,
    COALESCE(
      (SELECT msh.new_status 
       FROM machine_status_history msh 
       WHERE msh.machine_id = m.machine_id 
         AND msh.created_at < (SELECT start_date FROM date_range)
       ORDER BY msh.created_at DESC 
       LIMIT 1),
      (SELECT status FROM machines WHERE machine_id = m.machine_id)
    ) as status,
    0 as is_change
  FROM machines_list m
  
  UNION ALL
  
  SELECT 
    msh.machine_id,
    msh.created_at as event_time,
    msh.new_status as status,
    1 as is_change
  FROM machine_status_history msh
  CROSS JOIN date_range dr
  WHERE msh.created_at >= dr.start_date
    AND msh.created_at <= dr.end_date
),
-- Считаем длительность с PARTITION BY machine_id
durations AS (
  SELECT 
    machines.machine_name,
    t.machine_id,
    t.status,
    COALESCE(
      EXTRACT(EPOCH FROM (
        LEAD(t.event_time) OVER (PARTITION BY t.machine_id ORDER BY t.event_time) - t.event_time
      )) / 3600,
      EXTRACT(EPOCH FROM ((SELECT end_date FROM date_range) - t.event_time)) / 3600
    ) as hours
  FROM timeline t
  JOIN machines ON machines.machine_id = t.machine_id
)
SELECT 
  machine_id,
  machine_name,
  status,
  ROUND(SUM(hours)::numeric, 2) as total_hours,
  ROUND((SUM(hours) / (SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / 3600 FROM date_range) * 100)::numeric, 2) as percentage
FROM durations
GROUP BY machine_id, machine_name, status
ORDER BY machine_name, total_hours DESC;


-- =====================================================
-- 9. Проверка для CUSTOM периода (как в запросе ?startDate=2026-06-23&endDate=2026-06-24)
-- =====================================================

-- Проверка: какой период получается для CUSTOM дат
WITH date_range AS (
  SELECT 
    '2026-06-23 00:00:00'::timestamp as start_date,
    '2026-06-24 23:59:59'::timestamp as end_date
)
SELECT 
  start_date,
  end_date,
  EXTRACT(EPOCH FROM (end_date - start_date)) / 3600 as hours_in_period,
  (EXTRACT(EPOCH FROM (end_date - start_date)) / 3600) / 24.0 as days_in_period
FROM date_range;

-- Подсчет для ВСЕХ станков за конкретный день (CUSTOM период)
WITH date_range AS (
  SELECT 
    '2026-06-23 00:00:00'::timestamp as start_date,
    '2026-06-24 23:59:59'::timestamp as end_date
),
machines_list AS (
  SELECT machine_id FROM machines
),
-- Для каждого станка получаем временную линию
timeline AS (
  SELECT 
    m.machine_id,
    (SELECT start_date FROM date_range) as event_time,
    COALESCE(
      (SELECT msh.new_status 
       FROM machine_status_history msh 
       WHERE msh.machine_id = m.machine_id 
         AND msh.created_at < (SELECT start_date FROM date_range)
       ORDER BY msh.created_at DESC 
       LIMIT 1),
      (SELECT status FROM machines WHERE machine_id = m.machine_id)
    ) as status,
    0 as is_change
  FROM machines_list m
  
  UNION ALL
  
  SELECT 
    msh.machine_id,
    msh.created_at as event_time,
    msh.new_status as status,
    1 as is_change
  FROM machine_status_history msh
  CROSS JOIN date_range dr
  WHERE msh.created_at >= dr.start_date
    AND msh.created_at <= dr.end_date
),
-- Считаем длительность с PARTITION BY machine_id
durations AS (
  SELECT 
    machines.machine_name,
    t.machine_id,
    t.status,
    COALESCE(
      EXTRACT(EPOCH FROM (
        LEAD(t.event_time) OVER (PARTITION BY t.machine_id ORDER BY t.event_time) - t.event_time
      )) / 3600,
      EXTRACT(EPOCH FROM ((SELECT end_date FROM date_range) - t.event_time)) / 3600
    ) as hours
  FROM timeline t
  JOIN machines ON machines.machine_id = t.machine_id
)
SELECT 
  machine_id,
  machine_name,
  status,
  ROUND(SUM(hours)::numeric, 2) as total_hours,
  ROUND((SUM(hours) / (SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / 3600 FROM date_range) * 100)::numeric, 2) as percentage
FROM durations
GROUP BY machine_id, machine_name, status
ORDER BY machine_name, total_hours DESC;
