
# Документация API станков (Machin API)

## Оглавление
1. [Общая информация](#общая-информация)
2. [Эндпоинты](#эндпоинты)
   - [Получение всех станков](#получение-всех-станков)
   - [Получение станков с поддонами](#получение-станков-с-поддонами)
   - [Получение конкретного станка с поддонами](#получение-конкретного-станка-с-поддонами)
   - [Получение ячейки буфера](#получение-ячейки-буфера)
3. [Модели данных](#модели-данных)
4. [Коды ошибок](#коды-ошибок)
5. [Примеры использования](#примеры-использования)

## Общая информация

Базовый URL API: `/machin`

API предоставляет информацию о станках, их текущем состоянии и связанных поддонах, находящихся в процессе обработки.

## Эндпоинты

### Получение всех станков

```
GET /machin/all
```

Возвращает список всех станков без детальной информации о связанных поддонах.

#### Параметры запроса
Отсутствуют

#### Ответ

**Успешный ответ (200 OK)**
```json
[
  {
    "id": 1,
    "name": "Станок №1",
    "status": "ACTIVE",
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-01T12:00:00.000Z",
    "segmentId": 1
  },
  {
    "id": 2,
    "name": "Станок №2",
    "status": "INACTIVE",
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-01T12:00:00.000Z",
    "segmentId": 1
  }
]
```

**Ошибка (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Станки не найдены",
  "error": "Not Found"
}
```

### Получение станков с поддонами

```
GET /machin/with-pallets
```

Возвращает список всех станков вместе с информацией о поддонах, которые в данный момент находятся на них в обработке.

#### Параметры запроса
Отсутствуют

#### Ответ

**Успешный ответ (200 OK)**
```json
[
  {
    "id": 1,
    "name": "Станок №1",
    "status": "ACTIVE",
    "activePallets": [
      {
        "palletId": 101,
        "palletName": "Поддон A101",
        "quantity": 10,
        "operationId": 1001,
        "startedAt": "2023-01-01T14:30:00.000Z"
      }
    ]
  },
  {
    "id": 2,
    "name": "Станок №2",
    "status": "ACTIVE",
    "activePallets": [
      {
        "palletId": 102,
        "palletName": "Поддон A102",
        "quantity": 15,
        "operationId": 1002,
        "startedAt": "2023-01-01T15:45:00.000Z"
      },
      {
        "palletId": 103,
        "palletName": "Поддон A103",
        "quantity": 8,
        "operationId": 1003,
        "startedAt": "2023-01-01T16:20:00.000Z"
      }
    ]
  },
  {
    "id": 3,
    "name": "Станок №3",
    "status": "INACTIVE",
    "activePallets": []
  }
]
```

**Ошибка (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Станки не найдены",
  "error": "Not Found"
}
```

### Получение конкретного станка с поддонами

```
GET /machin/:id/with-pallets
```

Возвращает информацию о конкретном станке по его ID вместе с подробной информацией о поддонах, которые в данный момент находятся на нем в обработке.

#### Параметры запроса
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| id | number | Да | ID станка |

#### Ответ

**Успешный ответ (200 OK)**
```json
{
  "id": 1,
  "name": "Станок №1",
  "status": "ACTIVE",
  "activePallets": [
    {
      "palletId": 101,
      "palletName": "Поддон A101",
      "quantity": 10,
      "detailId": 201,
      "detailName": "Деталь XYZ",
      "processStep": "Присадка",
      "operationId": 1001,
      "startedAt": "2023-01-01T14:30:00.000Z"
    }
  ]
}
```

**Ошибка (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Станок с ID 1 не найден",
  "error": "Not Found"
}
```

### Получение ячейки буфера

```
GET /machin/cells/:id
```

Возвращает информацию о конкретной ячейке буфера по её ID вместе с информацией о размещенных в ней поддонах.

#### Параметры запроса
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| id | number | Да | ID ячейки буфера |

#### Ответ

**Успешный ответ (200 OK)**

Структура ответа включает детальную информацию о ячейке буфера, буфере, к которому она принадлежит, и поддонах внутри ячейки.

```json
{
  "id": 1,
  "code": "A1",
  "bufferId": 101,
  "status": "OCCUPIED",
  "capacity": 2,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z",
  "buffer": {
    "id": 101,
    "name": "Основной буфер",
    "description": "Буфер для участка 1",
    "location": "Цех №2"
  },
  "pallets": [
    {
      "id": 201,
      "name": "Поддон B201",
      "quantity": 5,
      "detailId": 301,
      "detail": {
        "id": 301,
        "article": "XYZ-123",
        "name": "Деталь XYZ",
        "material": "Дерево",
        "size": "100x50x25"
      },
      "detailOperations": [
        {
          "id": 401,
          "processStepId": 501,
          "machineId": 1,
          "operatorId": 601,
          "status": "BUFFERED",
          "startedAt": "2023-01-01T13:15:00.000Z",
          "completedAt": null,
          "quantity": 5,
          "processStep": {
            "id": 501,
            "name": "Присадка",
            "sequence": 2
          },
          "machine": {
            "id": 1,
            "name": "Станок №1",
            "status": "ACTIVE"
          },
          "operator": {
            "id": 601,
            "username": "operator1",
            "details": {
              "id": 701,
              "fullName": "Иванов Иван",
              "position": "Оператор станка"
            }
          }
        }
      ]
    }
  ]
}
```

**Ошибка (404 Not Found)**
```json
{
  "statusCode": 404,
  "message": "Ячейка буфера с ID 1 не найдена",
  "error": "Not Found"
}
```

## Модели данных

### Machine (Станок)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор станка |
| name | string | Название/номер станка |
| status | MachineStatus | Текущий статус станка (ACTIVE, INACTIVE, MAINTENANCE) |
| segmentId | number | ID участка производства, к которому привязан станок (может быть null) |
| createdAt | Date | Дата создания записи о станке |
| updatedAt | Date | Дата последнего обновления записи о станке |

### MachineWithPallets (Станок с поддонами)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор станка |
| name | string | Название/номер станка |
| status | MachineStatus | Текущий статус станка |
| activePallets | ActivePallet[] | Массив активных поддонов на станке |

### ActivePallet (Активный поддон)
| Поле | Тип | Описание |
|------|-----|----------|
| palletId | number | ID поддона |
| palletName | string | Название/номер поддона |
| quantity | number | Количество деталей на поддоне |
| operationId | number | ID операции |
| startedAt | Date | Время начала операции |
| detailId | number | ID детали (только для детального запроса) |
| detailName | string | Название детали (только для детального запроса) |
| processStep | string | Название этапа обработки (только для детального запроса) |

### BufferCell (Ячейка буфера)
| Поле | Тип | Описание |
|------|-----|----------|
| id | number | Уникальный идентификатор ячейки |
| code | string | Код/номер ячейки |
| bufferId | number | ID буфера, которому принадлежит ячейка |
| status | BufferCellStatus | Статус ячейки (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE) |
| capacity | number | Вместимость ячейки (сколько поддонов может вместить) |
| createdAt | Date | Дата создания записи о ячейке |
| updatedAt | Date | Дата последнего обновления записи о ячейке |
| buffer | Buffer | Информация о буфере |
| pallets | ProductionPallet[] | Массив поддонов в ячейке |

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 404 | Запрашиваемый ресурс не найден |
| 500 | Внутренняя ошибка сервера |

## Примеры использования

### Получение всех станков с активными поддонами

```typescript
// Пример использования fetch API
async function getMachinesWithPallets() {
  try {
    const response = await fetch('/machin/with-pallets');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при получении станков');
    }
    
    const machines = await response.json();
    return machines;
  } catch (error) {
    console.error('Ошибка:', error);
    throw error;
  }
}

// Пример использования axios
import axios from 'axios';

async function getMachinesWithPallets() {
  try {
    const response = await axios.get('/machin/with-pallets');
    return response.data;
  } catch (error) {
    if (error.response) {
      // Ошибка от сервера с кодом ответа
      console.error('Ошибка сервера:', error.response.data);
      throw new Error(error.response.data.message || 'Ошибка при получении станков');
    } else {
      // Ошибка настройки запроса или сеть недоступна
      console.error('Ошибка запроса:', error.message);
      throw error;
    }
  }
}
```

### Отображение списка станков с поддонами на React

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MachinesList = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/machin/with-pallets');
        setMachines(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Ошибка при получении данных');
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
    
    // Опционально: настройка интервала обновления
    const interval = setInterval(fetchMachines, 30000); // Обновление каждые 30 секунд
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      <h1>Список станков</h1>
      {machines.map(machine => (
        <div key={machine.id} className="machine-card">
          <h2>{machine.name}</h2>
          <p>Статус: {machine.status}</p>
          
          <h3>Активные поддоны ({machine.activePallets.length}):</h3>
          {machine.activePallets.length === 0 ? (
            <p>Нет активных поддонов</p>
          ) : (
            <ul>
              {machine.activePallets.map(pallet => (
                <li key={pallet.palletId}>
                  <strong>{pallet.palletName}</strong>
                  <p>Количество деталей: {pallet.quantity}</p>
                  <p>Начало обработки: {new Date(pallet.startedAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default MachinesList;
```

### Получение детальной информации о станке

```typescript
// Пример использования fetch API с обработкой ошибок
async function getMachineDetails(machineId) {
  try {
    const response = await fetch(`/machin/${machineId}/with-pallets`);
    
    if (response.status === 404) {
      return { notFound: true };
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Ошибка при получении станка с ID ${machineId}`);
    }
    
    const machine = await response.json();
    return { machine };
  } catch (error) {
    console.error('Ошибка:', error);
    return { error: error.message };
  }
}
```
</qodoArtifact>

# Документация API станков для фронтенд-разработчиков

Я подготовил подробную документацию по API станков для вашей фронтенд-команды. Документация содержит всю необходимую информацию для интеграции с бэкендом: описание эндпоинтов, структуру запросов и ответов, коды ошибок и примеры использования.

## Содержание документации:

1. **Общая информация** - базовый URL API и общее описание функциональности

2. **Подробное описание эндпоинтов:**
   - `GET /machin/all` - получение всех станков
   - `GET /machin/with-pallets` - получение станков с активными поддонами
   - `GET /machin/:id/with-pallets` - получение конкретного станка с активными поддонами
   - `GET /machin/cells/:id` - получение ячейки буфера

3. **Структура данных и модели:**
   - Детальное описание всех полей в ответах API
   - Объяснение типов данных и их значений

4. **Коды ошибок и их обработка**

5. **Практические примеры использования:**
   - Примеры с использованием fetch API
   - Примеры с использованием axios
   - Готовый пример React-компонента для отображения списка станков с поддонами

## Рекомендации по использованию:

1. **Размещение документации** - сохраните файл в директории `/docs` вашего проекта

2. **Для фронтенд-разработчиков:**
   - Внимательно изучите структуру ответов API
   - Обратите внимание на обработку ошибок и состояний загрузки
   - При разработке интерфейса учитывайте, что у станка может быть несколько активных поддонов

3. **Для бэкенд-разработчиков:**
   - При изменении API обновляйте документацию
   - Сохраняйте согласованность в структуре ответов

4. **Для тестирования интеграции:**
   - Используйте примеры из документации как основу для тестов
   - Проверяйте крайние случаи (пустые массивы, отсутствующие записи)

Документация создана в формате Markdown, что обеспечивает хорошую читаемость как в обычных текстовых редакторах, так и в системах контроля версий.