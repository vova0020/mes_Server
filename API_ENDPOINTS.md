# API Эндпоинты - Привязка операторов к станкам

## Базовый URL
```
http://localhost:5000/operators/bindings
```

**Примечание:** Порт зависит от вашей конфигурации (5000, 5001, 5002 и т.д.)

---

## 1. Проверить статус привязки оператора

**GET** `/status?userId={userId}`

### Параметры:
- `userId` (number) - ID оператора

### Ответ (привязан):
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

### Ответ (не привязан):
```json
{
  "isBound": false
}
```

---

## 2. Привязать оператора к станку

**POST** `/bind`

### Body:
```json
{
  "userId": 123,
  "machineCode": "H431"
}
```

### Успешный ответ:
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

### Ошибки:
- `404` - Станок с кодом не найден
- `404` - Пользователь не найден
- `409` - Оператор уже привязан к другому станку

---

## 3. Отвязать оператора от станка

**POST** `/unbind`

### Body:
```json
{
  "userId": 123,
  "machineId": 5
}
```

### Успешный ответ:
```json
{
  "success": true,
  "message": "Успешно отвязан от станка",
  "unboundAt": "2026-08-18T16:00:00.000Z"
}
```

### Ошибки:
- `404` - Активная привязка не найдена

---

## 4. Изменить номер оператора на станке

**PUT** `/change-number`

### Body:
```json
{
  "userId": 123,
  "machineId": 5,
  "newOperatorNumber": 2
}
```

### Успешный ответ (номер свободен):
```json
{
  "success": true,
  "message": "Номер оператора изменен с 1 на 2",
  "oldNumber": 1,
  "newNumber": 2
}
```

### Успешный ответ (обмен номерами):
```json
{
  "success": true,
  "message": "Номера операторов поменяны местами",
  "oldNumber": 1,
  "newNumber": 2
}
```

**Примечание:** Если новый номер уже занят другим оператором, система автоматически поменяет их номера местами.

### Ошибки:
- `404` - Станок не найден
- `404` - Оператор не привязан к станку

---

## 5. Получить список операторов на станке

**GET** `/machine?machineId={machineId}&activeOnly={true|false}`

### Параметры:
- `machineId` (number) - ID станка
- `activeOnly` (boolean, optional) - Только активные привязки (по умолчанию: true)

### Ответ:
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
Отправляется при привязке/отвязке оператора или смене номера

**При привязке/отвязке:**
```json
{
  "machineId": 5,
  "userId": 123,
  "action": "bound" | "unbound"
}
```

**При смене номера:**
```json
{
  "machineId": 5,
  "userId": 123,
  "action": "number-changed",
  "oldNumber": 1,
  "newNumber": 2
}
```

**При обмене номерами:**
```json
{
  "machineId": 5,
  "action": "numbers-swapped",
  "operators": [
    { "userId": 123, "oldNumber": 1, "newNumber": 2 },
    { "userId": 124, "oldNumber": 2, "newNumber": 1 }
  ]
}
```

### `operator:binding:shift-reset`
Отправляется при автоматической отвязке всех операторов (сброс смены)

```json
{
  "unboundCount": 15,
  "unboundAt": "2026-08-18T14:30:00.000Z"
}
```

---

## Коды станков

Все станки получили уникальные коды формата: **буква + 3 цифры**

Примеры:
- Ровер → `T263`
- Валерий 3000 → `D349`
- Большая пила → `B105`
- Кромка №1 → `T698`
- Кромка №2 → `G236`

Полный список кодов можно получить через запрос к базе данных:
```sql
SELECT machine_id, machine_name, machine_code FROM machines ORDER BY machine_name;
```
