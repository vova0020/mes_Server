# Быстрая настройка системы привязки операторов

## 📋 Шаги развертывания

### 1. Применить миграцию базы данных

```bash
# Применить миграцию
npx prisma migrate deploy

# Или для разработки
npx prisma migrate dev
```

### 2. Сгенерировать коды для существующих станков

```bash
# Запустить скрипт генерации кодов
npx ts-node prisma/generate-machine-codes.ts
```

**Результат:**
- Все станки получат уникальные коды формата `H431`, `A123` и т.д.
- Коды будут сохранены в поле `machine_code`

### 3. Перезапустить сервер

```bash
# Остановить текущий процесс (Ctrl+C)
# Запустить заново
npm run start:dev
```

### 4. Проверить работу API

```bash
# Проверить статус привязки (замените 1 на реальный userId)
curl "http://localhost:5004/api/operators/bindings/status?userId=1"

# Должен вернуть:
# {"isBound":false}
```

---

## 🎯 Использование на фронтенде

### Сценарий 1: Оператор входит в личный кабинет

```typescript
// 1. Проверяем, привязан ли оператор
const response = await fetch(`/api/operators/bindings/status?userId=${userId}`);
const status = await response.json();

if (status.isBound) {
  // Показываем информацию о станке
  showMachineInfo(status.machine);
} else {
  // Показываем форму ввода кода станка
  showMachineCodeInput();
}
```

### Сценарий 2: Оператор вводит код станка

```typescript
async function bindToMachine(userId: number, machineCode: string) {
  const response = await fetch('/api/operators/bindings/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, machineCode })
  });
  
  if (response.ok) {
    const data = await response.json();
    alert(data.message); // "Успешно привязан к станку..."
    // Перенаправить на рабочий экран
  } else {
    const error = await response.json();
    alert(error.message); // "Станок с кодом ... не найден"
  }
}
```

### Сценарий 3: Оператор завершает смену

```typescript
async function endShift(userId: number, machineId: number) {
  const response = await fetch('/api/operators/bindings/unbind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, machineId })
  });
  
  const data = await response.json();
  alert(data.message); // "Успешно отвязан от станка"
}
```

---

## 🔧 Настройка времени сброса смены

В файле `.env`:

```env
# Время окончания смены (по московскому времени UTC+3)
SHIFT_END_TIME=17:30
```

При наступлении этого времени:
- Все станки переводятся в `INACTIVE`
- Сбрасываются счетчики
- **Все операторы автоматически отвязываются**

---

## 📊 Просмотр кодов станков

### Через базу данных

```sql
SELECT machine_id, machine_name, machine_code 
FROM machines 
ORDER BY machine_name;
```

### Через API (если добавите эндпоинт)

```typescript
// GET /api/machines
const machines = await fetch('/api/machines').then(r => r.json());
machines.forEach(m => {
  console.log(`${m.machineName}: ${m.machineCode}`);
});
```

---

## ✅ Проверочный список

- [ ] Миграция применена
- [ ] Коды станков сгенерированы
- [ ] Сервер перезапущен
- [ ] API отвечает на запросы
- [ ] Фронтенд интегрирован
- [ ] Время сброса смены настроено
- [ ] WebSocket события обрабатываются

---

## 🐛 Частые проблемы

### Ошибка: "Cannot find module '@prisma/client'"

**Решение:**
```bash
npx prisma generate
npm install
```

### Ошибка: "Table 'operator_machine_bindings' doesn't exist"

**Решение:**
```bash
npx prisma migrate deploy
```

### Коды станков не генерируются

**Решение:**
```bash
# Проверьте подключение к БД
npx prisma db pull

# Запустите скрипт заново
npx ts-node prisma/generate-machine-codes.ts
```

---

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи сервера (`console.log`)
2. Логи базы данных
3. Документацию: `docs/OPERATOR_BINDING_API.md`
