# 🔄 ОБНОВЛЕНИЕ API СТАТИСТИКИ - Инструкция для фронтенда

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

API статистики был обновлен. Теперь все эндпоинты возвращают данные с разбивкой по датам для построения диаграмм.

---

## 📊 Новая структура ответов

### ДО (старая структура):
```typescript
interface StageStats {
  stageId: number;
  stageName: string;
  value: number;  // ❌ Только общее значение
  unit: 'PIECES' | 'SQUARE_METERS';
}
```

### ПОСЛЕ (новая структура):
```typescript
interface DataPoint {
  date: string;    // ISO формат: "2024-01-15"
  value: number;   // Значение за эту дату
}

interface StageStats {
  stageId: number;
  stageName: string;
  totalValue: number;  // ✅ Общее значение за весь период
  unit: 'PIECES' | 'SQUARE_METERS';
  dataPoints: DataPoint[];  // ✅ Данные по датам для диаграммы
}

interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;  // ✅ Общее значение за весь период
  unit: 'PIECES' | 'SQUARE_METERS';
  dataPoints: DataPoint[];  // ✅ Данные по датам для диаграммы
}
```

---

## 🔧 Что нужно изменить на фронтенде

### 1. Обновить TypeScript интерфейсы

```typescript
// types/statistics.ts

export interface DataPoint {
  date: string;    // ISO date string (YYYY-MM-DD)
  value: number;
}

export interface StageStats {
  stageId: number;
  stageName: string;
  totalValue: number;        // ИЗМЕНЕНО: было "value"
  unit: 'PIECES' | 'SQUARE_METERS';
  dataPoints: DataPoint[];   // ДОБАВЛЕНО
}

export interface MachineStats {
  machineId: number;
  machineName: string;
  totalValue: number;        // ИЗМЕНЕНО: было "value"
  unit: 'PIECES' | 'SQUARE_METERS';
  dataPoints: DataPoint[];   // ДОБАВЛЕНО
}
```

### 2. Обновить код обработки ответов

#### Для этапов потока:

```typescript
// ❌ СТАРЫЙ КОД
const response = await fetch('/statistics/production-line?...');
const stages: StageStats[] = await response.json();

stages.forEach(stage => {
  console.log(`${stage.stageName}: ${stage.value}`);  // ❌ Больше не работает
});

// ✅ НОВЫЙ КОД
const response = await fetch('/statistics/production-line?...');
const stages: StageStats[] = await response.json();

stages.forEach(stage => {
  console.log(`${stage.stageName}: ${stage.totalValue}`);  // ✅ Используем totalValue
  
  // Теперь доступны данные по датам для диаграммы
  stage.dataPoints.forEach(point => {
    console.log(`  ${point.date}: ${point.value}`);
  });
});
```

#### Для станков этапа:

```typescript
// ❌ СТАРЫЙ КОД
const response = await fetch('/statistics/stage?...');
const machines: MachineStats[] = await response.json();

machines.forEach(machine => {
  console.log(`${machine.machineName}: ${machine.value}`);  // ❌ Больше не работает
});

// ✅ НОВЫЙ КОД
const response = await fetch('/statistics/stage?...');
const machines: MachineStats[] = await response.json();

machines.forEach(machine => {
  console.log(`${machine.machineName}: ${machine.totalValue}`);  // ✅ Используем totalValue
  
  // Теперь доступны данные по датам для диаграммы
  machine.dataPoints.forEach(point => {
    console.log(`  ${point.date}: ${point.value}`);
  });
});
```

---

## 📈 Примеры построения диаграмм

### Пример с Chart.js

```typescript
import { Chart } from 'chart.js';

async function renderStageChart(lineId: number, dateRangeType: string, date: string) {
  const response = await fetch(
    `/statistics/production-line?lineId=${lineId}&dateRangeType=${dateRangeType}&date=${date}&unit=PIECES`
  );
  const stages: StageStats[] = await response.json();

  // Выбираем первый этап для примера
  const stage = stages[0];

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: stage.dataPoints.map(p => p.date),  // Даты для оси X
      datasets: [{
        label: stage.stageName,
        data: stage.dataPoints.map(p => p.value),  // Значения для оси Y
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${stage.stageName} - Всего: ${stage.totalValue} шт.`
        }
      }
    }
  });
}
```

### Пример с Recharts (React)

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function StageChart({ stageStats }: { stageStats: StageStats }) {
  return (
    <div>
      <h3>{stageStats.stageName}</h3>
      <p>Всего: {stageStats.totalValue} {stageStats.unit === 'PIECES' ? 'шт.' : 'м²'}</p>
      
      <LineChart width={600} height={300} data={stageStats.dataPoints}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </div>
  );
}
```

### Пример с ApexCharts

```typescript
import ApexCharts from 'apexcharts';

function renderApexChart(stageStats: StageStats) {
  const options = {
    chart: {
      type: 'line',
      height: 350
    },
    series: [{
      name: stageStats.stageName,
      data: stageStats.dataPoints.map(p => p.value)
    }],
    xaxis: {
      categories: stageStats.dataPoints.map(p => p.date)
    },
    title: {
      text: `${stageStats.stageName} - Всего: ${stageStats.totalValue}`
    }
  };

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
}
```

---

## 📋 Пример полного ответа API

### GET /statistics/production-line

```json
[
  {
    "stageId": 1,
    "stageName": "Раскрой",
    "totalValue": 4500,
    "unit": "PIECES",
    "dataPoints": [
      { "date": "2024-01-13", "value": 1200 },
      { "date": "2024-01-14", "value": 1800 },
      { "date": "2024-01-15", "value": 1500 }
    ]
  },
  {
    "stageId": 2,
    "stageName": "Кромление",
    "totalValue": 3600,
    "unit": "PIECES",
    "dataPoints": [
      { "date": "2024-01-13", "value": 1000 },
      { "date": "2024-01-14", "value": 1400 },
      { "date": "2024-01-15", "value": 1200 }
    ]
  }
]
```

### GET /statistics/stage

```json
[
  {
    "machineId": 5,
    "machineName": "Кромкооблицовочный станок 1",
    "totalValue": 1800,
    "unit": "PIECES",
    "dataPoints": [
      { "date": "2024-01-13", "value": 500 },
      { "date": "2024-01-14", "value": 700 },
      { "date": "2024-01-15", "value": 600 }
    ]
  },
  {
    "machineId": 6,
    "machineName": "Кромкооблицовочный станок 2",
    "totalValue": 1800,
    "unit": "PIECES",
    "dataPoints": [
      { "date": "2024-01-13", "value": 500 },
      { "date": "2024-01-14", "value": 700 },
      { "date": "2024-01-15", "value": 600 }
    ]
  }
]
```

---

## ✅ Чеклист миграции

- [ ] Обновить TypeScript интерфейсы (`value` → `totalValue`, добавить `dataPoints`)
- [ ] Заменить все обращения к `stage.value` на `stage.totalValue`
- [ ] Заменить все обращения к `machine.value` на `machine.totalValue`
- [ ] Реализовать отображение диаграмм используя `dataPoints`
- [ ] Протестировать все периоды: DAY, WEEK, MONTH, YEAR, CUSTOM
- [ ] Протестировать обе единицы измерения: PIECES и SQUARE_METERS

---

## 🎯 Преимущества новой структуры

1. **Детализация по датам** - можно строить графики изменения производительности
2. **Гибкость** - можно показывать как общее значение, так и динамику
3. **Совместимость** - легко интегрируется с любой библиотекой диаграмм
4. **Аналитика** - можно выявлять тренды и аномалии в производстве

---

## 📞 Вопросы?

Если возникли вопросы по миграции, обратитесь к бэкенд-команде.
