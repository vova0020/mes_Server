# 🚀 Быстрый старт - Система привязки операторов

## Шаг 1: Применить изменения в базе данных

Поскольку у вас уже есть данные в базе, выполните SQL напрямую:

```sql
-- 1. Добавить поле machine_code в таблицу machines
ALTER TABLE machines ADD COLUMN machine_code TEXT;

-- 2. Создать уникальный индекс для machine_code
CREATE UNIQUE INDEX machines_machine_code_key ON machines(machine_code);

-- 3. Создать таблицу привязок операторов
CREATE TABLE operator_machine_bindings (
    binding_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    operator_number INTEGER NOT NULL,
    bound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unbound_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT operator_machine_bindings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT operator_machine_bindings_machine_id_fkey 
        FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
);

-- 4. Создать индексы для оптимизации запросов
CREATE INDEX operator_machine_bindings_user_id_idx 
    ON operator_machine_bindings(user_id);
    
CREATE INDEX operator_machine_bindings_machine_id_is_active_idx 
    ON operator_machine_bindings(machine_id, is_active);
    
CREATE INDEX operator_machine_bindings_machine_id_operator_number_is_act_idx 
    ON operator_machine_bindings(machine_id, operator_number, is_active);
```

### Как выполнить SQL:

**Вариант 1: Через pgAdmin**
1. Откройте pgAdmin
2. Подключитесь к вашей базе данных
3. Откройте Query Tool (Ctrl+Shift+Q)
4. Вставьте SQL выше
5. Нажмите Execute (F5)

**Вариант 2: Через командную строку**
```bash
psql -U postgres -d test -f apply_changes.sql
```

**Вариант 3: Через DBeaver/DataGrip**
1. Откройте SQL редактор
2. Вставьте SQL
3. Выполните (Ctrl+Enter)

---

## Шаг 2: Обновить Prisma Client

```bash
npx prisma generate
```

---

## Шаг 3: Сгенерировать коды для станков

```bash
npx ts-node prisma/generate-machine-codes.ts
```

**Ожидаемый результат:**
```
🚀 Начало генерации кодов станков...
📊 Найдено станков: 25
📋 Существующих кодов: 0
🔧 Станков без кодов: 25
✅ Станок "Станок раскроя №1" (ID: 1) получил код: H431
✅ Станок "Станок кромки №2" (ID: 2) получил код: A123
...
🎉 Успешно сгенерировано кодов: 25
✅ Генерация кодов завершена!
```

---

## Шаг 4: Перезапустить сервер

```bash
# Остановить (Ctrl+C)
# Запустить заново
npm run start:dev
```

---

## Шаг 5: Проверить работу API

```bash
# Проверить статус привязки (замените 1 на реальный userId)
curl "http://localhost:5004/api/operators/bindings/status?userId=1"
```

**Ожидаемый ответ:**
```json
{"isBound":false}
```

---

## Шаг 6: Интеграция на фронтенде

### Минимальный пример (JavaScript/TypeScript)

```typescript
// 1. Проверить статус привязки
async function checkBinding(userId) {
  const response = await fetch(
    `http://localhost:5004/api/operators/bindings/status?userId=${userId}`
  );
  const data = await response.json();
  
  if (data.isBound) {
    console.log('Привязан к станку:', data.machine.machineName);
  } else {
    console.log('Не привязан');
  }
}

// 2. Привязаться к станку
async function bindToMachine(userId, machineCode) {
  const response = await fetch('http://localhost:5004/api/operators/bindings/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, machineCode })
  });
  
  const data = await response.json();
  alert(data.message);
}

// 3. Отвязаться от станка
async function unbindFromMachine(userId, machineId) {
  const response = await fetch('http://localhost:5004/api/operators/bindings/unbind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, machineId })
  });
  
  const data = await response.json();
  alert(data.message);
}

// Использование:
checkBinding(123);
bindToMachine(123, 'H431');
unbindFromMachine(123, 5);
```

---

## 📋 Чек-лист

- [ ] SQL выполнен в базе данных
- [ ] `npx prisma generate` выполнен
- [ ] Коды станков сгенерированы
- [ ] Сервер перезапущен
- [ ] API отвечает на запросы
- [ ] Фронтенд интегрирован

---

## 🎯 Готово!

Теперь операторы могут:
1. Войти в личный кабинет
2. Ввести код станка (например, `H431`)
3. Привязаться к станку на смену
4. Система отслеживает, кто работает на каком станке

---

## 📚 Дополнительная документация

- **Полная документация API**: [`docs/OPERATOR_BINDING_API.md`](docs/OPERATOR_BINDING_API.md)
- **Руководство для фронтенда**: [`docs/FRONTEND_INTEGRATION_GUIDE.md`](docs/FRONTEND_INTEGRATION_GUIDE.md)
- **Резюме изменений**: [`OPERATOR_BINDING_SUMMARY.md`](OPERATOR_BINDING_SUMMARY.md)

---

## ❓ Проблемы?

### Ошибка: "relation does not exist"
**Решение:** SQL не выполнен. Выполните SQL из Шага 1.

### Ошибка: "Cannot find module"
**Решение:** 
```bash
npm install
npx prisma generate
```

### Коды не генерируются
**Решение:** Проверьте подключение к БД и выполните:
```bash
npx prisma db pull
npx ts-node prisma/generate-machine-codes.ts
```

### API не отвечает
**Решение:** Проверьте, что сервер запущен и порт 5004 свободен.
