# API привязки операторов к станкам

## Описание

Система позволяет операторам привязываться к станкам через личный кабинет, вводя уникальный код станка. Каждый станок имеет уникальный 4-символьный код формата: **буква + 3 цифры** (например, `H431`, `A123`, `Z999`).

## Основные возможности

- ✅ Привязка оператора к станку по коду
- ✅ Отслеживание нескольких операторов на одном станке
- ✅ Автоматическая нумерация операторов (1-й, 2-й, 3-й и т.д.)
- ✅ История привязок с временными метками
- ✅ Автоматическая отвязка при сбросе смены (17:30 по умолчанию)
- ✅ WebSocket уведомления об изменениях

---

## Структура базы данных

### Таблица `machines`
Добавлено новое поле:
- `machine_code` (String, unique) - уникальный код станка для привязки операторов

### Таблица `operator_machine_bindings`
Новая таблица для отслеживания привязок:

| Поле | Тип | Описание |
|------|-----|----------|
| `binding_id` | Int | Первичный ключ |
| `user_id` | Int | ID оператора |
| `machine_id` | Int | ID станка |
| `operator_number` | Int | Порядковый номер оператора на станке (1, 2, 3...) |
| `bound_at` | DateTime | Время привязки |
| `unbound_at` | DateTime? | Время отвязки (null = активная привязка) |
| `is_active` | Boolean | Флаг активности привязки |

---

## API Endpoints

### 1. Получить статус привязки оператора

**GET** `/api/operators/bindings/status`

**Query параметры:**
```typescript
{
  userId: number  // ID оператора
}
```

**Пример запроса:**
```bash
GET /api/operators/bindings/status?userId=123
```

**Ответ (привязан):**
```json
{
  "isBound": true,
  "machine": {
    "machineId": 5,
    "machineName": "Станок раскроя №1",
    "machineCode": "H431",
    "operatorNumber": 1,
    "boundAt": "2026-08-18T08:00:00.000Z"
  },
  "otherOperators": [
    {
      "userId": 124,
      "operatorNumber": 2,
      "firstName": "Иван",
      "lastName": "Петров",
      "position": "Оператор",
      "boundAt": "2026-08-18T08:15:00.000Z"
    }
  ]
}
```

**Ответ (не привязан):**
```json
{
  "isBound": false
}
```

---

### 2. Привязать оператора к станку

**POST** `/api/operators/bindings/bind`

**Body:**
```typescript
{
  userId: number       // ID оператора
  machineCode: string  // Код станка (например, "H431")
}
```

**Пример запроса:**
```bash
POST /api/operators/bindings/bind
Content-Type: application/json

{
  "userId": 123,
  "machineCode": "H431"
}
```

**Успешный ответ:**
```json
{
  "success": true,
  "message": "Успешно привязан к станку \"Станок раскроя №1\" как оператор №1",
  "binding": {
    "bindingId": 456,
    "machineId": 5,
    "machineName": "Станок раскроя №1",
    "machineCode": "H431",
    "operatorNumber": 1,
    "boundAt": "2026-08-18T08:00:00.000Z"
  },
  "otherOperators": []
}
```

**Ошибки:**
- `404` - Станок с указанным кодом не найден
- `404` - Пользователь не найден
- `409` - Оператор уже привязан к другому станку

---

### 3. Отвязать оператора от станка

**POST** `/api/operators/bindings/unbind`

**Body:**
```typescript
{
  userId: number     // ID оператора
  machineId: number  // ID станка
}
```

**Пример запроса:**
```bash
POST /api/operators/bindings/unbind
Content-Type: application/json

{
  "userId": 123,
  "machineId": 5
}
```

**Успешный ответ:**
```json
{
  "success": true,
  "message": "Успешно отвязан от станка",
  "unboundAt": "2026-08-18T16:00:00.000Z"
}
```

**Ошибки:**
- `404` - Активная привязка не найдена

---

### 4. Получить список операторов на станке

**GET** `/api/operators/bindings/machine`

**Query параметры:**
```typescript
{
  machineId: number      // ID станка
  activeOnly?: boolean   // Только активные привязки (по умолчанию: true)
}
```

**Пример запроса:**
```bash
GET /api/operators/bindings/machine?machineId=5&activeOnly=true
```

**Ответ:**
```json
{
  "machineId": 5,
  "machineName": "Станок раскроя №1",
  "machineCode": "H431",
  "activeOperators": [
    {
      "userId": 123,
      "operatorNumber": 1,
      "firstName": "Петр",
      "lastName": "Сидоров",
      "position": "Старший оператор",
      "boundAt": "2026-08-18T08:00:00.000Z"
    },
    {
      "userId": 124,
      "operatorNumber": 2,
      "firstName": "Иван",
      "lastName": "Петров",
      "position": "Оператор",
      "boundAt": "2026-08-18T08:15:00.000Z"
    }
  ],
  "totalActive": 2
}
```

---

## WebSocket события

### `operator:binding:updated`
Отправляется при привязке/отвязке оператора

**Payload:**
```json
{
  "machineId": 5,
  "userId": 123,
  "action": "bound" | "unbound"
}
```

**Комнаты:**
- `room:masterceh`
- `room:machines`
- `room:machinesnosmen`
- `room:technologist`
- `room:director`

### `operator:binding:shift-reset`
Отправляется при автоматической отвязке всех операторов (сброс смены)

**Payload:**
```json
{
  "unboundCount": 15,
  "unboundAt": "2026-08-18T14:30:00.000Z"
}
```

---

## Автоматическая отвязка при сбросе смены

Все операторы автоматически отвязываются от станков при сбросе смены. Время сброса настраивается в `.env`:

```env
SHIFT_END_TIME=17:30  # Время по московскому времени (UTC+3)
```

При сбросе смены:
1. Все станки переводятся в статус `INACTIVE`
2. Сбрасываются счетчики выполненных операций
3. **Все операторы отвязываются от станков**
4. Отправляются WebSocket уведомления

---

## Генерация кодов станков

### Автоматическая генерация при создании станка

Коды генерируются автоматически при создании нового станка в формате: **буква (A-Z) + 3 цифры (000-999)**.

### Генерация кодов для существующих станков

Для станков, созданных до внедрения системы, используйте скрипт:

```bash
# Установка зависимостей (если нужно)
npm install

# Запуск скрипта генерации кодов
npx ts-node prisma/generate-machine-codes.ts
```

**Что делает скрипт:**
- Находит все станки без кодов
- Генерирует уникальные коды
- Обновляет записи в базе данных
- Выводит лог с результатами

**Пример вывода:**
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

## Миграция базы данных

### Применение миграции

```bash
# Применить миграцию
npx prisma migrate deploy

# Или создать новую миграцию (для разработки)
npx prisma migrate dev --name add_operator_machine_bindings
```

### SQL миграция

Файл: `prisma/migrations/add_operator_machine_bindings/migration.sql`

Добавляет:
- Поле `machine_code` в таблицу `machines`
- Таблицу `operator_machine_bindings`
- Необходимые индексы и внешние ключи

---

## Пример использования на фронтенде

### 1. Проверка статуса привязки при входе

```typescript
async function checkOperatorBinding(userId: number) {
  const response = await fetch(
    `/api/operators/bindings/status?userId=${userId}`
  );
  const data = await response.json();
  
  if (data.isBound) {
    console.log(`Привязан к станку: ${data.machine.machineName}`);
    console.log(`Номер оператора: ${data.machine.operatorNumber}`);
    console.log(`Другие операторы: ${data.otherOperators.length}`);
  } else {
    console.log('Не привязан к станку');
  }
}
```

### 2. Привязка к станку по коду

```typescript
async function bindToMachine(userId: number, machineCode: string) {
  try {
    const response = await fetch('/api/operators/bindings/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, machineCode })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    console.log(data.message);
    return data;
  } catch (error) {
    console.error('Ошибка привязки:', error.message);
    throw error;
  }
}
```

### 3. Отвязка от станка

```typescript
async function unbindFromMachine(userId: number, machineId: number) {
  const response = await fetch('/api/operators/bindings/unbind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, machineId })
  });
  
  const data = await response.json();
  console.log(data.message);
}
```

### 4. Подписка на WebSocket события

```typescript
socket.on('operator:binding:updated', (data) => {
  console.log(`Оператор ${data.userId} ${data.action} на станке ${data.machineId}`);
  // Обновить UI
});

socket.on('operator:binding:shift-reset', (data) => {
  console.log(`Сброс смены: отвязано ${data.unboundCount} операторов`);
  // Показать уведомление пользователю
});
```

---

## Безопасность

1. **Уникальность кодов**: Каждый код станка уникален в системе
2. **Валидация**: Все входные данные валидируются через DTO
3. **Проверка существования**: Проверяется существование пользователя и станка
4. **Конфликты**: Предотвращается привязка к нескольким станкам одновременно
5. **История**: Все привязки сохраняются в истории с временными метками

---

## Troubleshooting

### Проблема: Код станка не найден

**Решение:** Убедитесь, что:
1. Код введен правильно (регистр важен)
2. Станок существует в системе
3. Для станка сгенерирован код (запустите скрипт генерации)

### Проблема: Оператор уже привязан к другому станку

**Решение:** Сначала отвяжитесь от текущего станка, затем привяжитесь к новому.

### Проблема: После сброса смены операторы не отвязались

**Решение:** Проверьте:
1. Настройку `SHIFT_END_TIME` в `.env`
2. Логи планировщика в консоли
3. Работает ли сервис `MachineSchedulerService`

---

## Дополнительная информация

- Коды станков генерируются случайным образом
- Максимальное количество уникальных кодов: 26 × 1000 = 26,000
- Операторы нумеруются автоматически в порядке привязки
- История привязок сохраняется навсегда (для аналитики)
