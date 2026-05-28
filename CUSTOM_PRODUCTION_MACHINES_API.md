# API для мастера индивидуального производства - Станки

## Обзор

Создан новый модуль для работы со станками индивидуального производства, аналогичный серийному производству.

**Ключевые отличия от серийного производства:**
- Фильтрация станков по типу производства (`CUSTOM` или `BOTH`)
- Отдельный эндпоинт для индивидуального производства
- Возвращает `productionType` в ответе

---

## Эндпоинты

### 1. Получить станки участка (индивидуальное производство)

**Метод:** `GET`  
**URL:** `/custom/master/machines/by-segment`

**Query параметры:**
```typescript
{
  stageId: number; // ID производственного участка (обязательно)
}
```

**Пример запроса:**
```bash
GET http://localhost:5000/custom/master/machines/by-segment?stageId=1
```

**Ответ:**
```typescript
interface CustomMachineSegmentResponse {
  id: number;                    // ID станка
  name: string;                  // Название станка
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';
  load_unit: string;             // Единица измерения (м², м³, м, м кромки, шт)
  noSmenTask: boolean;           // Флаг запрета сменных задач
  recommendedLoad: number;       // Рекомендуемая загрузка
  plannedQuantity: number;       // Запланированное количество
  completedQuantity: number;     // Выполненное количество
  productionType: 'SERIAL' | 'CUSTOM' | 'BOTH'; // Тип производства
}
```

**Пример ответа:**
```json
[
  {
    "id": 18,
    "name": "Большая пила",
    "status": "ACTIVE",
    "load_unit": "м²",
    "noSmenTask": true,
    "recommendedLoad": 900,
    "plannedQuantity": 150,
    "completedQuantity": 75,
    "productionType": "CUSTOM"
  },
  {
    "id": 5,
    "name": "Станок CNC-02",
    "status": "ACTIVE",
    "load_unit": "шт",
    "noSmenTask": false,
    "recommendedLoad": 100,
    "plannedQuantity": 50,
    "completedQuantity": 25,
    "productionType": "BOTH"
  }
]
```

---

## Логика фильтрации

### Какие станки показываются:

1. **Станки с `productionType = CUSTOM`** - только для индивидуального производства
2. **Станки с `productionType = BOTH`** - универсальные станки

### Какие станки НЕ показываются:

- Станки с `productionType = SERIAL` - только для серийного производства

---

## Сравнение с серийным производством

| Параметр | Серийное производство | Индивидуальное производство |
|----------|----------------------|----------------------------|
| **Эндпоинт** | `/machins/master/machines` | `/custom/master/machines/by-segment` |
| **Фильтр по типу** | Нет фильтрации | `CUSTOM` или `BOTH` |
| **Поле в ответе** | Нет `productionType` | Есть `productionType` |

---

## Примеры использования на фронтенде

### React/TypeScript компонент

```typescript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface CustomMachine {
  id: number;
  name: string;
  status: string;
  load_unit: string;
  noSmenTask: boolean;
  recommendedLoad: number;
  plannedQuantity: number;
  completedQuantity: number;
  productionType: string;
}

export const CustomMasterMachines: React.FC<{ stageId: number }> = ({ stageId }) => {
  const [machines, setMachines] = useState<CustomMachine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await axios.get(
          `/custom/master/machines/by-segment?stageId=${stageId}`
        );
        setMachines(response.data);
      } catch (error) {
        console.error('Ошибка загрузки станков:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, [stageId]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="machines-grid">
      {machines.map(machine => (
        <div key={machine.id} className="machine-card">
          <h3>{machine.name}</h3>
          <div className="machine-info">
            <span className={`status ${machine.status.toLowerCase()}`}>
              {machine.status}
            </span>
            <span className="production-type">
              {machine.productionType === 'CUSTOM' ? 'Индивидуальное' : 'Универсальный'}
            </span>
          </div>
          <div className="machine-stats">
            <div>
              <label>Рекомендуемая загрузка:</label>
              <span>{machine.recommendedLoad} {machine.load_unit}</span>
            </div>
            <div>
              <label>Запланировано:</label>
              <span>{machine.plannedQuantity} {machine.load_unit}</span>
            </div>
            <div>
              <label>Выполнено:</label>
              <span>{machine.completedQuantity} {machine.load_unit}</span>
            </div>
            <div>
              <label>Прогресс:</label>
              <progress 
                value={machine.completedQuantity} 
                max={machine.plannedQuantity}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Axios запрос

```typescript
// Получить станки для участка индивидуального производства
const getMachinesForCustomProduction = async (stageId: number) => {
  try {
    const response = await axios.get('/custom/master/machines/by-segment', {
      params: { stageId }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения станков:', error);
    throw error;
  }
};

// Использование
const machines = await getMachinesForCustomProduction(1);
console.log('Станки индивидуального производства:', machines);
```

### Fetch API

```typescript
const fetchCustomMachines = async (stageId: number) => {
  const response = await fetch(
    `http://localhost:5000/custom/master/machines/by-segment?stageId=${stageId}`
  );
  
  if (!response.ok) {
    throw new Error('Ошибка загрузки станков');
  }
  
  const machines = await response.json();
  return machines;
};
```

---

## Расчет единиц измерения

Система поддерживает различные единицы измерения загрузки станков:

### 1. Квадратные метры (м²)
```
Площадь = (длина × ширина × количество) / 1,000,000
```

### 2. Кубические метры (м³)
```
Объем = (длина × ширина × толщина × количество) / 1,000,000,000
```

### 3. Метры (м)
```
Длина = (длина_детали × количество) / 1,000
```

### 4. Метры кромки (м кромки)
```
Кромка = сумма_обрабатываемых_сторон × количество / 1,000
```
Учитываются только стороны с заполненными полями облицовки (edgingNameL1, edgingNameL2, edgingNameW1, edgingNameW2)

### 5. Штуки (шт)
```
Количество = сумма количества деталей
```

---

## Статусы станков

| Статус | Описание | Цвет (рекомендация) |
|--------|----------|---------------------|
| `ACTIVE` | Станок активен и работает | Зеленый |
| `INACTIVE` | Станок неактивен | Серый |
| `MAINTENANCE` | Станок на обслуживании | Оранжевый |
| `BROKEN` | Станок сломан | Красный |

---

## Обработка ошибок

### 404 - Участок не найден
```json
{
  "statusCode": 404,
  "message": "Участок с ID 999 не найден"
}
```

### 500 - Внутренняя ошибка сервера
```json
{
  "statusCode": 500,
  "message": "Произошла ошибка при получении станков"
}
```

---

## Будущие доработки

В планах добавить:
1. ✅ Получение станков по участку (реализовано)
2. ⏳ Получение заданий для станка
3. ⏳ Удаление задания
4. ⏳ Перемещение задания на другой станок
5. ⏳ Сброс счетчика станка
6. ⏳ Таблица истории операций для аналитики

---

## Контрольный список для фронтенда

- [ ] Создать компонент для отображения станков индивидуального производства
- [ ] Добавить фильтрацию по типу производства
- [ ] Реализовать карточки станков с прогресс-барами
- [ ] Добавить индикаторы статуса станков
- [ ] Показывать бейдж типа производства (CUSTOM/BOTH)
- [ ] Обработать состояния загрузки и ошибок
- [ ] Добавить автообновление данных (WebSocket или polling)
- [ ] Протестировать с разными единицами измерения

---

## Вопросы?

При возникновении вопросов обращайтесь к backend команде.
