# API привязки операторов мастером

Базовый путь: `/machins/master/operator-binding`

Все эндпоинты доступны через Swagger: `http://localhost:5000/api` (тег: **Привязка операторов мастером**)

---

## 1. Получить участки мастера

Возвращает список производственных участков (этапов 1-го уровня), к которым привязан мастер.

```
GET /machins/master/operator-binding/segments?masterId={masterId}
```

### Query параметры

| Параметр   | Тип    | Обязательный | Описание              |
|------------|--------|--------------|-----------------------|
| `masterId` | number | ✅            | ID мастера (userId)   |

### Пример запроса

```http
GET /machins/master/operator-binding/segments?masterId=1
```

### Пример ответа (200)

```json
[
  {
    "stageId": 1,
    "stageName": "Раскрой"
  },
  {
    "stageId": 2,
    "stageName": "Кромка"
  },
  {
    "stageId": 5,
    "stageName": "Присадка"
  }
]
```

### Ошибки

| Код | Описание                    |
|-----|-----------------------------|
| 404 | Пользователь не найден      |

---

## 2. Получить станки участка с операторами

Возвращает список станков для указанного участка с полной информацией о привязанных операторах.

```
GET /machins/master/operator-binding/machines?stageId={stageId}
```

### Query параметры

| Параметр  | Тип    | Обязательный | Описание                          |
|-----------|--------|--------------|-----------------------------------|
| `stageId` | number | ✅            | ID участка (этапа 1-го уровня)    |

### Пример запроса

```http
GET /machins/master/operator-binding/machines?stageId=1
```

### Пример ответа (200)

```json
[
  {
    "machineId": 1,
    "machineName": "Станок №1",
    "machineCode": "H431",
    "status": "ACTIVE",
    "operatorsCount": 2,
    "operators": [
      {
        "userId": 5,
        "operatorNumber": 1,
        "firstName": "Иван",
        "lastName": "Иванов",
        "position": "Оператор",
        "boundAt": "2026-11-27T08:00:00.000Z"
      },
      {
        "userId": 8,
        "operatorNumber": 2,
        "firstName": "Петр",
        "lastName": "Петров",
        "position": "Оператор",
        "boundAt": "2026-11-27T08:15:00.000Z"
      }
    ]
  },
  {
    "machineId": 2,
    "machineName": "Станок №2",
    "machineCode": "H432",
    "status": "INACTIVE",
    "operatorsCount": 0,
    "operators": []
  }
]
```

### Поля ответа

| Поле             | Тип      | Описание                                                |
|------------------|----------|---------------------------------------------------------|
| `machineId`      | number   | ID станка                                               |
| `machineName`    | string   | Название станка                                          |
| `machineCode`    | string?  | Код станка (может быть `null`)                           |
| `status`         | string   | Статус: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `BROKEN`    |
| `operatorsCount` | number   | Количество привязанных операторов                        |
| `operators`      | array    | Массив привязанных операторов                            |

### Поля оператора

| Поле             | Тип      | Описание                          |
|------------------|----------|-----------------------------------|
| `userId`         | number   | ID пользователя                   |
| `operatorNumber` | number   | Номер оператора на станке (1, 2…) |
| `firstName`      | string   | Имя                               |
| `lastName`       | string   | Фамилия                           |
| `position`       | string?  | Должность (опционально)           |
| `boundAt`        | string   | Время привязки (ISO 8601)         |

### Ошибки

| Код | Описание              |
|-----|-----------------------|
| 404 | Участок не найден     |

---

## 3. Получить список операторов

Возвращает список всех пользователей с ролью «Оператор» с информацией о текущей привязке к станку.

```
GET /machins/master/operator-binding/operators
GET /machins/master/operator-binding/operators?stageId={stageId}
```

### Query параметры

| Параметр  | Тип    | Обязательный | Описание                                    |
|-----------|--------|--------------|---------------------------------------------|
| `stageId` | number | ❌            | ID участка для фильтрации (опционально)     |

### Пример запроса

```http
GET /machins/master/operator-binding/operators
```

### Пример ответа (200)

```json
[
  {
    "userId": 5,
    "firstName": "Иван",
    "lastName": "Иванов",
    "position": "Оператор",
    "isBound": true,
    "currentBinding": {
      "machineId": 1,
      "machineName": "Станок №1",
      "machineCode": "H431",
      "operatorNumber": 1,
      "boundAt": "2026-11-27T08:00:00.000Z"
    }
  },
  {
    "userId": 10,
    "firstName": "Сергей",
    "lastName": "Сергеев",
    "position": "Оператор",
    "isBound": false
  }
]
```

### Поля ответа

| Поле             | Тип      | Описание                                          |
|------------------|----------|---------------------------------------------------|
| `userId`         | number   | ID пользователя                                   |
| `firstName`      | string   | Имя                                               |
| `lastName`       | string   | Фамилия                                           |
| `position`       | string?  | Должность                                         |
| `isBound`        | boolean  | Привязан ли к станку                              |
| `currentBinding` | object?  | Информация о текущей привязке (если `isBound=true`)|

---

## 4. Привязать оператора к станку

Мастер привязывает оператора к станку. Можно указать номер оператора — если номер занят, остальные сдвигаются на +1.

```
POST /machins/master/operator-binding/bind
```

### Body (JSON)

| Поле             | Тип    | Обязательный | Описание                                                    |
|------------------|--------|--------------|-------------------------------------------------------------|
| `operatorId`     | number | ✅            | ID оператора (userId)                                       |
| `machineId`      | number | ✅            | ID станка                                                   |
| `operatorNumber` | number | ❌            | Номер оператора (если не указан — назначается автоматически) |

### Пример запроса

```http
POST /machins/master/operator-binding/bind
Content-Type: application/json

{
  "operatorId": 5,
  "machineId": 3
}
```

### Пример запроса с указанием номера

```http
POST /machins/master/operator-binding/bind
Content-Type: application/json

{
  "operatorId": 5,
  "machineId": 3,
  "operatorNumber": 1
}
```

### Пример ответа (200)

```json
{
  "success": true,
  "message": "Оператор Иван Иванов привязан к станку \"Станок №3\" как оператор №1",
  "binding": {
    "bindingId": 42,
    "machineId": 3,
    "machineName": "Станок №3",
    "machineCode": "H433",
    "operatorNumber": 1,
    "boundAt": "2026-11-27T09:30:00.000Z"
  }
}
```

### Логика номеров

- Если `operatorNumber` **не указан** — назначается следующий свободный номер (max + 1).
- Если `operatorNumber` **указан** и номер **свободен** — ставится указанный номер.
- Если `operatorNumber` **указан** и номер **занят** — все операторы с номером ≥ указанного сдвигаются на +1.

### Ошибки

| Код | Описание                                    |
|-----|---------------------------------------------|
| 404 | Оператор или станок не найден               |
| 409 | Оператор уже привязан к другому станку      |

---

## 5. Отвязать оператора от станка

Мастер отвязывает оператора от станка.

```
POST /machins/master/operator-binding/unbind
```

### Body (JSON)

| Поле         | Тип    | Обязательный | Описание              |
|--------------|--------|--------------|-----------------------|
| `operatorId` | number | ✅            | ID оператора (userId) |
| `machineId`  | number | ✅            | ID станка             |

### Пример запроса

```http
POST /machins/master/operator-binding/unbind
Content-Type: application/json

{
  "operatorId": 5,
  "machineId": 3
}
```

### Пример ответа (200)

```json
{
  "success": true,
  "message": "Оператор Иван Иванов отвязан от станка \"Станок №3\"",
  "unboundAt": "2026-11-27T17:00:00.000Z"
}
```

### Ошибки

| Код | Описание                          |
|-----|-----------------------------------|
| 404 | Оператор не найден                |
| 404 | Активная привязка не найдена      |

---

## 6. Изменить номер оператора на станке

Изменяет порядковый номер оператора на станке. Если новый номер занят — все операторы с этим и большими номерами сдвигаются на +1.

```
PUT /machins/master/operator-binding/change-number
```

### Body (JSON)

| Поле                | Тип    | Обязательный | Описание                |
|---------------------|--------|--------------|-------------------------|
| `operatorId`        | number | ✅            | ID оператора (userId)   |
| `machineId`         | number | ✅            | ID станка               |
| `newOperatorNumber` | number | ✅            | Новый номер (≥ 1)       |

### Пример запроса

```http
PUT /machins/master/operator-binding/change-number
Content-Type: application/json

{
  "operatorId": 8,
  "machineId": 3,
  "newOperatorNumber": 1
}
```

### Пример ответа (200)

```json
{
  "success": true,
  "message": "Номер оператора изменен с 2 на 1",
  "oldNumber": 2,
  "newNumber": 1
}
```

### Логика сдвига номеров

**Пример:** На станке 3 оператора: №1 (Иван), №2 (Петр), №3 (Сергей).

Мастер ставит Сергею номер 1:
- Иван: №1 → №2
- Петр: №2 → №3
- Сергей: №3 → №1

Результат: №1 (Сергей), №2 (Иван), №3 (Петр).

### Ошибки

| Код | Описание                              |
|-----|---------------------------------------|
| 404 | Станок не найден                      |
| 404 | Оператор не привязан к станку         |

---

## WebSocket уведомления

Все мутации (привязка, отвязка, смена номера) отправляют WebSocket-события:

| Комнаты                                                                                    | Событие              | Данные               |
|--------------------------------------------------------------------------------------------|----------------------|----------------------|
| `room:masterceh`, `room:machines`, `room:machinesnosmen`, `room:masterypack`, `room:machinesypack` | `machine:event`      | `{ status: 'updated' }` |
| `room:technologist`, `room:director`                                                       | `machine_setting:event` | `{ status: 'updated' }` |

---

## Типичный сценарий использования на фронтенде

1. **Мастер открывает страницу** → вызываем `GET /segments?masterId={userId мастера}` → получаем список участков.
2. **Мастер выбирает участок** → вызываем `GET /machines?stageId={выбранный stageId}` → получаем станки с операторами.
3. **Мастер хочет привязать оператора** → вызываем `GET /operators` → получаем список свободных и занятых операторов.
4. **Мастер привязывает** → `POST /bind` с `operatorId` и `machineId`.
5. **Мастер отвязывает** → `POST /unbind` с `operatorId` и `machineId`.
6. **Мастер меняет номер** → `PUT /change-number` с `operatorId`, `machineId` и `newOperatorNumber`.
7. **Обновление данных** → слушаем WebSocket событие `machine:event` и перезапрашиваем данные.
