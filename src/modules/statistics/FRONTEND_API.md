# API Статистики производства - Документация для фронтенда

## Базовый URL
```
/statistics
```

---

## 1. Получить список производственных потоков

### Endpoint
```
GET /statistics/production-lines
```

### Параметры
Нет параметров

### Ответ
```typescript
interface ProductionLine {
  lineId: number;
  lineName: string;
  lineType: string;
}

// Response: ProductionLine[]
```

### Пример запроса
```javascript
const response = await fetch('/statistics/production-lines');
const lines = await response.json();
```

### Пример ответа
```json
[
  {
    "lineId": 1,
    "lineName": "Линия раскроя",
    "lineType": "автоматическая"
  },
  {
    "lineId": 2,
    "lineName": "Линия кромления",
    "lineType": "полуавтоматическая"
  }
]
```

---

## 2. Получить статистику по этапам потока

### Endpoint
```
GET /statistics/production-line
```

### Query параметры

| Параметр | Тип | Обязательный | Описание | Возможные значения |
|----------|-----|--------------|----------|-------------------|
| `lineId` | number | ✅ Да | ID производственного потока | Любое число |
| `dateRangeType` | string | ✅ Да | Тип периода | `DAY`, `WEEK`, `MONTH`, `YEAR`, `CUSTOM` |
| `date` | string | ⚠️ Для DAY/WEEK/MONTH/YEAR | Дата для расчета (ISO формат) | `2024-01-15` |
| `startDate` | string | ⚠️ Для CUSTOM | Начало диапазона (ISO формат) | `2024-01-01` |
| `endDate` | string | ⚠️ Для CUSTOM | Конец диапазона (ISO формат) | `2024-01-31` |
| `unit` | string | ❌ Нет (по умолчанию PIECES) | Единица измерения | `PIECES`, `SQUARE_METERS` |

### Ответ
```typescript
interface StageStats {
  stageId: number;
  stageName: string;
  value: number;
  unit: 'PIECES' | 'SQUARE_METERS';
}

// Response: StageStats[]
```

### Примеры запросов

#### День (с текущей датой)
```javascript
const params = new URLSearchParams({
  lineId: '1',
  dateRangeType: 'DAY',
  date: '2024-01-15',
  unit: 'PIECES'
});

const response = await fetch(`/statistics/production-line?${params}`);
const stats = await response.json();
```

#### Неделя
```javascript
const params = new URLSearchParams({
  lineId: '1',
  dateRangeType: 'WEEK',
  date: '2024-01-15',
  unit: 'SQUARE_METERS'
});
```

#### Месяц
```javascript
const params = new URLSearchParams({
  lineId: '1',
  dateRangeType: 'MONTH',
  date: '2024-01-15',
  unit: 'PIECES'
});
```

#### Год
```javascript
const params = new URLSearchParams({
  lineId: '1',
  dateRangeType: 'YEAR',
  date: '2024-01-15',
  unit: 'PIECES'
});
```

#### Произвольный диапазон
```javascript
const params = new URLSearchParams({
  lineId: '1',
  dateRangeType: 'CUSTOM',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  unit: 'PIECES'
});
```

### Пример ответа
```json
[
  {
    "stageId": 1,
    "stageName": "Раскрой",
    "value": 1500,
    "unit": "PIECES"
  },
  {
    "stageId": 2,
    "stageName": "Кромление",
    "value": 1200,
    "unit": "PIECES"
  },
  {
    "stageId": 3,
    "stageName": "Присадка",
    "value": 1100,
    "unit": "PIECES"
  },
  {
    "stageId": 4,
    "stageName": "Упаковка",
    "value": 1000,
    "unit": "PIECES"
  }
]
```

---

## 3. Получить статистику по станкам этапа

### Endpoint
```
GET /statistics/stage
```

### Query параметры

| Параметр | Тип | Обязательный | Описание | Возможные значения |
|----------|-----|--------------|----------|-------------------|
| `lineId` | number | ✅ Да | ID производственного потока | Любое число |
| `stageId` | number | ✅ Да | ID этапа | Любое число |
| `dateRangeType` | string | ✅ Да | Тип периода | `DAY`, `WEEK`, `MONTH`, `YEAR`, `CUSTOM` |
| `date` | string | ⚠️ Для DAY/WEEK/MONTH/YEAR | Дата для расчета (ISO формат) | `2024-01-15` |
| `startDate` | string | ⚠️ Для CUSTOM | Начало диапазона (ISO формат) | `2024-01-01` |
| `endDate` | string | ⚠️ Для CUSTOM | Конец диапазона (ISO формат) | `2024-01-31` |
| `unit` | string | ❌ Нет (по умолчанию PIECES) | Единица измерения | `PIECES`, `SQUARE_METERS` |

### Ответ
```typescript
interface MachineStats {
  machineId: number;
  machineName: string;
  value: number;
  unit: 'PIECES' | 'SQUARE_METERS';
}

// Response: MachineStats[]
```

### Пример запроса
```javascript
const params = new URLSearchParams({
  lineId: '1',
  stageId: '2',
  dateRangeType: 'DAY',
  date: '2024-01-15',
  unit: 'PIECES'
});

const response = await fetch(`/statistics/stage?${params}`);
const machineStats = await response.json();
```

### Пример ответа
```json
[
  {
    "machineId": 5,
    "machineName": "Кромкооблицовочный станок 1",
    "value": 600,
    "unit": "PIECES"
  },
  {
    "machineId": 6,
    "machineName": "Кромкооблицовочный станок 2",
    "value": 600,
    "unit": "PIECES"
  }
]
```

---

## Типы данных TypeScript

```typescript
// Единицы измерения
enum UnitOfMeasurement {
  PIECES = 'PIECES',              // Штуки
  SQUARE_METERS = 'SQUARE_METERS' // Квадратные метры
}

// Типы периодов
enum DateRangeType {
  DAY = 'DAY',       // День
  WEEK = 'WEEK',     // Неделя (последние 7 дней)
  MONTH = 'MONTH',   // Месяц (последние 30 дней)
  YEAR = 'YEAR',     // Год (последние 365 дней)
  CUSTOM = 'CUSTOM'  // Произвольный диапазон
}

// Производственная линия
interface ProductionLine {
  lineId: number;
  lineName: string;
  lineType: string;
}

// Статистика по этапу
interface StageStats {
  stageId: number;
  stageName: string;
  value: number;
  unit: UnitOfMeasurement;
}

// Статистика по станку
interface MachineStats {
  machineId: number;
  machineName: string;
  value: number;
  unit: UnitOfMeasurement;
}
```

---

## Пример полного флоу на фронтенде

```typescript
// 1. Загрузка списка потоков при инициализации
async function loadProductionLines() {
  const response = await fetch('/statistics/production-lines');
  const lines: ProductionLine[] = await response.json();
  return lines;
}

// 2. Загрузка статистики по этапам выбранного потока
async function loadLineStats(
  lineId: number,
  dateRangeType: DateRangeType,
  date?: string,
  startDate?: string,
  endDate?: string,
  unit: UnitOfMeasurement = UnitOfMeasurement.PIECES
) {
  const params = new URLSearchParams({
    lineId: lineId.toString(),
    dateRangeType,
    unit
  });

  if (dateRangeType === DateRangeType.CUSTOM) {
    params.append('startDate', startDate!);
    params.append('endDate', endDate!);
  } else if (date) {
    params.append('date', date);
  }

  const response = await fetch(`/statistics/production-line?${params}`);
  const stats: StageStats[] = await response.json();
  return stats;
}

// 3. Загрузка статистики по станкам выбранного этапа
async function loadStageStats(
  lineId: number,
  stageId: number,
  dateRangeType: DateRangeType,
  date?: string,
  startDate?: string,
  endDate?: string,
  unit: UnitOfMeasurement = UnitOfMeasurement.PIECES
) {
  const params = new URLSearchParams({
    lineId: lineId.toString(),
    stageId: stageId.toString(),
    dateRangeType,
    unit
  });

  if (dateRangeType === DateRangeType.CUSTOM) {
    params.append('startDate', startDate!);
    params.append('endDate', endDate!);
  } else if (date) {
    params.append('date', date);
  }

  const response = await fetch(`/statistics/stage?${params}`);
  const stats: MachineStats[] = await response.json();
  return stats;
}

// Пример использования
async function example() {
  // Шаг 1: Получить список потоков
  const lines = await loadProductionLines();
  console.log('Доступные потоки:', lines);

  // Шаг 2: Выбрать поток и получить статистику по этапам
  const selectedLineId = lines[0].lineId;
  const stageStats = await loadLineStats(
    selectedLineId,
    DateRangeType.DAY,
    '2024-01-15',
    undefined,
    undefined,
    UnitOfMeasurement.PIECES
  );
  console.log('Статистика по этапам:', stageStats);

  // Шаг 3: Выбрать этап и получить статистику по станкам
  const selectedStageId = stageStats[0].stageId;
  const machineStats = await loadStageStats(
    selectedLineId,
    selectedStageId,
    DateRangeType.DAY,
    '2024-01-15',
    undefined,
    undefined,
    UnitOfMeasurement.PIECES
  );
  console.log('Статистика по станкам:', machineStats);
}
```

---

## Логика расчета периодов

- **DAY**: От 00:00:00 до 23:59:59 указанной даты
- **WEEK**: Последние 7 дней от указанной даты (включительно)
- **MONTH**: Последние 30 дней от указанной даты (включительно)
- **YEAR**: Последние 365 дней от указанной даты (включительно)
- **CUSTOM**: Точный диапазон от `startDate` 00:00:00 до `endDate` 23:59:59

---

## Расчет квадратных метров

Для единицы измерения `SQUARE_METERS` используется формула:
```
площадь = (finishedLength * finishedWidth) / 1000000
```
где `finishedLength` и `finishedWidth` в миллиметрах.

---

## Обработка ошибок

Все эндпоинты возвращают стандартные HTTP коды:
- `200` - Успешный запрос
- `400` - Неверные параметры запроса
- `404` - Поток/этап не найден
- `500` - Внутренняя ошибка сервера

Пример обработки:
```typescript
try {
  const response = await fetch('/statistics/production-line?...');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Ошибка загрузки статистики:', error);
  // Показать уведомление пользователю
}
```
