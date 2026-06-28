# Резюме исправлений machine-uptime API

## 🎯 Проблема
Запрос `/api/statistics/machine-uptime` выдавал неверные данные по двум причинам:
1. ❌ Неправильный начальный статус периода
2. ❌ CUSTOM период начинался с 03:00 вместо 00:00

## ✅ Что исправлено

### 1. Начальный статус периода
```typescript
// БЫЛО ❌
const previousHistory = history.length > 0 ? history[0].newStatus : currentStatus;

// СТАЛО ✅
const statusBeforePeriod = await this.prisma.machineStatusHistory.findFirst({
  where: { machineId: machine.machineId, createdAt: { lt: startDate } },
  orderBy: { createdAt: 'desc' }
});
const initialStatus = statusBeforePeriod?.newStatus || machine.status;
```

### 2. Обработка CUSTOM дат
```typescript
// БЫЛО ❌
startDate = new Date(dto.startDate!); // → 03:00 МСК

// СТАЛО ✅
startDate = new Date(dto.startDate!);
startDate.setHours(0, 0, 0, 0); // → 00:00 МСК

endDate = new Date(dto.endDate!);
endDate.setHours(23, 59, 59, 999); // → 23:59:59 МСК
```

## 📊 Результат

### До исправлений:
- CUSTOM период: 23 июня 03:00 → 24 июня 03:00 (21 час) ❌
- Начальный статус: первое изменение в периоде ❌
- Проценты: не сходятся до 100% ❌

### После исправлений:
- CUSTOM период: 23 июня 00:00 → 24 июня 23:59:59 (24 часа) ✅
- Начальный статус: последний статус ДО начала периода ✅
- Проценты: всегда ровно 100% ✅

## 📁 Измененные файлы

1. **machine-uptime.service.ts** - основной сервис (3 изменения)
2. **debug-machine-uptime.sql** - SQL для проверки данных
3. **MACHINE_UPTIME_FIX.md** - полная документация
4. **TESTING_INSTRUCTIONS.md** - инструкция по тестированию
5. **test-date-parsing.js** - демонстрация проблемы с датами

## 🧪 Как проверить

### Быстрый тест:
```bash
# 1. CUSTOM период (главное!)
curl "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=CUSTOM&startDate=2026-06-23&endDate=2026-06-24"

# Проверить: startDate должен быть 00:00, endDate должен быть 23:59:59

# 2. Проверка процентов
curl -s "https://dev.fit-demo.ru/api/statistics/machine-uptime?dateRangeType=DAY" | jq '.machines[0].statusBreakdown | map(.percentage) | add'

# Результат должен быть: 100
```

### Проверка в БД:
```bash
# Запустить запрос #9 из debug-machine-uptime.sql
# Сравнить с API - результаты должны совпадать
```

## ⚠️ Важно

После деплоя **обязательно проверьте**:
- ✅ CUSTOM период начинается с 00:00 (не 03:00)
- ✅ Сумма всех процентов = 100%
- ✅ API и SQL дают одинаковые результаты

## 📞 Контакты

При возникновении проблем:
1. Проверьте TESTING_INSTRUCTIONS.md
2. Запустите SQL из debug-machine-uptime.sql
3. Сравните результаты с тестовым периодом

---

**Дата исправления:** 2025  
**Файлы:** 5 файлов создано/изменено  
**Статус:** ✅ Готово к тестированию
