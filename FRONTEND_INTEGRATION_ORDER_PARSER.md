# Инструкция для фронтенда: Создание заказа из Excel файла

## Обзор

Система позволяет создавать заказы путем загрузки Excel файлов с упаковками. Процесс состоит из двух этапов:
1. Загрузка и парсинг файла с проверкой упаковок
2. Сохранение заказа с указанием номера партии, названия и даты

## API Endpoints

### 1. Загрузка и парсинг Excel файла

**Endpoint:** `POST /order-management/upload`

**Content-Type:** `multipart/form-data`

**Параметры:**
- `file` - Excel файл (.xls или .xlsx)

**Пример запроса (JavaScript/TypeScript):**

```typescript
const uploadOrderFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/order-management/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`, // если требуется авторизация
    },
  });

  return await response.json();
};
```

**Успешный ответ (200):**
```json
{
  "message": "Файл успешно обработан. Все упаковки найдены в базе.",
  "filename": "order.xlsx",
  "data": {
    "packages": [
      {
        "code": "PKG001",
        "name": "Упаковка 1",
        "quantity": 10,
        "exists": true,
        "existingPackage": {
          "packageId": 1,
          "packageCode": "PKG001",
          "packageName": "Упаковка 1"
        }
      },
      {
        "code": "PKG002",
        "name": "Упаковка 2",
        "quantity": 5,
        "exists": true,
        "existingPackage": {
          "packageId": 2,
          "packageCode": "PKG002",
          "packageName": "Упаковка 2"
        }
      }
    ],
    "missingPackages": [],
    "allExist": true
  }
}
```

**Ответ с отсутствующими упаковками (200):**
```json
{
  "message": "Файл обработан. Не найдены упаковки: PKG999",
  "filename": "order.xlsx",
  "data": {
    "packages": [
      {
        "code": "PKG001",
        "name": "Упаковка 1",
        "quantity": 10,
        "exists": true,
        "existingPackage": {...}
      },
      {
        "code": "PKG999",
        "name": "Несуществующая упаковка",
        "quantity": 3,
        "exists": false
      }
    ],
    "missingPackages": ["PKG999"],
    "allExist": false
  }
}
```

**Ошибка (400):**
```json
{
  "statusCode": 400,
  "message": "Ошибка обработки файла: Не найдена строка с заголовками"
}
```

---

### 2. Сохранение заказа

**Endpoint:** `POST /order-management/save-from-file`

**Content-Type:** `application/json`

**Тело запроса:**
```typescript
interface SaveOrderFromFileDto {
  batchNumber: string;      // Номер партии
  orderName: string;        // Название заказа
  requiredDate: string;     // Дата выполнения (ISO 8601)
  packages: Array<{
    code: string;           // Код упаковки
    name: string;           // Название упаковки
    quantity: number;       // Количество
  }>;
}
```

**Пример запроса:**

```typescript
const saveOrderFromFile = async (orderData: SaveOrderFromFileDto) => {
  const response = await fetch('http://localhost:3000/order-management/save-from-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  return await response.json();
};

// Использование
const result = await saveOrderFromFile({
  batchNumber: "BATCH-2024-001",
  orderName: "Заказ январь 2024",
  requiredDate: "2024-12-31T00:00:00.000Z",
  packages: [
    { code: "PKG001", name: "Упаковка 1", quantity: 10 },
    { code: "PKG002", name: "Упаковка 2", quantity: 5 }
  ]
});
```

**Успешный ответ (201):**
```json
{
  "message": "Заказ успешно создан",
  "orderId": 123,
  "batchNumber": "BATCH-2024-001",
  "packagesCount": 2
}
```

**Ошибка - упаковки не найдены (400):**
```json
{
  "statusCode": 400,
  "message": "Следующие упаковки не найдены в базе: PKG999, PKG888"
}
```

---

## Полный пример компонента React

```typescript
import React, { useState } from 'react';

interface Package {
  code: string;
  name: string;
  quantity: number;
  exists?: boolean;
  existingPackage?: {
    packageId: number;
    packageCode: string;
    packageName: string;
  };
}

const OrderFromFileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [missingPackages, setMissingPackages] = useState<string[]>([]);
  const [batchNumber, setBatchNumber] = useState('');
  const [orderName, setOrderName] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Шаг 1: Загрузка и парсинг файла
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:3000/order-management/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setPackages(result.data.packages);
        setMissingPackages(result.data.missingPackages);
        
        if (!result.data.allExist) {
          alert(`Внимание! Не найдены упаковки: ${result.data.missingPackages.join(', ')}`);
        }
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Ошибка при загрузке файла');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: Сохранение заказа
  const handleSaveOrder = async () => {
    if (!batchNumber || !orderName || !requiredDate) {
      alert('Заполните все поля');
      return;
    }

    if (packages.length === 0) {
      alert('Нет упаковок для сохранения');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/order-management/save-from-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber,
          orderName,
          requiredDate: new Date(requiredDate).toISOString(),
          packages: packages.map(pkg => ({
            code: pkg.code,
            name: pkg.name,
            quantity: pkg.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Заказ успешно создан! ID: ${result.orderId}`);
        // Очистка формы
        setFile(null);
        setPackages([]);
        setBatchNumber('');
        setOrderName('');
        setRequiredDate('');
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Ошибка при сохранении заказа');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Редактирование упаковки
  const handlePackageChange = (index: number, field: keyof Package, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  // Удаление упаковки
  const handleRemovePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h2>Создание заказа из Excel файла</h2>

      {/* Шаг 1: Загрузка файла */}
      <div>
        <h3>Шаг 1: Загрузите Excel файл</h3>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileUpload}
          disabled={loading}
        />
      </div>

      {/* Шаг 2: Просмотр и редактирование упаковок */}
      {packages.length > 0 && (
        <div>
          <h3>Шаг 2: Проверьте упаковки</h3>
          {missingPackages.length > 0 && (
            <div style={{ color: 'red' }}>
              Внимание! Не найдены упаковки: {missingPackages.join(', ')}
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Код</th>
                <th>Название</th>
                <th>Количество</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, index) => (
                <tr key={index} style={{ backgroundColor: pkg.exists ? 'white' : '#ffcccc' }}>
                  <td>
                    <input
                      value={pkg.code}
                      onChange={(e) => handlePackageChange(index, 'code', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={pkg.name}
                      onChange={(e) => handlePackageChange(index, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={pkg.quantity}
                      onChange={(e) => handlePackageChange(index, 'quantity', parseFloat(e.target.value))}
                    />
                  </td>
                  <td>{pkg.exists ? '✓ Найдена' : '✗ Не найдена'}</td>
                  <td>
                    <button onClick={() => handleRemovePackage(index)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Шаг 3: Заполнение данных заказа */}
      {packages.length > 0 && (
        <div>
          <h3>Шаг 3: Заполните данные заказа</h3>
          <div>
            <label>
              Номер партии:
              <input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="BATCH-2024-001"
              />
            </label>
          </div>
          <div>
            <label>
              Название заказа:
              <input
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder="Заказ январь 2024"
              />
            </label>
          </div>
          <div>
            <label>
              Дата выполнения:
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
            </label>
          </div>
          <button onClick={handleSaveOrder} disabled={loading}>
            {loading ? 'Сохранение...' : 'Создать заказ'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderFromFileUpload;
```

---

## Требования к Excel файлу

1. **Формат:** .xls или .xlsx
2. **Максимальный размер:** 10 МБ
3. **Обязательные колонки:**
   - **Код** или **Артикул** - код упаковки
   - **Наименование** или **Наименование номенклатуры** - название
   - **Кол-во** или **Количество** - количество упаковок

4. **Особенности:**
   - Колонки могут находиться в строках 1-40
   - Колонки могут быть не рядом (через 1-2 колонки)
   - Количество может быть с запятой или точкой
   - Парсинг прекращается при пустой строке

---

## Обработка ошибок

```typescript
// Пример обработки всех возможных ошибок
const handleUploadWithErrorHandling = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/order-management/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      // Обработка ошибок от сервера
      switch (response.status) {
        case 400:
          alert(`Ошибка в файле: ${result.message}`);
          break;
        case 413:
          alert('Файл слишком большой (максимум 10 МБ)');
          break;
        default:
          alert('Произошла ошибка при загрузке файла');
      }
      return null;
    }

    return result;
  } catch (error) {
    // Обработка сетевых ошибок
    alert('Ошибка соединения с сервером');
    console.error(error);
    return null;
  }
};
```

---

## WebSocket уведомления

После успешного создания заказа система отправляет WebSocket уведомления в следующие комнаты:
- `room:masterceh`
- `room:machines`
- `room:machinesnosmen`
- `room:technologist`
- `room:masterypack`
- `room:director`

События:
- `order:event` - общее событие обновления заказов
- `order:stats` - обновление статистики заказов

```typescript
// Пример подписки на события
socket.on('order:event', (data) => {
  console.log('Заказы обновлены:', data);
  // Обновить список заказов
  fetchOrders();
});

socket.on('order:stats', (data) => {
  console.log('Статистика обновлена:', data);
  // Обновить статистику
  fetchOrderStats();
});
```
