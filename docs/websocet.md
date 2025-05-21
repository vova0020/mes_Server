
# Руководство по подключению к WebSocket

## Общая информация

Наш бэкенд использует Socket.IO для обеспечения двусторонней связи между клиентом и сервером. Это позволяет в реальном времени получать обновления данных без необходимости постоянного опроса сервера.

## Установка необходимых зависимостей

Для работы с Socket.IO на фронтенде необходимо установить клиентскую библиотеку Socket.IO:

```bash
npm install socket.io-client
```

## Базовое подключение

```typescript
import { io } from 'socket.io-client';

// Создаем подключение к серверу
const socket = io('http://your-server-url'); // Замените на адрес вашего сервера

// Обработчик события подключения
socket.on('connect', () => {
  console.log('Соединение с сервером установлено');
});

// Обработчик события отключения
socket.on('disconnect', () => {
  console.log('Соединение с сервером разорвано');
});
```

## Присоединение к комнатам

Сервер поддерживает основные комнаты для различных типов сообщений:
- `machines` - для уведомлений о событиях, связанных со станками

После установления соединения необходимо присоединиться к нужным комнатам:

```typescript

// Присоединяемся к комнате для обновлений станков
socket.emit('joinMachinesRoom');
```

## Прослушивание событий


### События, связанные со станками

1. **updateStatus** - событие, которое отправляется при изменении статуса станка

```typescript
socket.on('updateStatus', (machine) => {
  console.log('Изменился статус станка:', machine);
  // Обновите ваш интерфейс с полученными данными о станке
  // machine содержит информацию о станке:
  // - id: идентификатор станка
  // - name: название станка
  // - status: новый статус станка
});
```


## Обработка ошибок соединения

```typescript
socket.on('connect_error', (error) => {
  console.error('Ошибка подключения:', error);
  // Добавьте логику повторного подключения или отображения ошибки пользователю
});
```

## Рекомендации по использованию

1. **Переподключение**: Настройте автоматическое переподключение в случае разрыва соединения:

```typescript
const socket = io('http://your-server-url', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

2. **Отображение статуса соединения**: Информируйте пользователя о статусе соединения с сервером.

3. **Обработка промежуточных состояний**: Учитывайте, что между событиями могут быть промежуточные состояния, когда данные еще не обновились.

## Пример полной интеграции с отслеживанием статусов станков

```typescript
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Компонент для работы с WebSocket
const WebSocketComponent: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [palletsData, setPalletsData] = useState([]);
  const [machinesData, setMachinesData] = useState({});

  useEffect(() => {
    // Инициализируем соединение
    const socketInstance = io('http://your-server-url');
    setSocket(socketInstance);

    // Обработчики событий
    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      
      // Присоединяемся к комнатам
      socketInstance.emit('joinPalletsRoom');
      socketInstance.emit('joinMachinesRoom');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Обрабатываем события, связанные с поддонами
    socketInstance.on('startWork', (data) => {
      console.log('Pallet started processing:', data);
      // Обновляем состояние с учетом полученных данных
      setPalletsData(prevData => updatePalletData(prevData, data));
    });

    // Обрабатываем события обновления статуса станков
    socketInstance.on('updateStatus', (machine) => {
      console.log('Machine status updated:', machine);
      setMachinesData(prevData => ({
        ...prevData,
        [machine.id]: machine
      }));
    });

    // Очищаем при размонтировании
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Функция для обновления данных о поддонах
  const updatePalletData = (prevData, newData) => {
    // Ваша логика обновления данных
    return [...prevData]; // Пример, нужно изменить под вашу структуру данных
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Ваши компоненты, использующие данные о поддонах */}
      
      {/* Компоненты для отображения статусов станков */}
      <div>
        <h2>Machines Status</h2>
        {Object.values(machinesData).map((machine: any) => (
          <div key={machine.id}>
            {machine.name}: {machine.status}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebSocketComponent;
```

## Особенности текущей реализации на бэкенде

На бэкенде используется NestJS с WebSocketGateway для обработки WebSocket соединений. Основные события:

2. Сервер отправляет событие `updateStatus` при изменении статуса станка.
3. На сервере определены  комнаты:  `machines`.
5. Комната `machines` предназначена для событий, связанных со станками.

