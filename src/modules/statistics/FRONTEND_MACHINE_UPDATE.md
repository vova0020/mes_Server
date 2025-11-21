# 🔧 ОБНОВЛЕНИЕ API СТАТИСТИКИ СТАНКОВ - Инструкция для фронтенда

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

API статистики по станкам был изменен. Теперь каждый станок возвращает данные в своих собственных единицах измерения.

---

## 📊 Что изменилось

### 1. Параметр `unit` больше НЕ передается для станков

#### ДО:
```typescript
// ❌ СТАРЫЙ ЗАПРОС
GET /statistics/stage?lineId=1&stageId=2&dateRangeType=DAY&date=2024-01-15&unit=PIECES
```

#### ПОСЛЕ:
```typescript
// ✅ НОВЫЙ ЗАПРОС (без параметра unit)
GET /statistics/stage?lineId=1&stageId=2&dateRangeType=DAY&date=2024-01-15
```

### 2. Тип поля `unit` изменен

#### ДО:
```typescript
interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;
  unit: 'PIECES' | 'SQUARE_METERS';  // ❌ Только 2 варианта
  dataPoints: DataPoint[];
}
```

#### ПОСЛЕ:
```typescript
interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;
  unit: string;  // ✅ Любая единица измерения станка (шт, кг, м², м и т.д.)
  dataPoints: DataPoint[];
}
```

---

## 🔧 Что нужно изменить на фронтенде

### 1. Обновить TypeScript интерфейс

```typescript
// types/statistics.ts

export interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;
  unit: string;  // ИЗМЕНЕНО: было 'PIECES' | 'SQUARE_METERS'
  dataPoints: DataPoint[];
}
```

### 2. Убрать параметр `unit` из запросов к станкам

```typescript
// ❌ СТАРЫЙ КОД
async function loadStageStats(
  lineId: number,
  stageId: number,
  dateRangeType: DateRangeType,
  date?: string,
  unit: UnitOfMeasurement = UnitOfMeasurement.PIECES  // ❌ Убрать
) {
  const params = new URLSearchParams({
    lineId: lineId.toString(),
    stageId: stageId.toString(),
    dateRangeType,
    unit  // ❌ Убрать
  });
  
  if (date) params.append('date', date);
  
  const response = await fetch(`/statistics/stage?${params}`);
  return await response.json();
}

// ✅ НОВЫЙ КОД
async function loadStageStats(
  lineId: number,
  stageId: number,
  dateRangeType: DateRangeType,
  date?: string
) {
  const params = new URLSearchParams({
    lineId: lineId.toString(),
    stageId: stageId.toString(),
    dateRangeType
  });
  
  if (date) params.append('date', date);
  
  const response = await fetch(`/statistics/stage?${params}`);
  return await response.json();
}
```

### 3. Обновить отображение единиц измерения

```typescript
// ❌ СТАРЫЙ КОД
function displayMachineStats(machine: MachineStats) {
  const unitLabel = machine.unit === 'PIECES' ? 'шт.' : 'м²';
  return `${machine.machineName}: ${machine.totalValue} ${unitLabel}`;
}

// ✅ НОВЫЙ КОД
function displayMachineStats(machine: MachineStats) {
  // Единица измерения приходит напрямую от станка
  return `${machine.machineName}: ${machine.totalValue} ${machine.unit}`;
}
```

---

## 📋 Примеры ответов API

### GET /statistics/stage (обычные станки)

```json
[
  {
    "machineId": 1,
    "machineName": "Раскроечный станок",
    "totalValue": 1500,
    "unit": "шт",
    "dataPoints": [
      { "date": "2024-01-13", "value": 500 },
      { "date": "2024-01-14", "value": 600 },
      { "date": "2024-01-15", "value": 400 }
    ]
  },
  {
    "machineId": 2,
    "machineName": "Кромкооблицовочный станок",
    "totalValue": 250.5,
    "unit": "м",
    "dataPoints": [
      { "date": "2024-01-13", "value": 80.5 },
      { "date": "2024-01-14", "value": 90.0 },
      { "date": "2024-01-15", "value": 80.0 }
    ]
  }
]
```

### GET /statistics/stage (станки упаковки)

```json
[
  {
    "machineId": 10,
    "machineName": "Упаковочная линия 1",
    "totalValue": 45,
    "unit": "упак",
    "dataPoints": [
      { "date": "2024-01-13", "value": 15 },
      { "date": "2024-01-14", "value": 18 },
      { "date": "2024-01-15", "value": 12 }
    ]
  }
]
```

---

## 📈 Пример использования с диаграммами

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

function MachineStatsChart({ machines }: { machines: MachineStats[] }) {
  return (
    <div>
      {machines.map(machine => (
        <div key={machine.machineId}>
          <h3>{machine.machineName}</h3>
          <p>Всего: {machine.totalValue} {machine.unit}</p>
          
          <LineChart width={600} height={300} data={machine.dataPoints}>
            <XAxis dataKey="date" />
            <YAxis label={{ value: machine.unit, angle: -90 }} />
            <Tooltip 
              formatter={(value) => [`${value} ${machine.unit}`, machine.machineName]}
            />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Чеклист миграции

- [ ] Обновить интерфейс `MachineStats` (`unit: string`)
- [ ] Убрать параметр `unit` из всех запросов к `/statistics/stage`
- [ ] Убрать enum `UnitOfMeasurement` из запросов станков (оставить только для этапов)
- [ ] Обновить отображение единиц измерения (использовать `machine.unit` напрямую)
- [ ] Обновить подписи осей на диаграммах (использовать `machine.unit`)
- [ ] Протестировать с разными типами станков

---

## 🎯 Преимущества изменений

1. **Гибкость** - каждый станок может иметь свою единицу измерения
2. **Точность** - данные не пересчитываются, используются оригинальные значения
3. **Простота** - не нужно выбирать единицу измерения для станков
4. **Универсальность** - поддержка любых единиц (шт, кг, м, м², упак и т.д.)

---

## 📌 Важно

- **Для этапов потока** (`/statistics/production-line`) параметр `unit` **ОСТАЕТСЯ** и работает как прежде
- **Для станков** (`/statistics/stage`) параметр `unit` **УДАЛЕН**, единица измерения приходит от станка

---

## 📞 Вопросы?

Если возникли вопросы по миграции, обратитесь к бэкенд-команде.
