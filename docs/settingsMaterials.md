
# API Документация для фронтенда - Модуль настроек материалов

## Базовая информация

**Base URL:** `http://localhost:3000`  
**API Version:** v1  
**Content-Type:** `application/json`

## Swagger документация
Полная интерактивная документация доступна по адресу: `http://localhost:3000/api`

---

## 📦 Типы данных

### MaterialGroup (Группа материалов)
```typescript
interface MaterialGroup {
  groupId: number;           // ID группы
  groupName: string;         // Название группы
  materialsCount?: number;   // Количество материалов в группе
}
```

### Material (Материал)
```typescript
interface Material {
  materialId: number;        // ID материала
  materialName: string;      // Название материала
  unit: string;             // Единица измерения
  groups?: Group[];         // Массив групп, к которым привязан материал
}

interface Group {
  groupId: number;          // ID группы
  groupName: string;        // Название группы
}
```

### DTO для создания/обновления

```typescript
// Создание группы материалов
interface CreateMaterialGroupDto {
  groupName: string;        // Название группы (обязательно)
}

// Обновление группы материалов
interface UpdateMaterialGroupDto {
  groupName?: string;       // Название группы (опционально)
}

// Создание материала
interface CreateMaterialDto {
  materialName: string;     // Название материала (обязательно)
  unit: string;            // Единица измерения (обязательно)
  groupIds?: number[];     // Массив ID групп (опционально)
}

// Обновление материала
interface UpdateMaterialDto {
  materialName?: string;    // Название материала (опционально)
  unit?: string;           // Единица измерения (опционально)
  groupIds?: number[];     // Массив ID групп (опционально)
}

// Привязка/отвязка материала к группе
interface LinkMaterialToGroupDto {
  groupId: number;         // ID группы (обязательно)
  materialId: number;      // ID материала (обязательно)
}
```

---

## 🏷️ Группы материалов API

### 1. Создать группу материалов
```http
POST /settings/material-groups
```

**Тело запроса:**
```json
{
  "groupName": "Металлы"
}
```

**Ответ (201):**
```json
{
  "groupId": 1,
  "groupName": "Металлы",
  "materialsCount": 0
}
```

**Возможные ошибки:**
- `409 Conflict` - Группа с таким названием уже существует

---

### 2. Получить все группы материалов
```http
GET /settings/material-groups
```

**Ответ (200):**
```json
[
  {
    "groupId": 1,
    "groupName": "Металлы",
    "materialsCount": 3
  },
  {
    "groupId": 2,
    "groupName": "Полимеры",
    "materialsCount": 1
  }
]
```

---

### 3. Получить группу по ID
```http
GET /settings/material-groups/{id}
```

**Параметры URL:**
- `id` (number) - ID группы материалов

**Ответ (200):**
```json
{
  "groupId": 1,
  "groupName": "Металлы",
  "materialsCount": 3
}
```

**Возможные ошибки:**
- `404 Not Found` - Группа не найдена

---

### 4. Обновить группу материалов
```http
PATCH /settings/material-groups/{id}
```

**Параметры URL:**
- `id` (number) - ID группы материалов

**Тело запроса:**
```json
{
  "groupName": "Сплавы металлов"
}
```

**Ответ (200):**
```json
{
  "groupId": 1,
  "groupName": "Сплавы металлов",
  "materialsCount": 3
}
```

**Возможные ошибки:**
- `404 Not Found` - Группа не найдена
- `409 Conflict` - Группа с таким названием уже существует

---

### 5. Удалить группу материалов
```http
DELETE /settings/material-groups/{id}
```

**Параметры URL:**
- `id` (number) - ID группы материалов

**Ответ (204):** Нет содержимого

**Возможные ошибки:**
- `404 Not Found` - Группа не найдена
- `409 Conflict` - Нельзя удалить группу, в которой есть материалы

---

### 6. Привязать материал к группе
```http
POST /settings/material-groups/link
```

**Тело запроса:**
```json
{
  "groupId": 1,
  "materialId": 2
}
```

**Ответ (201):** Нет содержимого

**Возможные ошибки:**
- `404 Not Found` - Группа или материал не найдены
- `409 Conflict` - Материал уже привязан к этой группе

---

### 7. Отвязать материал от группы
```http
POST /settings/material-groups/unlink
```

**Тело запроса:**
```json
{
  "groupId": 1,
  "materialId": 2
}
```

**Ответ (200):** Нет содержимого

**Возможные ошибки:**
- `404 Not Found` - Связь между материалом и группой не найдена

---

### 8. Получить все материалы в группе
```http
GET /settings/material-groups/{id}/materials
```

**Параметры URL:**
- `id` (number) - ID группы материалов

**Ответ (200):**
```json
[
  {
    "materialId": 1,
    "materialName": "Сталь нержавеющая",
    "unit": "кг"
  },
  {
    "materialId": 2,
    "materialName": "Алюминий",
    "unit": "кг"
  }
]
```

**Возможные ошибки:**
- `404 Not Found` - Группа не найдена

---

## 🧪 Материалы API

### 1. Создать материал
```http
POST /settings/materials
```

**Тело запроса:**
```json
{
  "materialName": "Сталь нержавеющая",
  "unit": "кг",
  "groupIds": [1, 2]
}
```

**Ответ (201):**
```json
{
  "materialId": 1,
  "materialName": "Сталь нержавеющая",
  "unit": "кг",
  "groups": [
    {
      "groupId": 1,
      "groupName": "Металлы"
    },
    {
      "groupId": 2,
      "groupName": "Конструкционные материалы"
    }
  ]
}
```

**Возможные ошибки:**
- `409 Conflict` - Материал с таким названием уже существует
- `404 Not Found` - Одна или несколько указанных групп не найдены

---

### 2. Получить все материалы
```http
GET /settings/materials
```

**Query параметры:**
- `groupId` (number, optional) - ID группы для фильтрации

**Примеры:**
```http
GET /settings/materials                    # Все материалы
GET /settings/materials?groupId=1          # Материалы группы с ID=1
```

**Ответ (200):**
```json
[
  {
    "materialId": 1,
    "materialName": "Сталь нержавеющая",
    "unit": "кг",
    "groups": [
      {
        "groupId": 1,
        "groupName": "Металлы"
      }
    ]
  },
  {
    "materialId": 2,
    "materialName": "Полиэтилен",
    "unit": "кг",
    "groups": [
      {
        "groupId": 2,
        "groupName": "Полимеры"
      }
    ]
  }
]
```

---

### 3. Получить материал по ID
```http
GET /settings/materials/{id}
```

**Параметры URL:**
- `id` (number) - ID материала

**Ответ (200):**
```json
{
  "materialId": 1,
  "materialName": "Сталь нержавеющая",
  "unit": "кг",
  "groups": [
    {
      "groupId": 1,
      "groupName": "Металлы"
    },
    {
      "groupId": 2,
      "groupName": "Конструкционные материалы"
    }
  ]
}
```

**Возможные ошибки:**
- `404 Not Found` - Материал не найден

---

### 4. Обновить материал
```http
PATCH /settings/materials/{id}
```

**Параметры URL:**
- `id` (number) - ID материала

**Тело запроса:**
```json
{
  "materialName": "Сталь углеродистая",
  "unit": "т",
  "groupIds": [1, 3]
}
```

**Ответ (200):**
```json
{
  "materialId": 1,
  "materialName": "Сталь углеродистая",
  "unit": "т",
  "groups": [
    {
      "groupId": 1,
      "groupName": "Металлы"
    },
    {
      "groupId": 3,
      "groupName": "Сырье"
    }
  ]
}
```

**Возможные ошибки:**
- `404 Not Found` - Материал не найден
- `409 Conflict` - Материал с таким названием уже существует

---

### 5. Удалить материал
```http
DELETE /settings/materials/{id}
```

**Параметры URL:**
- `id` (number) - ID материала

**Ответ (204):** Нет содержимого

**Возможные ошибки:**
- `404 Not Found` - Материал не найден
- `409 Conflict` - Нельзя удалить материал, который используется в деталях производства

---

## ⚠️ Обработка ошибок

API возвращает стандартные HTTP коды состояния:

- **200 OK** - Успешный запрос
- **201 Created** - Ресурс успешно создан
- **204 No Content** - Ресурс успешно удален
- **400 Bad Request** - Некорректные данные запроса
- **404 Not Found** - Ресурс не найден
- **409 Conflict** - Конфликт данных (дублирование названий, нарушение связей)
- **500 Internal Server Error** - Внутренняя ошибка сервера

### Пример обработки ошибок:

```typescript
try {
  await api.createMaterial(materialData);
} catch (error) {
  if (error.status === 409) {
    // Материал с таким названием уже существует
    alert('Материал с таким названием уже существует');
  } else if (error.status === 404) {
    // Одна из групп не найдена
    alert('Одна или несколько указанных групп не найдены');
  } else {
    // Другие ошибки
    alert('Произошла ошибка при создании материала');
  }
}
```

---
