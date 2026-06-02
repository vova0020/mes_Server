# Custom Machine Tasks API

## Описание
API для работы с задачами станков в режиме оператора. Позволяет операторам брать в работу и завершать поддоны и детали.

## Эндпоинты

### 1. Получить список задач для станка
```
GET /custom/machines/tasks?machineId={machineId}&stageId={stageId}
```

**Параметры запроса:**
- `machineId` (number) - ID станка
- `stageId` (number) - ID этапа маршрута

**Ответ:** Список поддонов с информацией о статусе, количестве деталей и т.д.

---

### 2. Получить детали поддона
```
GET /custom/machines/tasks/parts?customPalletId={customPalletId}&stageId={stageId}
```

**Параметры запроса:**
- `customPalletId` (number) - ID поддона
- `stageId` (number) - ID этапа маршрута

**Ответ:** Список деталей на поддоне с информацией о статусе обработки.

---

### 3. Взять поддон в работу
```
POST /custom/machines/tasks/assignments/:assignmentId/start
```

**Параметры пути:**
- `assignmentId` (number) - ID задания (assignment)

**Описание:**
- Переводит задание в статус `IN_PROGRESS`
- Переводит все детали задания в статус `IN_PROGRESS` (кроме уже завершенных)
- Если заказ еще не в работе, переводит его в статус `IN_PROGRESS`
- Отправляет WebSocket уведомления

**Ответ:**
```json
{
  "status": "SUCCESS",
  "message": "Работа над поддоном начата",
  "assignmentId": 123,
  "startedAt": "2026-06-02T11:00:00.000Z",
  "orderStatusChanged": true
}
```

---

### 4. Завершить работу над поддоном
```
POST /custom/machines/tasks/assignments/:assignmentId/complete
```

**Параметры пути:**
- `assignmentId` (number) - ID задания

**Описание:**
- Завершает все незавершенные детали задания
- Создает записи прогресса для каждой детали
- Создает записи операций в `custom_machine_operations`
- Переводит задание в статус `COMPLETED`
- Отправляет WebSocket уведомления

**Ответ:**
```json
{
  "status": "SUCCESS",
  "message": "Работа над поддоном завершена",
  "assignmentId": 123,
  "completedAt": "2026-06-02T11:30:00.000Z"
}
```

---

### 5. Взять деталь в работу
```
POST /custom/machines/tasks/assignments/parts/:assignmentPartId/start
```

**Параметры пути:**
- `assignmentPartId` (number) - ID детали в задании

**Описание:**
- Переводит деталь в статус `IN_PROGRESS`
- Создает или обновляет запись прогресса в `custom_pallet_part_stage_progress`
- Если поддон еще не в работе, автоматически переводит его в работу
- Если заказ еще не в работе, переводит его в статус `IN_PROGRESS`
- Отправляет WebSocket уведомления

**Ответ:**
```json
{
  "status": "SUCCESS",
  "message": "Работа над деталью начата, поддон переведен в работу",
  "assignmentPartId": 456,
  "palletStatusChanged": true,
  "orderStatusChanged": true
}
```

---

### 6. Завершить работу над деталью
```
POST /custom/machines/tasks/assignments/parts/:assignmentPartId/complete
```

**Параметры пути:**
- `assignmentPartId` (number) - ID детали в задании

**Тело запроса:**
```json
{
  "processedQuantity": 10
}
```

**Поля:**
- `processedQuantity` (number, обязательное) - Количество обработанных деталей

**Описание:**
- Завершает работу над деталью с указанным количеством
- Обновляет запись прогресса в `custom_pallet_part_stage_progress`
- Создает запись операции в `custom_machine_operations`
- Если все детали поддона завершены, автоматически завершает поддон
- Отправляет WebSocket уведомления

**Ответ:**
```json
{
  "status": "SUCCESS",
  "message": "Работа над деталью завершена, поддон завершен автоматически",
  "assignmentPartId": 456,
  "processedQuantity": 10,
  "palletCompleted": true
}
```

---

## Логика работы

### Взятие в работу
1. **Поддон**: Переводит все детали в `IN_PROGRESS`, обновляет статус заказа
2. **Деталь**: Создает прогресс, автоматически берет поддон в работу если нужно

### Завершение работы
1. **Поддон**: Завершает все детали, создает операции, обновляет прогресс
2. **Деталь**: Завершает деталь, автоматически завершает поддон если все детали готовы

### WebSocket уведомления
Отправляются в комнаты:
- `room:masterceh` - для мастеров цеха
- `room:machines` - для операторов станков
- `room:technologist` - для технологов (при изменении статуса заказа)
- `room:director` - для директоров (при изменении статуса заказа)

События:
- `machine_task:event` - изменение задач
- `pallet:event` - изменение поддонов
- `order:event` - изменение заказов
- `order:stats` - обновление статистики заказов

---

## Примеры использования

### Сценарий 1: Оператор берет поддон в работу целиком
```bash
# 1. Получить список задач
GET /custom/machines/tasks?machineId=5&stageId=10

# 2. Взять поддон в работу
POST /custom/machines/tasks/assignments/123/start

# 3. Завершить поддон
POST /custom/machines/tasks/assignments/123/complete
```

### Сценарий 2: Оператор работает с деталями по отдельности
```bash
# 1. Получить список задач
GET /custom/machines/tasks?machineId=5&stageId=10

# 2. Получить детали поддона
GET /custom/machines/tasks/parts?customPalletId=50&stageId=10

# 3. Взять первую деталь в работу
POST /custom/machines/tasks/assignments/parts/456/start

# 4. Завершить первую деталь
POST /custom/machines/tasks/assignments/parts/456/complete
Body: { "processedQuantity": 10 }

# 5. Взять вторую деталь в работу
POST /custom/machines/tasks/assignments/parts/457/start

# 6. Завершить вторую деталь (поддон завершится автоматически)
POST /custom/machines/tasks/assignments/parts/457/complete
Body: { "processedQuantity": 15 }
```

---

## Отличия от Master API

| Функция | Master API | Tasks API |
|---------|-----------|-----------|
| Путь | `/custom/machines/...` | `/custom/machines/tasks/...` |
| Назначение | Управление заданиями мастером | Выполнение заданий оператором |
| Дополнительные функции | Удаление, переназначение | Только старт/завершение |
| Получение списка | `GET /:machineId/assignments` | `GET /?machineId=X&stageId=Y` |

Логика работы методов `start` и `complete` идентична в обоих API.
