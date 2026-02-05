# API для загрузки материалов из Excel файла

## Эндпоинты

### 1. Загрузка и парсинг Excel файла
**POST** `/settings/materials/upload`

Загружает Excel файл, парсит его и возвращает данные для предварительного просмотра.

**Content-Type:** `multipart/form-data`

**Параметры:**
- `file` (file) - Excel файл (.xls или .xlsx)
- `groupId` (number) - ID группы материалов, к которой будут привязаны материалы

**Формат Excel файла:**
Файл должен содержать колонки:
- `Код` или `Артикул` - артикул материала (может быть в любой колонке)
- `Наименование` - название материала (должно быть справа от колонки Код/Артикул)

**Важно:** 
- Колонки могут находиться в любом месте таблицы
- Заголовки ищутся в первых 20 строках файла
- Парсер автоматически находит нужные колонки и парсит данные до первой пустой строки

Пример 1 (стандартный):
```
| Код   | Наименование                           |
|-------|----------------------------------------|
| 11111 | ЛДСП Белая 16мм (2800x2070) 0101 PE   |
| 22222 | ЛДСП Дуб Белый Craft 16мм             |
```

Пример 2 (с отступами и дополнительными колонками):
```
|       | A     | B                                      | C   |
|-------|-------|----------------------------------------|-----|
| Текст |       |                                        |     |
|       | Код   | Наименование                           |     |
|       | 11111 | ЛДСП Белая 16мм (2800x2070) 0101 PE   |     |
|       | 22222 | ЛДСП Дуб Белый Craft 16мм             |     |
```

Пример 3 (с Артикул вместо Код):
```
| Артикул | Наименование                         |
|---------|--------------------------------------|
| 11111   | ЛДСП Белая 16мм (2800x2070) 0101 PE |
| 22222   | ЛДСП Дуб Белый Craft 16мм           |
```

**Пример запроса (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('groupId', '1');

const response = await fetch('/settings/materials/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
```

**Ответ (успех):**
```json
{
  "message": "Файл успешно обработан",
  "filename": "materials.xlsx",
  "data": [
    {
      "code": "11111",
      "name": "ЛДСП Белая 16мм (2800x2070) 0101 PE",
      "exists": false
    },
    {
      "code": "22222",
      "name": "ЛДСП Дуб Белый Craft 16мм",
      "exists": true,
      "existingMaterial": {
        "materialId": 124,
        "materialName": "ЛДСП Дуб Белый Craft 16мм (старое название)",
        "article": "22222",
        "unit": "шт"
      }
    }
  ],
  "groupId": 1
}
```

**Поля в ответе:**
- `exists: false` - материал новый, будет создан
- `exists: true` - материал уже существует, будет обновлен
- `existingMaterial` - информация о существующем материале (если `exists: true`)

**Ответ (ошибка):**
```json
{
  "statusCode": 400,
  "message": "Ошибка обработки файла: Не найдена строка с заголовками (Код/Артикул, Наименование)",
  "error": "Bad Request"
}
```

---

### 2. Сохранение материалов из файла
**POST** `/settings/materials/save-from-file`

Сохраняет распарсенные материалы в базу данных.

**Content-Type:** `application/json`

**Body:**
```json
{
  "groupId": 1,
  "materials": [
    {
      "code": "11111",
      "name": "ЛДСП Белая 16мм (2800x2070) 0101 PE"
    },
    {
      "code": "22222",
      "name": "ЛДСП Дуб Белый Craft 16мм"
    }
  ]
}
```

**Пример запроса:**
```javascript
const response = await fetch('/settings/materials/save-from-file', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    groupId: 1,
    materials: parsedData, // данные из предыдущего эндпоинта
  }),
});

const result = await response.json();
```

**Ответ:**
```json
{
  "created": [
    {
      "code": "11111",
      "name": "ЛДСП Белая 16мм (2800x2070) 0101 PE",
      "materialId": 123
    }
  ],
  "updated": [
    {
      "code": "22222",
      "name": "ЛДСП Дуб Белый Craft 16мм",
      "materialId": 124
    }
  ],
  "errors": []
}
```

---

### 3. Получение списка единиц измерения
**GET** `/settings/materials/units`

Возвращает список всех используемых единиц измерения.

**Пример запроса:**
```javascript
const response = await fetch('/settings/materials/units');
const units = await response.json();
```

**Ответ:**
```json
["шт", "кг", "м", "м²", "м³"]
```

---

## Логика работы на фронтенде

### Шаг 1: Загрузка файла
```javascript
async function uploadMaterialFile(file, groupId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('groupId', groupId);

  const response = await fetch('/settings/materials/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

### Шаг 2: Предварительный просмотр
После получения данных показать пользователю таблицу с материалами для проверки.

**Важно:** В данных будет информация о существующих материалах:
- Если `exists: false` - материал будет создан
- Если `exists: true` - материал будет обновлен, показать пользователю старое название из `existingMaterial.materialName`

### Шаг 3: Сохранение
```javascript
async function saveMaterials(groupId, materials) {
  const response = await fetch('/settings/materials/save-from-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupId, materials }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

### Шаг 4: Отображение результатов
```javascript
const result = await saveMaterials(groupId, materials);

console.log(`Создано: ${result.created.length}`);
console.log(`Обновлено: ${result.updated.length}`);
console.log(`Ошибок: ${result.errors.length}`);

if (result.errors.length > 0) {
  console.error('Ошибки:', result.errors);
}
```

---

## Примечания

1. **Формат файла**: Файл должен быть Excel (.xls или .xlsx), максимальный размер 10MB
2. **Заголовки**: Парсер ищет колонки "Код" или "Артикул" и "Наименование" (справа от Код/Артикул) в первых 20 строках файла
3. **Гибкое расположение**: Колонки могут находиться в любом месте таблицы, парсер автоматически их найдет
4. **Пустые строки**: Парсинг останавливается при первой полностью пустой строке (когда и код, и наименование пустые)
5. **Дубликаты**: Если материал с таким артикулом (код) уже существует, он будет обновлен (название изменится)
6. **Проверка существующих**: При загрузке файла сразу проверяются все материалы на существование в БД
7. **Группы**: Материал автоматически привязывается к указанной группе
8. **Единица измерения**: По умолчанию для новых материалов устанавливается "шт"
9. **WebSocket**: После сохранения отправляется событие `material:event` с `status: 'updated'`
10. **Большие файлы**: Парсер поддерживает файлы с любым количеством материалов (100+)
