// Тест обработки дат в CUSTOM режиме
// Запустить: node test-date-parsing.js

console.log('=== Проблема с обработкой дат ===\n');

// НЕПРАВИЛЬНЫЙ подход (как было)
console.log('❌ НЕПРАВИЛЬНО (как было):');
const wrongStartDate = new Date('2026-06-23');
console.log('new Date("2026-06-23") =', wrongStartDate.toISOString());
console.log('В локальном времени (МСК, UTC+3):', wrongStartDate.toString());
console.log('Часы:', wrongStartDate.getHours(), '← Начало с 03:00 вместо 00:00!\n');

// ПРАВИЛЬНЫЙ подход (как стало)
console.log('✅ ПРАВИЛЬНО (как стало):');
const correctStartDate = new Date('2026-06-23');
correctStartDate.setHours(0, 0, 0, 0);
console.log('new Date("2026-06-23") + setHours(0,0,0,0) =', correctStartDate.toISOString());
console.log('В локальном времени (МСК, UTC+3):', correctStartDate.toString());
console.log('Часы:', correctStartDate.getHours(), '← Начало с 00:00 по МСК!\n');

// Для endDate
console.log('=== EndDate обработка ===\n');

console.log('✅ ПРАВИЛЬНО для endDate:');
const correctEndDate = new Date('2026-06-24');
correctEndDate.setHours(23, 59, 59, 999);
console.log('new Date("2026-06-24") + setHours(23,59,59,999) =', correctEndDate.toISOString());
console.log('В локальном времени (МСК, UTC+3):', correctEndDate.toString());
console.log('Часы:', correctEndDate.getHours(), '← Конец дня в 23:59:59!\n');

// Расчет периода
console.log('=== Расчет периода ===');
const hours = (correctEndDate.getTime() - correctStartDate.getTime()) / (1000 * 60 * 60);
console.log('Период:', Math.round(hours * 100) / 100, 'часов');
console.log('Это примерно', hours / 24, 'дней ← Правильно: почти полные сутки\n');
