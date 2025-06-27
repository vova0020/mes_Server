# Централизованная WebSocket архитектура

## Обзор

Эта архитектура централизует всю WebSocket логику в одном месте, обеспечивая:
- Типизированные события и комнаты
- Централизованное управление подписками
- Логирование и мониторинг
- Обратную совместимость

## Структура

```
websocket/
├── types/
│   └── rooms.types.ts          # Типы комнат и событий
├── services/
│   ├── events.service.ts       # Основной сервис событий
│   ├── room-manager.service.ts # Менеджер комнат
│   └── events-adapter.service.ts # Адаптер для обратной совместимости
├── events.gateway.ts           # WebSocket Gateway
├── websocket.module.ts         # Модуль
└── README.md                   # Эта документация
```

## Основные компон��нты

### 1. WebSocketRooms (enum)
Определяет все доступные комнаты:
- `PALLETS` - события паллет
- `MACHINES` - события машин  
- `MATERIALS` - события материалов
- `MATERIAL_GROUPS` - события групп материалов
- `BUFFERS` - события буферов
- `ORDERS` - события заказов
- `PACKAGING` - события упаковки
- `PRODUCTION` - события производства

### 2. RoomManagerService
Централизованное управление комнатами:
- Подключение/отключение клиентов
- Отслеживание активных подписок
- Статистика по комнатам
- Очистка неактивных подписок

### 3. EventsService
Типизированная отправка событий:
- `emitToRoom<T>()` - типизированная отправка в комнату
- `emitToRoomLegacy()` - для обратной совместимости
- `emitToAll()` - глобальная отправка
- `emitToClient()` - отправка конкретному клиенту

### 4. EventsGateway
WebSocket Gateway с поддержкой:
- Lifecycle методы (подключение/отключение)
- Универсальные обработчики (`joinRoom`, `leaveRoom`)
- Legacy обработчики для обратной совместимости
- Административные методы

## Использование

### Новый способ (рекомендуется)

```typescript
// В сервисе
constructor(private readonly eventsService: EventsService) {}

// Типизированная отправка события
this.eventsService.emitToRoom(WebSocketRooms.BUFFERS, 'bufferCreated', {
  buffer: newBuffer,
  timestamp: new Date().toISOString(),
});
```

### Клиентская сторона

```javascript
// Подключение к комнате (новый способ)
socket.emit('joinRoom', { room: 'buffers' });

// Legacy способ (все еще работает)
socket.emit('joinBuffersRoom');

// Получение событий
socket.on('bufferCreated', (data) => {
  console.log('Новый буфер создан:', data);
});
```

## Миграция

### Для существующих сервисов

1. **Добавить импорт типов:**
```typescript
import { WebSocketRooms } from '../../../websocket/types/rooms.types';
```

2. **Заменить вызовы:**
```typescript
// Старый способ
this.eventsService.emitToRoom('buffers', 'bufferCreated', data);

// Новый способ
this.eventsService.emitToRoom(WebSocketRooms.BUFFERS, 'bufferCreated', data);
```

### Обратная совместимость

Все старые вызовы продолжают работать благодаря `EventsAdapterService`. Миграция может происходить постепенно.

## События буферов

### Типы событий:
- `bufferCreated` - создание буфера
- `bufferUpdated` - обновление буфера  
- `bufferDeleted` - удаление буфера
- `bufferCopied` - копирование буфера
- `bufferCellCreated` - создание ячейки
- `bufferCellUpdated` - обновление ячейки
- `bufferCellDeleted` - удаление ячейки
- `bufferStageCreated` - создание связи с этапом
- `bufferStageDeleted` - удаление связи с этапом
- `bufferStagesUpdated` - обновление связей с этапами

## Мониторинг

### Получение статистики:
```javascript
// Клиент запрашивает статистику
socket.emit('getRoomStats');

// Получение ответа
socket.on('roomStats', (stats) => {
  console.log('Статистика комнат:', stats);
});
```

### Логирование
В��е действия логируются с эмодзи для удобства:
- 🔌 - подключения/отключения
- 📤 - отправка событий
- 👤 - действия клиентов
- 📊 - статистика
- ❌ - ошибки
- 🧹 - очистка

## Расширение

### Добавление новой комнаты:

1. **Добавить в enum:**
```typescript
export enum WebSocketRooms {
  // ...
  NEW_ROOM = 'newRoom',
}
```

2. **Добавить типы событий:**
```typescript
export interface RoomEvents {
  // ...
  [WebSocketRooms.NEW_ROOM]: {
    newEvent: {
      data: any;
      timestamp: string;
    };
  };
}
```

3. **Добавить обработчик в Gateway:**
```typescript
@SubscribeMessage('joinNewRoomRoom')
async handleJoinNewRoom(@ConnectedSocket() client: Socket) {
  await this.roomManager.joinRoom(client, WebSocketRooms.NEW_ROOM);
}
```

## Преимущества новой архитектуры

1. **Централизация** - вся WebSocket логика в одном месте
2. **Типизация** - TypeScript проверки для событий и комнат
3. **Мониторинг** - детальная статистика и логирование
4. **Масштабируемость** - легко д��бавлять новые комнаты и события
5. **Обратная совместимость** - старый код продолжает работать
6. **Производительность** - оптимизированная отправка событий
7. **Отладка** - подробные логи с эмодзи для удобства

## Следующие шаги

1. Постепенная миграция всех сервисов на новую систему
2. Добавление событий для других модулей (machines, materials, etc.)
3. Реализация продвинутых функций (фильтрация событий, персонализация)
4. Добавление метрик и аналитики