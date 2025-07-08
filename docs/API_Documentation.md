# API Документация - Система управления деталями

## Базовый URL
```
/api
```

## Эндпоинты

### 1. Парсер Excel файлов

#### POST /parser/upload
**Описание:** Загрузка и парсинг Excel файла с возможностью указания упаковки

**Content-Type:** multipart/form-data

**Параметры:**
- `file` (файл) - Excel файл (.xls или .xlsx), максимум 10MB
- `packageId` (number, опционально) - ID упаковки для проверки связей (минимум 1)
- `quantity` (number, опционально) - Количество деталей в упаковке (минимум 1)

**Ответ при успехе:**
```json
{
  "message": "Файл успешно обработан",
  "filename": "string",
  "data": [
    {
      "partSku": "string",
      "partName": "string",
      "materialName": "string",
      "materialSku": "string",
      "thickness": "number",
      "thicknessWithEdging": "number",
      "finishedLength": "number",
      "finishedWidth": "number",
      "groove": "string",
      "edgingSkuL1": "string",
      "edgingNameL1": "string",
      "edgingSkuL2": "string",
      "edgingNameL2": "string",
      "edgingSkuW1": "string",
      "edgingNameW1": "string",
      "edgingSkuW2": "string",
      "edgingNameW2": "string",
      "plasticFace": "string",
      "plasticFaceSku": "string",
      "plasticBack": "string",
      "plasticBackSku": "string",
      "pf": "boolean",
      "pfSku": "string",
      "sbPart": "boolean",
      "pfSb": "boolean",
      "sbPartSku": "string",
      "conveyorPosition": "number",
      "detailExists": "boolean",
      "packages": [
        {
          "packageCode": "string",
          "packageName": "string",
          "quantity": "number"
        }
      ],
      "diffs": [
        {
          "field": "string",
          "dbValue": "any",
          "parsedValue": "any"
        }
      ],
      "packageId": "number",
      "quantity": "number",
      "hasPackageConnection": "boolean"
    }
  ],
  "packageId": "number",
  "quantity": "number"
}
```

**Ошибки:**
- 400 - Файл не загружен / Неподдерживаемый формат / Ошибка обработки

### 2. Управление деталями

#### GET /details/package/:packageId
**Описание:** Получение всех деталей связанных с упаковкой

**Параметры URL:**
- `packageId` (number) - ID упаковки

**Ответ:**
```json
{
  "message": "Детали успешно получены",
  "data": [
    {
      "id": "number",
      "partSku": "string",
      "partName": "string",
      "materialName": "string",
      "materialSku": "string",
      "thickness": "number",
      "thicknessWithEdging": "number",
      "finishedLength": "number",
      "finishedWidth": "number",
      "groove": "string",
      "edgingSkuL1": "string",
      "edgingNameL1": "string",
      "edgingSkuL2": "string",
      "edgingNameL2": "string",
      "edgingSkuW1": "string",
      "edgingNameW1": "string",
      "edgingSkuW2": "string",
      "edgingNameW2": "string",
      "plasticFace": "string",
      "plasticFaceSku": "string",
      "plasticBack": "string",
      "plasticBackSku": "string",
      "pf": "boolean",
      "pfSku": "string",
      "sbPart": "boolean",
      "pfSb": "boolean",
      "sbPartSku": "string",
      "conveyorPosition": "number",
      "quantity": "number",
      "packageDetails": [
        {
          "package": {
            "packageCode": "string",
            "packageName": "string"
          }
        }
      ]
    }
  ]
}
```

**Ошибки:**
- 404 - Упаковка не найдена

#### PUT /details/:id
**Описание:** Обновление детали

**Параметры URL:**
- `id` (number) - ID детали

**Тело запроса:**
```json
{
  "partSku": "string",
  "partName": "string",
  "materialName": "string",
  "materialSku": "string",
  "thickness": "number",
  "thicknessWithEdging": "number",
  "finishedLength": "number",
  "finishedWidth": "number",
  "groove": "string",
  "edgingSkuL1": "string",
  "edgingNameL1": "string",
  "edgingSkuL2": "string",
  "edgingNameL2": "string",
  "edgingSkuW1": "string",
  "edgingNameW1": "string",
  "edgingSkuW2": "string",
  "edgingNameW2": "string",
  "plasticFace": "string",
  "plasticFaceSku": "string",
  "plasticBack": "string",
  "plasticBackSku": "string",
  "pf": "boolean",
  "pfSku": "string",
  "sbPart": "boolean",
  "pfSb": "boolean",
  "sbPartSku": "string",
  "conveyorPosition": "number"
}
```

**Ответ:**
```json
{
  "message": "Деталь успешно обновлена",
  "data": {
    "id": "number",
    "partSku": "string",
    "partName": "string",
    "materialName": "string",
    "materialSku": "string",
    "thickness": "number",
    "thicknessWithEdging": "number",
    "finishedLength": "number",
    "finishedWidth": "number",
    "groove": "string",
    "edgingSkuL1": "string",
    "edgingNameL1": "string",
    "edgingSkuL2": "string",
    "edgingNameL2": "string",
    "edgingSkuW1": "string",
    "edgingNameW1": "string",
    "edgingSkuW2": "string",
    "edgingNameW2": "string",
    "plasticFace": "string",
    "plasticFaceSku": "string",
    "plasticBack": "string",
    "plasticBackSku": "string",
    "pf": "boolean",
    "pfSku": "string",
    "sbPart": "boolean",
    "pfSb": "boolean",
    "sbPartSku": "string",
    "conveyorPosition": "number"
  }
}
```

**Ошибки:**
- 404 - Деталь не найдена
- 400 - Деталь с новым артикулом уже существует

#### DELETE /details/:id
**Описание:** Удаление детали

**Параметры URL:**
- `id` (number) - ID детали

**Ответ:**
```json
{
  "message": "Деталь успешно удалена"
}
```

**Ошибки:**
- 404 - Деталь не найдена
- 400 - Нельзя удалить деталь, связанную с упаковками

#### POST /details/with-package
**Описание:** Создание новой детали с привязкой к упаковке

**Тело запроса:**
```json
{
  "partSku": "string",
  "partName": "string",
  "materialName": "string",
  "materialSku": "string",
  "thickness": "number",
  "thicknessWithEdging": "number",
  "finishedLength": "number",
  "finishedWidth": "number",
  "groove": "string",
  "edgingSkuL1": "string",
  "edgingNameL1": "string",
  "edgingSkuL2": "string",
  "edgingNameL2": "string",
  "edgingSkuW1": "string",
  "edgingNameW1": "string",
  "edgingSkuW2": "string",
  "edgingNameW2": "string",
  "plasticFace": "string",
  "plasticFaceSku": "string",
  "plasticBack": "string",
  "plasticBackSku": "string",
  "pf": "boolean",
  "pfSku": "string",
  "sbPart": "boolean",
  "pfSb": "boolean",
  "sbPartSku": "string",
  "conveyorPosition": "number",
  "packageId": "number",
  "quantity": "number"
}
```

**Ответ:**
```json
{
  "message": "Деталь успешно создана и привязана к упаковке",
  "data": {
    "id": "number",
    "partSku": "string",
    "partName": "string",
    "materialName": "string",
    "materialSku": "string",
    "thickness": "number",
    "thicknessWithEdging": "number",
    "finishedLength": "number",
    "finishedWidth": "number",
    "groove": "string",
    "edgingSkuL1": "string",
    "edgingNameL1": "string",
    "edgingSkuL2": "string",
    "edgingNameL2": "string",
    "edgingSkuW1": "string",
    "edgingNameW1": "string",
    "edgingSkuW2": "string",
    "edgingNameW2": "string",
    "plasticFace": "string",
    "plasticFaceSku": "string",
    "plasticBack": "string",
    "plasticBackSku": "string",
    "pf": "boolean",
    "pfSku": "string",
    "sbPart": "boolean",
    "pfSb": "boolean",
    "sbPartSku": "string",
    "conveyorPosition": "number"
  }
}
```

**Ошибки:**
- 404 - Упаковка не найдена
- 400 - Деталь с таким артикулом уже связана с упаковкой

#### POST /details/save-from-file
**Описание:** Сохранение деталей из файла с привязкой к упаковкам

**Тело запроса:**
```json
{
  "packageId": "number",
  "details": [
    {
      "partSku": "string",
      "partName": "string",
      "materialName": "string",
      "materialSku": "string",
      "thickness": "number",
      "thicknessWithEdging": "number",
      "finishedLength": "number",
      "finishedWidth": "number",
      "groove": "string",
      "edgingSkuL1": "string",
      "edgingNameL1": "string",
      "edgingSkuL2": "string",
      "edgingNameL2": "string",
      "edgingSkuW1": "string",
      "edgingNameW1": "string",
      "edgingSkuW2": "string",
      "edgingNameW2": "string",
      "plasticFace": "string",
      "plasticFaceSku": "string",
      "plasticBack": "string",
      "plasticBackSku": "string",
      "pf": "boolean",
      "pfSku": "string",
      "sbPart": "boolean",
      "pfSb": "boolean",
      "sbPartSku": "string",
      "conveyorPosition": "number",
      "quantity": "number"
    }
  ]
}
```

**Ответ:**
```json
{
  "message": "Детали успешно сохранены",
  "data": {
    "created": "number",
    "updated": "number",
    "connected": "number"
  }
}
```

**Ошибки:**
- 404 - Упаковка не найдена

## Дополнительная информация

### Поля детали
- `partSku` - Артикул детали (обязательное, уникальное)
- `partName` - Наименование детали (обязательное)
- `materialName` - Наименование материала
- `materialSku` - Артикул материала
- `thickness` - Толщина детали
- `thicknessWithEdging` - Толщина с учетом облицовки пласти
- `finishedLength` - Готовая деталь [L]
- `finishedWidth` - Готовая деталь [W]
- `groove` - Паз
- `edgingSkuL1/L2/W1/W2` - Артикулы облицовки кромки
- `edgingNameL1/L2/W1/W2` - Наименования облицовки кромки
- `plasticFace/Back` - Пластик лицевая/нелицевая
- `plasticFaceSku/BackSku` - Артикулы пластика
- `pf` - ПФ (boolean)
- `pfSku` - Артикул ПФ
- `sbPart` - СБ деталь (boolean)
- `pfSb` - ПФ СБ (boolean)
- `sbPartSku` - Артикул СБ детали
- `conveyorPosition` - Подстопное место на конвейере

### Валидация парсера
При парсинге Excel файлов система:
1. Проверяет существование детали в БД по `partSku`
2. Находит связанные упаковки
3. Сравнивает поля и возвращает различия в массиве `diffs`
4. Устанавливает флаг `detailExists`
5. Проверяет связь с указанной упаковкой (флаг `hasPackageConnection`)

### Требования к Excel файлу
- Формат: .xls или .xlsx
- Максимальный размер: 10MB
- Заголовки должны быть на русском языке в первых 10 строках
- Обязательные столбцы согласно маппингу в ParserService:
  - Артикул детали
  - Наименование детали
  - Наименование материала
  - Артикул материала
  - Толщина детали
  - Толщина с учетом облицовки пласти
  - Количество
  - Готовая деталь [L]
  - Готовая деталь [W]
  - Паз
  - Артикул облицовки кромки [L1]
  - Наименование облицовки кромки [L1]
  - Артикул облицовки кромки [L2]
  - Наименование облицовки кромки [L2]
  - Артикул облицовки кромки [W1]
  - Наименование облицовки кромки [W1]
  - Артикул облицовки кромки [W2]
  - Наименование облицовки кромки [W2]
  - Пластик (лицевая)
  - Пластик (лицевая) артикул
  - Пластик (нелицевая)
  - Пластик (нелицевая) артикул
  - ПФ
  - Артикул ПФ (для детали)
  - СБ деталь
  - ПФ СБ
  - Артикул СБ детали (для ПФ СБ)
  - Упаковка
  - Артикул упаковки
  - Подстопное место на конвейере

### Работа с упаковками

#### Создание деталей с привязкой к упаковке
Используйте эндпоинт `POST /details/with-package` для создания детали с одновременной привязкой к упаковке:
- Если деталь с таким артикулом уже существует, создается только связь с упаковкой
- Если деталь не существует, создается новая деталь и связь с упаковкой
- Проверяется существование упаковки перед созданием связи
- `packageId` и `quantity` являются обязательными полями (минимум 1)

#### Парсинг файлов с проверкой упаковки
При загрузке файла через `POST /parser/upload` можно указать:
- `packageId` - для проверки связей деталей с конкретной упаковкой (минимум 1)
- `quantity` - количество деталей в упаковке (минимум 1)
- В ответе для каждой детали будет флаг `hasPackageConnection`, показывающий есть ли связь с указанной упаковкой

#### Сохранение деталей из файла
После парсинга и проверки используйте `POST /details/save-from-file` для массового сохранения:
- Принимает `packageId` в корне запроса и масс��в деталей с указанием `quantity` для каждой детали
- Автоматически создает новые детали или обновляет существующие
- Создает связи с упаковками или обновляет количество в существующих связях
- Возвращает статистику: количество созданных, обновленных и подключенных деталей

### Логика работы системы

#### Создание деталей (не через файл)
1. Фронтенд отправляет данные детали + `packageId` + `quantity`
2. Система проверяет существование упаковки
3. Если деталь существует - создается только связь с упаковкой
4. Если деталь не существует - создается деталь и связь с упаковкой

#### Создание деталей через файл
1. Фронтенд загружает файл + `packageId` + `quantity`
2. Система парсит файл и проверяет каждую деталь
3. Возвращает результат с отметками о существовании деталей и связях
4. Фронтенд может отредактировать данные
5. Фронтенд отправляет финальные данные через `POST /details/save-from-file` с `packageId` в корне запроса и `quantity` для каждой детали
6. Система сохраняет детали и создает связи с упаковками

#### Обновление деталей
- Используется эндпоинт `PUT /details/:id`
- Проверяется уникальность артикула при его изменении
- Обн��вляются только переданные поля

#### Удаление деталей
- Используется эндпоинт `DELETE /details/:id`
- Проверяется отсутствие связей с упаковками перед у��алением
- Если есть связи - возвращается ошибка

### Валидация данных
- Все поля кроме `partSku` и `partName` являются опциональными
- `packageId` и `quantity` должны быть положительными числами (минимум 1)
- Система автоматически очищает undefined значения перед сохранением в БД
- Обязательные поля проверяются на заполненность