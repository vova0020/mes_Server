# API документация для фронтенда - Модуль управления заказами

## Базовая информация

**Базовый URL**: `http://localhost:5000` (или ваш сервер)  
**Префикс API**: `/order-management`  
**Формат данных**: JSON  
**Кодировка**: UTF-8

## Endpoints

### 1. Получение списка всех заказов

**GET** `/order-management`

Возвращает список всех заказов с базовой информацией для отображения в таблице или списке.

#### Запрос
```http
GET /order-management
Content-Type: application/json
```

#### Ответ
```json
[
  {
    "orderId": 1,
    "batchNumber": "BATCH-2024-001",
    "orderName": "Заказ на производство мебели",
    "completionPercentage": 25.5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": null,
    "requiredDate": "2024-12-31T23:59:59.000Z",
    "status": "PRELIMINARY",
    "launchPermission": false,
    "isCompleted": false,
    "packagesCount": 3,
    "totalPartsCount": 45
  },
  {
    "orderId": 2,
    "batchNumber": "BATCH-2024-002",
    "orderName": "Заказ на производство столов",
    "completionPercentage": 75.0,
    "createdAt": "2024-01-02T00:00:00.000Z",
    "completedAt": null,
    "requiredDate": "2024-11-30T23:59:59.000Z",
    "status": "LAUNCH_PERMITTED",
    "launchPermission": true,
    "isCompleted": false,
    "packagesCount": 2,
    "totalPartsCount": 28
  }
]
```

#### Пример использования (JavaScript/TypeScript)
```typescript
// Получение списка заказов
async function getOrders() {
  try {
    const response = await fetch('/order-management', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const orders = await response.json();
    return orders;
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    throw error;
  }
}
```

#### Пример использования (React)
```tsx
import React, { useState, useEffect } from 'react';

interface Order {
  orderId: number;
  batchNumber: string;
  orderName: string;
  completionPercentage: number;
  createdAt: string;
  completedAt?: string;
  requiredDate: string;
  status: 'PRELIMINARY' | 'APPROVED' | 'LAUNCH_PERMITTED' | 'IN_PROGRESS' | 'COMPLETED';
  launchPermission: boolean;
  isCompleted: boolean;
  packagesCount: number;
  totalPartsCount: number;
}

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/order-management');
        if (!response.ok) {
          throw new Error('Ошибка при загрузке заказов');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      <h2>Список заказов</h2>
      <table>
        <thead>
          <tr>
            <th>Номер партии</th>
            <th>Название</th>
            <th>Статус</th>
            <th>Прогресс</th>
            <th>Упаковки</th>
            <th>Детали</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td>{order.batchNumber}</td>
              <td>{order.orderName}</td>
              <td>{order.status}</td>
              <td>{order.completionPercentage}%</td>
              <td>{order.packagesCount}</td>
              <td>{order.totalPartsCount}</td>
              <td>
                <button onClick={() => handleOrderClick(order.orderId)}>
                  Подробнее
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### 2. Получение детальной информации о заказе

**GET** `/order-management/:id`

Возвращает полную информацию о заказе, включая все упаковки и детали.

#### Параметры
- `id` (number) - ID заказа

#### Запрос
```http
GET /order-management/1
Content-Type: application/json
```

#### Ответ
```json
{
  "order": {
    "orderId": 1,
    "batchNumber": "BATCH-2024-001",
    "orderName": "Заказ на производство мебели",
    "completionPercentage": 25.5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": null,
    "requiredDate": "2024-12-31T23:59:59.000Z",
    "status": "PRELIMINARY",
    "launchPermission": false,
    "isCompleted": false
  },
  "packages": [
    {
      "packageId": 1,
      "packageCode": "PKG-001",
      "packageName": "Упаковка стульев",
      "quantity": 5,
      "completionPercentage": 30.0,
      "details": [
        {
          "partId": 1,
          "partCode": "PART-001",
          "partName": "Ножка стула",
          "totalQuantity": 20,
          "status": "PENDING",
          "size": "500x50x50",
          "materialId": 1
        },
        {
          "partId": 2,
          "partCode": "PART-002",
          "partName": "Сиденье стула",
          "totalQuantity": 5,
          "status": "IN_PROGRESS",
          "size": "400x400x20",
          "materialId": 2
        }
      ]
    },
    {
      "packageId": 2,
      "packageCode": "PKG-002",
      "packageName": "Упаковка столов",
      "quantity": 2,
      "completionPercentage": 15.0,
      "details": [
        {
          "partId": 3,
          "partCode": "PART-003",
          "partName": "Столешница",
          "totalQuantity": 2,
          "status": "PENDING",
          "size": "1200x800x25",
          "materialId": 3
        }
      ]
    }
  ]
}
```

#### Пример использования (JavaScript/TypeScript)
```typescript
// Получение деталей заказа
async function getOrderDetails(orderId: number) {
  try {
    const response = await fetch(`/order-management/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Заказ не найден');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const orderDetails = await response.json();
    return orderDetails;
  } catch (error) {
    console.error('Ошибка при получении деталей заказа:', error);
    throw error;
  }
}
```

#### Пример использования (React)
```tsx
import React, { useState, useEffect } from 'react';

interface OrderDetail {
  order: {
    orderId: number;
    batchNumber: string;
    orderName: string;
    completionPercentage: number;
    createdAt: string;
    completedAt?: string;
    requiredDate: string;
    status: string;
    launchPermission: boolean;
    isCompleted: boolean;
  };
  packages: Array<{
    packageId: number;
    packageCode: string;
    packageName: string;
    quantity: number;
    completionPercentage: number;
    details: Array<{
      partId: number;
      partCode: string;
      partName: string;
      totalQuantity: number;
      status: string;
      size: string;
      materialId: number;
    }>;
  }>;
}

interface OrderDetailsProps {
  orderId: number;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ orderId }) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/order-management/${orderId}`);
        if (!response.ok) {
          throw new Error('Ошибка при загрузке деталей заказа');
        }
        const data = await response.json();
        setOrderDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) return <div>Загрузка деталей заказа...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!orderDetails) return <div>Заказ не найден</div>;

  return (
    <div>
      <h2>Детали заказа {orderDetails.order.batchNumber}</h2>
      
      <div className="order-info">
        <h3>Информация о заказе</h3>
        <p><strong>Название:</strong> {orderDetails.order.orderName}</p>
        <p><strong>Статус:</strong> {orderDetails.order.status}</p>
        <p><strong>Прогресс:</strong> {orderDetails.order.completionPercentage}%</p>
        <p><strong>Разрешение к запуску:</strong> {orderDetails.order.launchPermission ? 'Да' : 'Нет'}</p>
      </div>

      <div className="packages">
        <h3>Упаковки</h3>
        {orderDetails.packages.map((pkg) => (
          <div key={pkg.packageId} className="package">
            <h4>{pkg.packageName} ({pkg.packageCode})</h4>
            <p>Количество: {pkg.quantity}</p>
            <p>Прогресс: {pkg.completionPercentage}%</p>
            
            <div className="details">
              <h5>Детали в упаковке:</h5>
              <table>
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Название</th>
                    <th>Количество</th>
                    <th>Статус</th>
                    <th>Размер</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.details.map((detail) => (
                    <tr key={detail.partId}>
                      <td>{detail.partCode}</td>
                      <td>{detail.partName}</td>
                      <td>{detail.totalQuantity}</td>
                      <td>{detail.status}</td>
                      <td>{detail.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 3. Изменение статуса заказа

**PATCH** `/order-management/:id/status`

Позволяет изменить статус заказа, включая установку статуса "разрешить к запуску".

#### Параметры
- `id` (number) - ID заказа

#### Тело запроса
```json
{
  "status": "LAUNCH_PERMITTED"
}
```

#### Возможные статусы
- `PRELIMINARY` - Предварительный
- `APPROVED` - Утверждено
- `LAUNCH_PERMITTED` - Разрешено к запуску
- `IN_PROGRESS` - В работе
- `COMPLETED` - Завершен

#### Запрос
```http
PATCH /order-management/1/status
Content-Type: application/json

{
  "status": "LAUNCH_PERMITTED"
}
```

#### Ответ
```json
{
  "orderId": 1,
  "previousStatus": "APPROVED",
  "newStatus": "LAUNCH_PERMITTED",
  "launchPermission": true,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### Пример использования (JavaScript/TypeScript)
```typescript
// Изменение статуса заказа
async function updateOrderStatus(orderId: number, status: string) {
  try {
    const response = await fetch(`/order-management/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Заказ не найден');
      }
      if (response.status === 400) {
        throw new Error('Недопустимый переход статуса');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ошибка при изменении статуса заказа:', error);
    throw error;
  }
}

// Функция для разрешения заказа к запуску
async function approveOrderForLaunch(orderId: number) {
  return updateOrderStatus(orderId, 'LAUNCH_PERMITTED');
}
```

#### Пример использования (React)
```tsx
import React, { useState } from 'react';

interface StatusUpdateProps {
  orderId: number;
  currentStatus: string;
  onStatusUpdated: () => void;
}

const StatusUpdate: React.FC<StatusUpdateProps> = ({ 
  orderId, 
  currentStatus, 
  onStatusUpdated 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/order-management/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при изменении статуса');
      }

      const result = await response.json();
      console.log('Статус изменен:', result);
      onStatusUpdated(); // Обновить данные в родительском компоненте
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const canApproveForLaunch = currentStatus === 'APPROVED';
  const canStartProgress = currentStatus === 'LAUNCH_PERMITTED';

  return (
    <div className="status-update">
      <h4>Управление статусом заказа</h4>
      <p>Текущий статус: <strong>{currentStatus}</strong></p>
      
      {error && <div className="error">Ошибка: {error}</div>}
      
      <div className="status-buttons">
        {canApproveForLaunch && (
          <button
            onClick={() => handleStatusChange('LAUNCH_PERMITTED')}
            disabled={loading}
            className="btn-approve"
          >
            {loading ? 'Обновление...' : 'Разрешить к запуску'}
          </button>
        )}
        
        {canStartProgress && (
          <button
            onClick={() => handleStatusChange('IN_PROGRESS')}
            disabled={loading}
            className="btn-start"
          >
            {loading ? 'Обновление...' : 'Запустить в производство'}
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## WebSocket интеграция

Модуль поддерживает WebSocket для получения обновлений в реальном времени.

### Подключение к WebSocket

```typescript
// Подключение к WebSocket
const socket = io('http://localhost:3000'); // или ваш сервер

// Подписка на комнату управления заказами
socket.emit('joinRoom', { room: 'order-management' });

// Обработка событий
socket.on('orderStatusChanged', (data) => {
  console.log('Статус заказа изменен:', data);
  // Обновить UI
  updateOrderInList(data.orderId, data.newStatus, data.launchPermission);
});

socket.on('orderDetailsRequested', (data) => {
  console.log('Запрошены детали заказа:', data);
});

socket.on('orderListUpdated', (data) => {
  console.log('Список заказов обновлен:', data);
  // Перезагрузить список заказов
  refreshOrdersList();
});
```

### Пример React Hook для WebSocket

```tsx
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface OrderStatusUpdate {
  orderId: number;
  previousStatus: string;
  newStatus: string;
  launchPermission: boolean;
  timestamp: string;
}

export const useOrderManagementSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<OrderStatusUpdate[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Подписка на комнату
    newSocket.emit('joinRoom', { room: 'order-management' });

    // Обработка событий
    newSocket.on('orderStatusChanged', (data: OrderStatusUpdate) => {
      setStatusUpdates(prev => [...prev, data]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return {
    socket,
    statusUpdates,
  };
};
```

---

## Обработка ошибок

### Коды ошибок HTTP

- **200** - Успешный запрос
- **400** - Неве��ный запрос (например, недопустимый переход статуса)
- **404** - Заказ не найден
- **500** - Внутренняя ошибка сервера

### Примеры ошибок

```json
// 404 - Заказ не найден
{
  "statusCode": 404,
  "message": "Заказ с ID 999 не найден",
  "error": "Not Found"
}

// 400 - Недопустимый переход статуса
{
  "statusCode": 400,
  "message": "Недопустимый переход статуса с COMPLETED на PRELIMINARY",
  "error": "Bad Request"
}
```

### Универсальная функция обработки ошибок

```typescript
async function handleApiRequest<T>(request: () => Promise<Response>): Promise<T> {
  try {
    const response = await request();
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Неизвестная ошибка при выполнении запроса');
  }
}

// Использование
const orders = await handleApiRequest<Order[]>(() => 
  fetch('/order-management')
);
```

---

## Типы TypeScript

```typescript
// Основные типы для работы с API

export type OrderStatus = 
  | 'PRELIMINARY' 
  | 'APPROVED' 
  | 'LAUNCH_PERMITTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED';

export interface Order {
  orderId: number;
  batchNumber: string;
  orderName: string;
  completionPercentage: number;
  createdAt: string;
  completedAt?: string;
  requiredDate: string;
  status: OrderStatus;
  launchPermission: boolean;
  isCompleted: boolean;
  packagesCount: number;
  totalPartsCount: number;
}

export interface OrderDetail {
  partId: number;
  partCode: string;
  partName: string;
  totalQuantity: number;
  status: string;
  size: string;
  materialId: number;
}

export interface OrderPackage {
  packageId: number;
  packageCode: string;
  packageName: string;
  quantity: number;
  completionPercentage: number;
  details: OrderDetail[];
}

export interface OrderDetailsResponse {
  order: {
    orderId: number;
    batchNumber: string;
    orderName: string;
    completionPercentage: number;
    createdAt: string;
    completedAt?: string;
    requiredDate: string;
    status: OrderStatus;
    launchPermission: boolean;
    isCompleted: boolean;
  };
  packages: OrderPackage[];
}

export interface StatusUpdateRequest {
  status: OrderStatus;
}

export interface StatusUpdateResponse {
  orderId: number;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  launchPermission: boolean;
  updatedAt: string;
}

// WebSocket события
export interface OrderStatusChangedEvent {
  orderId: number;
  previousStatus: string;
  newStatus: string;
  launchPermission: boolean;
  timestamp: string;
}
```

---

## Полный пример интеграции

```tsx
import React, { useState, useEffect } from 'react';
import { Order, OrderDetailsResponse, OrderStatus } from './types';

const OrderManagementApp: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка заказов
  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/order-management');
      if (!response.ok) throw new Error('Ошибк�� загрузки заказов');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка деталей заказа
  const loadOrderDetails = async (orderId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/order-management/${orderId}`);
      if (!response.ok) throw new Error('Ошибка загрузки деталей заказа');
      const data = await response.json();
      setSelectedOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Изменение статуса заказа
  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const response = await fetch(`/order-management/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Ошибка изменения статуса');
      
      // Обновить список заказов
      await loadOrders();
      
      // Если открыт детальный вид, обновить его тоже
      if (selectedOrder?.order.orderId === orderId) {
        await loadOrderDetails(orderId);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="order-management">
      <h1>Управление заказами</h1>
      
      {error && <div className="error">Ошибка: {error}</div>}
      
      <div className="content">
        <div className="orders-list">
          <h2>Список заказов</h2>
          {loading && <div>Загрузка...</div>}
          
          <table>
            <thead>
              <tr>
                <th>Номер партии</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Прогресс</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>{order.batchNumber}</td>
                  <td>{order.orderName}</td>
                  <td>{order.status}</td>
                  <td>{order.completionPercentage}%</td>
                  <td>
                    <button onClick={() => loadOrderDetails(order.orderId)}>
                      Подробнее
                    </button>
                    {order.status === 'APPROVED' && (
                      <button 
                        onClick={() => updateOrderStatus(order.orderId, 'LAUNCH_PERMITTED')}
                        className="btn-approve"
                      >
                        Разрешить к запуску
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {selectedOrder && (
          <div className="order-details">
            <h2>Детали заказа {selectedOrder.order.batchNumber}</h2>
            <div className="order-info">
              <p><strong>Название:</strong> {selectedOrder.order.orderName}</p>
              <p><strong>Статус:</strong> {selectedOrder.order.status}</p>
              <p><strong>Прогресс:</strong> {selectedOrder.order.completionPercentage}%</p>
            </div>
            
            <div className="packages">
              <h3>Упаковки и детали</h3>
              {selectedOrder.packages.map((pkg) => (
                <div key={pkg.packageId} className="package">
                  <h4>{pkg.packageName}</h4>
                  <p>Количество: {pkg.quantity}</p>
                  
                  <table>
                    <thead>
                      <tr>
                        <th>Код детали</th>
                        <th>Название</th>
                        <th>Количество</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.details.map((detail) => (
                        <tr key={detail.partId}>
                          <td>{detail.partCode}</td>
                          <td>{detail.partName}</td>
                          <td>{detail.totalQuantity}</td>
                          <td>{detail.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagementApp;
```

---

## Рекомендации по интеграции

1. **Обработка ошибок**: Всегда проверяйте статус ответа и обрабатывайте ошибки
2. **Загрузочные состояния**: Показывайте пользователю состояние загрузки
3. **WebSocket**: Используйте WebSocket для получения обновлений в реальн��м времени
4. **Типизация**: Используйте TypeScript для лучшей типизации
5. **Кэширование**: Рассмотрите возможность кэширования данных для улучшения производительности
6. **Оптимистичные обновления**: Обновляйте UI сразу, а затем с��нхронизируйте с сервером

Эта документация должна помочь фронтенд-разработчикам быстро интегрироваться с API модуля управления заказами.