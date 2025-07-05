# Package Directory API Documentation

## Базовый URL
```
/package-directory
```

## Эндпоинты

### 1. Создание новой упаковки
**POST** `/package-directory`

**Описание:** Создает новую упаковку в справочнике

**Тело запроса:**
```json
{
  "packageCode": "string", // Обязательно - код упаковки
  "packageName": "string", // Обязательно - название упаковки
}
```

**Пример запроса:**
```json
{
  "packageCode": "PKG001",
  "packageName": "Стандартная упаковка",
}
```

**Ответ (201 Created):**
```json
{
  "packageId": "number",
  "packageCode": "string",
  "packageName": "string",
  "createdAt": "string",
  "updatedAt": "string",
}
```

**Возможные ошибки:**
- `400 Bad Request` - Упаковка с таким кодом уже существует
- `400 Bad Request` - Ошибка валидации данных

---

### 2. Получение всех упаковок
**GET** `/package-directory`

**Описание:** Возвращает список всех упаковок с деталями

**Параметры:** Нет

**Ответ (200 OK):**
```json
[
  {
    "packageId": "number",
    "packageCode": "string",
    "packageName": "string",
    "createdAt": "string",
    "updatedAt": "string",
  }
]
```

---

### 3. Обновление упаковки
**PATCH** `/package-directory/:id`

**Описание:** Обновляет данные упаковки

**Параметры URL:**
- `id` (number) - ID упаковки

**Тело запроса:**
```json
{
  "packageCode": "string", // Опционально - новый код ��паковки
  "packageName": "string", // Опционально - новое название упаковки
}
```

**Пример запроса:**
```json
{
  "packageName": "Обновленное название упаковки",
}
```

**Ответ (200 OK):**
```json
{
  "packageId": "number",
  "packageCode": "string",
  "packageName": "string",
  "createdAt": "string",
  "updatedAt": "string",
}
```

**Возможные ошибки:**
- `404 Not Found` - Упаковка с указанным ID не найдена
- `400 Bad Request` - Упаковка с новым кодом уже существует
- `400 Bad Request` - Ошибка валидации данных

---

### 4. Удаление упаковки
**DELETE** `/package-directory/:id`

**Описание:** Удаляет упаковку и все связанные с ней детали

**Параметры URL:**
- `id` (number) - ID упаковки

**Пример запроса:**
```
DELETE /package-directory/1
```

**Ответ (200 OK):**
```json
{
  "message": "Упаковка с ID 1 успешно удалена"
}
```

**Возможные ошибки:**
- `404 Not Found` - Упаковка с указанным ID не найдена

---
