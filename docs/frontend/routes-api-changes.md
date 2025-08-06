# Изменения API маршрутов - Документация для фронтенда

## Обзор изменений

В API маршрутов внесены изменения для поддержки связи маршрутов с производственными линиями. Теперь маршруты могут быть привязаны к конкретной производственной линии через поле `lineId`.

## Изменения в существующих методах

### 1. Получение всех маршрутов
**Endpoint:** `GET /settings/routes`

**Изменения в ответе:**
```typescript
interface Route {
  routeId: number;
  routeName: string;
  lineId?: number;  // НОВОЕ ПОЛЕ
  productionLine?: {          // НОВОЕ ПОЛЕ
    lineId: number;
    lineName: string;
    lineType: string;
  };
  routeStages: RouteStage[];
  _count: {
    parts: number;
  };
}
```

### 2. Получение маршрута по ID
**Endpoint:** `GET /settings/routes/:id`

**Изменения в ответе:**
```typescript
interface RouteDetails {
  routeId: number;
  routeName: string;
  lineId?: number;  // НОВОЕ ПОЛЕ
  productionLine?: {          // НОВОЕ ПОЛЕ
    lineId: number;
    lineName: string;
    lineType: string;
  };
  routeStages: RouteStage[];
  parts: {
    partId: number;
    partName: string;
    partCode: string;
  }[];
}
```

### 3. Создание маршрута
**Endpoint:** `POST /settings/routes`

**Изменения в теле запроса:**
```typescript
interface CreateRouteDto {
  routeName: string;
  lineId?: number;  // НОВОЕ ПОЛЕ - ID производственной линии (опционально)
  stages?: CreateRouteStageDto[];
}
```

**Пример запроса:**
```json
{
  "routeName": "Маршрут сборки корпуса",
  "lineId": 1,
  "stages": [
    {
      "stageId": 1,
      "substageId": 2,
      "sequenceNumber": 1
    }
  ]
}
```

### 4. Обновление маршрута
**Endpoint:** `PUT /settings/routes/:id`

**Изменения в теле запроса:**
```typescript
interface UpdateRouteDto {
  routeName?: string;  // Теперь опционально
  lineId?: number;     // НОВОЕ ПОЛЕ - ID производственной линии (опционально)
}
```

**Пример запроса:**
```json
{
  "routeName": "Обновленное название маршрута",
  "lineId": 2
}
```

**Примечания:**
- Если `lineId` не указан, маршрут останется без привязки к производственной линии
- Если `lineId = null`, маршрут будет отвязан от производственной линии
- При указании `lineId` система проверит существование производственной линии

## Удаленные методы

Следующие методы были **УДАЛЕНЫ** из API:

### ❌ Получение доступных этапов уровня 1
~~`GET /settings/routes/available-stages/level1`~~

### ❌ Получение доступных этапов уровня 2
~~`GET /settings/routes/available-stages/level2/:stageId`~~

### ❌ Получение этапов по ID потока
~~`GET /settings/routes/flow/:flowId/stages`~~

## Новые методы

### ✅ Получение списка всех производственных линий
**Endpoint:** `GET /settings/routes/production-lines`

**Описание:** Получает список всех доступных производственных линий дл�� привязки к маршрутам.

**Ответ:**
```typescript
interface ProductionLine {
  lineId: number;
  lineName: string;
  lineType: string;
  _count: {
    routes: number;  // Количество маршрутов в линии
  };
  routes: {
    routeId: number;
    routeName: string;
  }[];
  isOccupied: boolean;  // Занята ли линия (есть ли связанные маршруты)
  routesCount: number;  // Количество маршрутов
}

type ProductionLinesResponse = ProductionLine[];
```

**Пример ответа:**
```json
[
  {
    "lineId": 1,
    "lineName": "Основная линия сборки",
    "lineType": "автоматическая",
    "_count": {
      "routes": 5
    },
    "routes": [
      {
        "routeId": 1,
        "routeName": "Маршрут сборки корпуса"
      }
    ],
    "isOccupied": true,
    "routesCount": 5
  },
  {
    "lineId": 2,
    "lineName": "Линия покраски",
    "lineType": "ручная",
    "_count": {
      "routes": 3
    },
    "routes": [
      {
        "routeId": 2,
        "routeName": "Маршрут покраски"
      }
    ],
    "isOccupied": true,
    "routesCount": 3
  }
]
```

### ✅ Получение этапов по ID производственной линии
**Endpoint:** `GET /settings/routes/line/:lineId/stages`

**Описание:** Получает все связанные этапы 1 и 2 уровня для указанной производственной линии.

**Параметры:**
- `lineId` (number) - ID производственной линии

**Ответ:**
```typescript
interface LineStagesResponse {
  productionLine: {
    lineId: number;
    lineName: string;
    lineType: string;
  };
  stagesLevel1: {
    stageId: number;
    stageName: string;
    description?: string;
    finalStage: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  stagesLevel2: {
    substageId: number;
    stageId: number;
    substageName: string;
    description?: string;
    allowance: number;
  }[];
  routesCount: number;  // Количество маршрутов в линии
}
```

**Пример ответа:**
```json
{
  "productionLine": {
    "lineId": 1,
    "lineName": "Основная линия сборки",
    "lineType": "автоматическая"
  },
  "stagesLevel1": [
    {
      "stageId": 1,
      "stageName": "Сборка",
      "description": "Этап сборки изделия",
      "finalStage": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "stagesLevel2": [
    {
      "substageId": 1,
      "stageId": 1,
      "substageName": "Предварительная сборка",
      "description": "Подготовительные операции",
      "allowance": 0.1
    }
  ],
  "routesCount": 3
}
```

**Коды ошибок:**
- `404` - Производственная линия не найдена

## Миграция фронтенда

### 1. Обновление интерфейсов TypeScript

```typescript
// Обновите интерфейс маршрута
interface Route {
  routeId: number;
  routeName: string;
  lineId?: number;     // Изменено с flowId
  productionLine?: ProductionLine;         // Изменено с flow
  routeStages: RouteStage[];
  _count: {
    parts: number;
  };
}

// Добавьте ин��ерфейс производственной линии
interface ProductionLine {
  lineId: number;
  lineName: string;
  lineType: string;
}

// Обновите DTO для создания маршрута
interface CreateRouteRequest {
  routeName: string;
  lineId?: number;     // Изменено с flowId
  stages?: CreateRouteStageDto[];
}

// Обновите DTO для обновления маршрута
interface UpdateRouteRequest {
  routeName?: string;  // Сделать опциональным
  lineId?: number;     // Изменено с flowId
}
```

### 2. Замена удаленных методов

**Вместо:**
```typescript
// ❌ Старый код
const stagesLevel1 = await api.get('/settings/routes/available-stages/level1');
const stagesLevel2 = await api.get(`/settings/routes/available-stages/level2/${stageId}`);
const flowStages = await api.get(`/settings/routes/flow/${flowId}/stages`);
```

**Используйте:**
```typescript
// ✅ Новый код
const lineStages = await api.get(`/settings/routes/line/${lineId}/stages`);
const stagesLevel1 = lineStages.stagesLevel1;
const stagesLevel2 = lineStages.stagesLevel2;
```

### 3. Обновление форм создания/редактирования маршрутов

```typescript
// Добавьте поле выбора производственной линии в формы
interface RouteFormData {
  routeName: string;
  lineId?: number;  // Изменено с flowId
  stages?: RouteStageFormData[];
}

// Пример компонента формы (React)
const RouteForm = () => {
  const [formData, setFormData] = useState<RouteFormData>({
    routeName: '',
    lineId: undefined,
    stages: []
  });

  return (
    <form>
      <input 
        type="text" 
        value={formData.routeName}
        onChange={(e) => setFormData({...formData, routeName: e.target.value})}
        placeholder="Название маршрута"
      />
      
      {/* Новое поле для выбора производственной линии */}
      <select 
        value={formData.lineId || ''}
        onChange={(e) => setFormData({...formData, lineId: e.target.value ? Number(e.target.value) : undefined})}
      >
        <option value="">Без производственной линии</option>
        {productionLines.map(line => (
          <option key={line.lineId} value={line.lineId}>
            {line.lineName} ({line.lineType})
          </option>
        ))}
      </select>
      
      {/* Остальные поля формы */}
    </form>
  );
};
```

### 4. Обновление отображения маршрутов

```typescript
// Добавьте отображение информации о производственной линии
const RouteCard = ({ route }: { route: Route }) => {
  return (
    <div className="route-card">
      <h3>{route.routeName}</h3>
      
      {/* Новое отображение производственной линии */}
      {route.productionLine && (
        <div className="route-line">
          <span className="line-label">Производственная линия:</span>
          <span className="line-name">{route.productionLine.lineName}</span>
          <span className="line-type">({route.productionLine.lineType})</span>
        </div>
      )}
      
      <div className="route-stages-count">
        Этапов: {route.routeStages.length}
      </div>
      
      <div className="route-parts-count">
        Деталей: {route._count.parts}
      </div>
    </div>
  );
};
```

## Примеры использования

### Получение списка производственных линий
```typescript
const getProductionLines = async () => {
  try {
    const response = await api.get('/settings/routes/production-lines');
    
    console.log('Доступные производственные линии:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка получения производственных линий:', error);
  }
};

// Использование в компоненте
const ProductionLineSelector = () => {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  
  useEffect(() => {
    getProductionLines().then(setProductionLines);
  }, []);
  
  return (
    <select>
      <option value="">Выберите производственную линию</option>
      {productionLines.map(line => (
        <option key={line.lineId} value={line.lineId}>
          {line.lineName} - {line.lineType} ({line.routesCount} маршрутов)
        </option>
      ))}
    </select>
  );
};
```

### Создание маршрута с привязкой к производственной линии
```typescript
const createRoute = async (routeData: CreateRouteRequest) => {
  try {
    const response = await api.post('/settings/routes', {
      routeName: "Новый маршрут",
      lineId: 1,  // Привязываем к производственной линии с ID 1
      stages: [
        {
          stageId: 1,
          substageId: 2,
          sequenceNumber: 1
        }
      ]
    });
    
    console.log('Маршрут создан:', response.data);
  } catch (error) {
    console.error('Ошибка создания маршрута:', error);
  }
};
```

### Получение этапов для производственной линии
```typescript
const getLineStages = async (lineId: number) => {
  try {
    const response = await api.get(`/settings/routes/line/${lineId}/stages`);
    
    console.log('Производственная линия:', response.data.productionLine);
    console.log('Этапы уровня 1:', response.data.stagesLevel1);
    console.log('Этапы уровня 2:', response.data.stagesLevel2);
    console.log('Количество маршрутов:', response.data.routesCount);
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Производственная линия не найдена');
    } else {
      console.error('Ошибка получения этапов производственной линии:', error);
    }
  }
};
```

### Обновление маршрута с изменением производственной линии
```typescript
const updateRoute = async (routeId: number, updates: UpdateRouteRequest) => {
  try {
    const response = await api.put(`/settings/routes/${routeId}`, {
      routeName: "Обновленное название",
      lineId: 2  // Переносим на другую производственную линию
    });
    
    console.log('Маршрут обновлен:', response.data);
  } catch (error) {
    console.error('Ошибк�� обновления маршрута:', error);
  }
};
```

## Обработка ошибок

### Новые ошибки валидации
При работе с производственными линиями могут возникнуть дополнительные ошибки:

```typescript
// Обработка ошибок при создании/обновлении маршрута
try {
  await createRoute(routeData);
} catch (error) {
  if (error.response?.status === 404 && error.response?.data?.message?.includes('Производственная линия')) {
    // Указанная производственная линия не найдена
    showError('Выбранная производственная линия не существует');
  } else if (error.response?.status === 400) {
    // Ошибки валидации
    showError('Проверьте корректность данных');
  }
}
```

## Рекомендации по внедрению

1. **Поэтапное внедрение:** Сначала обновите интерфейсы и добавьте поддержку новых полей, затем замените использование удаленных методов.

2. **Обратная совместимость:** Поле `lineId` опционально, поэтому существующие маршруты без привязки к производственной линии продолжат работать.

3. **Кэширование:** Рассмотрите кэширование результатов метода `getLineStages`, так как этапы производственной линии изменяются редко.

4. **Валидация:** Добавьте клиентскую валидацию для проверки существования производственной линии перед отправкой запроса.

5. **UX улучшения:** При выборе производственной линии можно автоматически подгружать доступные этапы для этой линии.

## Архитектурные изменения

### Удаление концепции "потоков"
- Таблица `Flow` была удалена из базы данных
- Маршруты теперь напрямую связаны с производственными линиями через поле `lineId`
- Это устраняет дублирование функциональности, так как производственные линии уже имеют связь с этапами первого уровня

### Новая архитектура связей
```
ProductionLine (производственные линии)
    ↓ (один ко многим)
Route (маршруты)
    ↓ (один ко многим)  
RouteStage (этапы маршрута)
    ↓ (ссылается на)
ProductionStageLevel1 (этапы первого уровня)
```

## Контакты

При возникновении вопросов по интеграции обращайтесь к команде backend разработки.