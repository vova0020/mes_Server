# Инструкция по тестированию исправлений machine-uptime

## Быстрая проверка

### 1. Тест с сегодняшним днем (DAY)
```bash
# API запрос
curl "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=DAY"

# SQL проверка (запрос #8 из debug-machine-uptime.sql)
# Результаты должны совпадать
```

### 2. Тест с CUSTOM периодом (главное исправление!)
```bash
# API запрос - теперь период с 00:00 до 23:59:59
curl "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=CUSTOM&startDate=2026-06-23&endDate=2026-06-24"

# SQL проверка (запрос #9 из debug-machine-uptime.sql)
# Результаты должны совпадать
```

### 3. Проверка обработки дат
```bash
# Запустить тестовый скрипт
node test-date-parsing.js

# Должен показать:
# ❌ НЕПРАВИЛЬНО: 03:00 (UTC проблема)
# ✅ ПРАВИЛЬНО: 00:00 (после setHours)
```

## Что исправлено

### ✅ Исправление 1: Начальный статус периода
**Было:** Брался первый статус из истории ВНУТРИ периода
**Стало:** Берется последний статус ПЕРЕД началом периода

**Пример:**
- До: 00:00-10:00 считалось как INACTIVE (неправильно)
- После: 00:00-10:00 считается как ACTIVE (правильно)

### ✅ Исправление 2: Обработка CUSTOM дат
**Было:** `new Date('2026-06-23')` = 03:00 МСК (из-за UTC)
**Стало:** `new Date('2026-06-23').setHours(0,0,0,0)` = 00:00 МСК

**Результат:**
- Период теперь с 00:00:00 до 23:59:59 (полные сутки)
- Вместо 03:00:00 до 03:00:00 (21 час)

## Ожидаемые результаты

### Для запроса DAY (сегодня)
- startDate: сегодня 00:00:00
- endDate: текущий момент
- Сумма всех percentage должна быть 100%
- Сумма всех hours должна равняться времени с начала дня

### Для запроса CUSTOM (23-24 июня)
- startDate: 2026-06-23 00:00:00 (не 03:00!)
- endDate: 2026-06-24 23:59:59
- Период: ~24 часа (не 21!)
- Сумма всех percentage должна быть 100%

## Проверка в базе данных

### Шаг 1: Подключиться к БД
```bash
# Из .env файла DATABASE_URL
psql "postgresql://postgres:1577@localhost:5432/test"
```

### Шаг 2: Запустить проверочный запрос
```sql
-- Копируем запрос #8 или #9 из debug-machine-uptime.sql
-- Сравниваем результаты с API
```

### Шаг 3: Проверить конкретный станок
```sql
-- Запрос #7 для одного станка (замените machine_id)
-- Детальная разбивка по статусам
```

## Типичные проблемы

### Проблема: Проценты не сходятся до 100%
**Причина:** Неправильно определен начальный статус
**Решение:** ✅ Исправлено в getMachineUptimeStats

### Проблема: CUSTOM период начинается с 03:00
**Причина:** UTC конвертация без setHours
**Решение:** ✅ Исправлено в calculateDateRange

### Проблема: SQL и API дают разные результаты
**Причина:** Возможно разные временные зоны
**Проверка:** 
- Сервер должен быть в UTC+3 (МСК)
- PostgreSQL должен использовать ту же временную зону

## Файлы для проверки

1. **debug-machine-uptime.sql** - SQL запросы для проверки
2. **test-date-parsing.js** - Демонстрация проблемы с датами
3. **MACHINE_UPTIME_FIX.md** - Полная документация
4. **machine-uptime.service.ts** - Исправленный код

## Команды для быстрого тестирования

```bash
# 1. Проверка DAY
curl -s "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=DAY" | jq '.startDate, .endDate'

# 2. Проверка CUSTOM
curl -s "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=CUSTOM&startDate=2026-06-23&endDate=2026-06-24" | jq '.startDate, .endDate'

# 3. Проверка конкретного станка
curl -s "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=DAY" | jq '.machines[0]'

# 4. Проверка суммы процентов (должно быть 100)
curl -s "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=DAY" | jq '.machines[0].statusBreakdown | map(.percentage) | add'
```

## Ожидаемый вывод

### Правильный startDate/endDate для CUSTOM:
```json
{
  "startDate": "2026-06-22T21:00:00.000Z",  // 00:00:00 МСК в UTC
  "endDate": "2026-06-24T20:59:59.999Z"     // 23:59:59 МСК в UTC
}
```

### Правильная разбивка статусов:
```json
{
  "statusBreakdown": [
    { "status": "ACTIVE", "hours": 18.5, "percentage": 77.08 },
    { "status": "INACTIVE", "hours": 5.5, "percentage": 22.92 }
  ]
}
// Сумма percentage = 100.00 ✅
```
