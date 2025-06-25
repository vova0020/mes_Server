# API Документация для фронтенда - Модуль Packaging

## Базовый URL
```
/packaging
```

---

## 1. Packaging Controller

### 1.1 Получение списка упаковок с фильтрами
**GET** `/packaging`

#### Query параметры:
```typescript
{
  orderId?: number;    // ID заказа для фильтрации упаковок
  page?: number;       // Номер страницы (по умолчанию: 1)
  limit?: number;      // Количество элементов на странице (по умолчанию: 10)
}
```

#### Пример запроса:
```
GET /packaging?orderId=123&page=1&limit=20
```

#### Ответ:
```typescript
{
  packages: [
    {
      id: number;
      orderId: number;
      packageCode: string;
      packageName: string;
      completionPercentage: number;
      order: {
        orderName: string;
        batchNumber: string;
        isCompleted?: boolean;
      };
      parts: [
        {
          partId: number;
          partCode: string;
          partName: string;
          quantity: number;
          status?: string;
          totalQuantity?: number;
          requiredQuantity?: number;
        }
      ];
    }
  ];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### 1.2 Получение упаковок по ID заказа
**GET** `/packaging/by-order/:orderId`

#### Path параметры:
- `orderId` (string) - ID заказа

#### Пример запроса:
```
GET /packaging/by-order/123
```

#### Ответ:
```typescript
{
  packages: [
    {
      id: number;
      orderId: number;
      packageCode: string;
      packageName: string;
      completionPercentage: number;
      order: {
        orderName: string;
        batchNumber: string;
        isCompleted?: boolean;
      };
      parts: [
        {
          partId: number;
          partCode: string;
          partName: string;
          quantity: number;
          status?: string;
          totalQuantity?: number;
          requiredQuantity?: number;
        }
      ];
    }
  ];
}
```

#### Возможные ошибки:
- `400` - Некорректный ID заказа
- `404` - Упаковки для заказа не найдены

---

### 1.3 Получение упаковки по ID
**GET** `/packaging/:id`

#### Path параметры:
- `id` (string) - ID упаковки

#### Пример запроса:
```
GET /packaging/456
```

#### Ответ:
```typescript
{
  id: number;
  orderId: number;
  packageCode: string;
  packageName: string;
  completionPercentage: number;
  order: {
    orderName: string;
    batchNumber: string;
    isCompleted?: boolean;
  };
  parts: [
    {
      partId: number;
      partCode: string;
      partName: string;
      quantity: number;
      status?: string;
      totalQuantity?: number;
      requiredQuantity?: number;
    }
  ];
}
```

#### Возможные ошибки:
- `400` - Некорректный ID упаковки
- `404` - Упаковка не найдена

---

## 2. Part Pallets Controller

### 2.1 Получение всех поддонов детали по ID детали
**GET** `/packaging/pallets/by-part/:partId`

#### Path параметры:
- `partId` (string) - ID детали

#### Query параметры:
```typescript
{
  page?: number;         // Номер страницы (по умолчанию: 1)
  limit?: number;        // Количество элементов на странице (по умолчанию: 10)
  palletName?: string;   // Фильтр по имени поддона
  onlyInCells?: boolean; // Показать только поддоны в ячейках
}
```

#### Пример запроса:
```
GET /packaging/pallets/by-part/789?page=1&limit=10&onlyInCells=true
```

#### Ответ:
```typescript
{
  partInfo: {
    partId: number;
    partCode: string;
    partName: string;
    status: string;
    totalQuantity: number;
    isSubassembly: boolean;
    readyForMainFlow: boolean;
    size: string;
    material: {
      materialId: number;
      materialName: string;
      article: string;
      unit: string;
    };
    route: {
      routeId: number;
      routeName: string;
    };
  };
  palletsCount: number;
  pallets: [
    {
      palletId: number;
      palletName: string;
      currentCell?: {
        cellId: number;
        cellCode: string;
        status: string;
        capacity: number;
        currentLoad: number;
        buffer: {
          bufferId: number;
          bufferName: string;
          location: string;
        };
      };
      placedAt?: Date;
      machineAssignments: [
        {
          assignmentId: number;
          machineId: number;
          machineName: string;
          assignedAt: Date;
          completedAt?: Date | null;
        }
      ];
      stageProgress: [
        {
          routeStageId: number;
          stageName: string;
          status: string;
          completedAt?: Date | null;
        }
      ];
    }
  ];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Возможные ошибки:
- `400` - Некорректный ID детали или ошибка при получении поддонов
- `404` - Деталь не найдена

---

### 2.2 Получение конкретного поддона детали
**GET** `/packaging/pallets/by-part/:partId/pallet/:palletId`

#### Path параметры:
- `partId` (string) - ID детали
- `palletId` (string) - ID поддона

#### Пример запроса:
```
GET /packaging/pallets/by-part/789/pallet/101
```

#### Ответ:
```typescript
{
  palletId: number;
  palletName: string;
  currentCell?: {
    cellId: number;
    cellCode: string;
    status: string;
    capacity: number;
    currentLoad: number;
    buffer: {
      bufferId: number;
      bufferName: string;
      location: string;
    };
  };
  placedAt?: Date;
  machineAssignments: [
    {
      assignmentId: number;
      machineId: number;
      machineName: string;
      assignedAt: Date;
      completedAt?: Date | null;
    }
  ];
  stageProgress: [
    {
      routeStageId: number;
      stageName: string;
      status: string;
      completedAt?: Date | null;
    }
  ];
}
```

#### Возможные ошибки:
- `400` - Некорректный ID детали или поддона
- `404` - Поддон не найден

---

### 2.3 Получение статистики по поддонам детали
**GET** `/packaging/pallets/statistics/:partId`

#### Path параметры:
- `partId` (string) - ID детали

#### Пример запроса:
```
GET /packaging/pallets/statistics/789
```

#### Ответ:
```typescript
// Структура ответа зависит от реализации сервиса
// Обычно содержит агрегированную информацию о поддонах
{
  partId: number;
  totalPallets: number;
  palletsInCells: number;
  palletsInProgress: number;
  completedPallets: number;
  // другие статистические данные
}
```

#### Возможные ошибки:
- `400` - Некорректный ID детали или ошибка при получении статистики
- `404` - Деталь не найдена

---

## 3. Package Parts Controller

### 3.1 Получение всех деталей упаковки по ID упаковки
**GET** `/packaging/parts/by-package/:packageId`

#### Path параметры:
- `packageId` (string) - ID упаковки

#### Query параметры:
```typescript
{
  packageId?: number;  // ID упаковки для фильтрации деталей
  status?: string;     // Фильтр по статусу детали (PENDING, IN_PROGRESS, COMPLETED)
  page?: number;       // Номер страницы (по умолчанию: 1)
  limit?: number;      // Количество элементов на странице (по умолчанию: 10)
}
```

#### Пример запроса:
```
GET /packaging/parts/by-package/456?status=IN_PROGRESS&page=1&limit=15
```

#### Ответ:
```typescript
{
  packageInfo: {
    packageId: number;
    packageCode: string;
    packageName: string;
    completionPercentage: number;
    order: {
      orderId: number;
      orderName: string;
      batchNumber: string;
    };
  };
  partsCount: number;
  parts: [
    {
      partId: number;
      partCode: string;
      partName: string;
      status: string;
      totalQuantity: number;
      requiredQuantity: number;
      isSubassembly: boolean;
      readyForMainFlow: boolean;
      size: string;
      material: {
        materialId: number;
        materialName: string;
        article: string;
        unit: string;
      };
      route: {
        routeId: number;
        routeName: string;
      };
      pallets?: [
        {
          palletId: number;
          palletName: string;
        }
      ];
      routeProgress?: [
        {
          routeStageId: number;
          stageName: string;
          status: string;
          completedAt?: Date | null;
        }
      ];
    }
  ];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Возможные ошибки:
- `400` - Некорректный ID упаковки или ошибка при получении деталей
- `404` - Упаковка не найдена

---

### 3.2 Получение конкретной детали из упаковки
**GET** `/packaging/parts/by-package/:packageId/part/:partId`

#### Path параметры:
- `packageId` (string) - ID упаковки
- `partId` (string) - ID детали

#### Пример запроса:
```
GET /packaging/parts/by-package/456/part/789
```

#### Ответ:
```typescript
{
  partId: number;
  partCode: string;
  partName: string;
  status: string;
  totalQuantity: number;
  requiredQuantity: number;
  isSubassembly: boolean;
  readyForMainFlow: boolean;
  size: string;
  material: {
    materialId: number;
    materialName: string;
    article: string;
    unit: string;
  };
  route: {
    routeId: number;
    routeName: string;
  };
  pallets?: [
    {
      palletId: number;
      palletName: string;
    }
  ];
  routeProgress?: [
    {
      routeStageId: number;
      stageName: string;
      status: string;
      completedAt?: Date | null;
    }
  ];
}
```

#### Возможные ошибки:
- `400` - Некорректный ID упаковки или детали
- `404` - Деталь в упаковке не найдена

---

### 3.3 Получение статистики по деталям упаковки
**GET** `/packaging/parts/statistics/:packageId`

#### Path параметры:
- `packageId` (string) - ID упаковки

#### Пример запроса:
```
GET /packaging/parts/statistics/456
```

#### Ответ:
```typescript
// Структура ответа зависит от реализации сервиса
// Обычно содержит агрегированную информацию о деталях упаковки
{
  packageId: number;
  totalParts: number;
  completedParts: number;
  inProgressParts: number;
  pendingParts: number;
  completionPercentage: number;
  // другие ��татистические данные
}
```

#### Возможные ошибки:
- `400` - Некорректный ID упаковки или ошибка при получении статистики
- `404` - Упаковка не найдена

---

## Общие коды ошибок

- `400 Bad Request` - Некорректные параметры запроса
- `404 Not Found` - Ресурс не найден
- `500 Internal Server Error` - Внутренняя ошибка сервера

## Примечания

1. Все ID должны быть положительными числами
2. Параметры пагинации `page` и `limit` должны быть больше 0
3. Даты возвращаются в формате ISO 8601
4. Все строковые поля могут содержать null или undefined, если не указано иное
5. Поля со знаком `?` являются опциональными