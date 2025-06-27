# WebSocket API Документация

## Подключение

**URL:** `ws://localhost:5000` (или ваш домен)

**Библиотека:** Socket.IO Client

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  transports: ['websocket']
});
```

## Системные события

### При подключении
```javascript
socket.on('connect', () => {
  console.log('Подключен к серверу');
});

// Сервер автоматически отправляет список доступных комнат
socket.on('roomsAvailable', (data) => {
  console.log('Доступные комнаты:', data.rooms);
});
```

### Управление комнатами

#### Присоединиться к комнате
```javascript
socket.emit('joinRoom', { room: 'settings-machines' });

socket.on('roomJoined', (data) => {
  console.log(`Присоединился к комнате: ${data.room}`);
});
```

#### Покинуть комнату
```javascript
socket.emit('leaveRoom', { room: 'settings-machines' });

socket.on('roomLeft', (data) => {
  console.log(`Покинул комнату: ${data.room}`);
});
```

#### Получить мои комнаты
```javascript
socket.emit('getMyRooms');

socket.on('myRooms', (data) => {
  console.log('Мои комнаты:', data.rooms);
});
```

#### Статистика комнат
```javascript
socket.emit('getRoomStats');

socket.on('roomStats', (data) => {
  console.log('Статистика:', data);
});
```

#### Ping/Pong
```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Pong:', data.timestamp);
});
```

## Комнаты и события

### 1. Настройки машин (`settings-machines`)

**События:**
- `machineCreated` - машина создана
- `machineUpdated` - машина обновлена
- `machineDeleted` - машина удалена
- `machineStatusChanged` - статус машины изменен
- `machineStarted` - машина запущена
- `machineStopped` - машина остановлена
- `machineError` - ошибка машины
- `machineStageAdded` - этап добавлен к машине
- `machineStageRemoved` - этап удален из машины
- `machineSubstageAdded` - подэтап добавлен к машине
- `machineSubstageRemoved` - подэтап удален из машины

### 2. Настройки материалов (`settings-materials`)

**События:**
- `materialCreated` - материал создан
- `materialUpdated` - материал обновлен
- `materialDeleted` - материал удален
- `materialStockChanged` - остаток материала изменен
- `materialLinkedToGroup` - материал привязан к группе
- `materialUnlinkedFromGroup` - материал отвязан от группы

### 3. Группы материалов (`settings-materialGroups`)

**События:**
- `materialGroupCreated` - группа создана
- `materialGroupUpdated` - группа обновлена
- `materialGroupDeleted` - группа удалена
- `materialLinkedToGroup` - материал привязан к группе
- `materialUnlinkedFromGroup` - материал отвязан от группы

### 4. Настройки буферов (`settings-buffers`)

**События:**
- `bufferCreated` - буфер создан
- `bufferUpdated` - буфер обновлен
- `bufferDeleted` - буфер удален
- `bufferCopied` - буфер скопирован
- `bufferCellCreated` - ячейка буфера создана
- `bufferCellUpdated` - ячейка буфера обновлена
- `bufferCellDeleted` - ячейка буфера удалена
- `bufferStageCreated` - этап буфера создан
- `bufferStageDeleted` - этап буфера удален
- `bufferStagesUpdated` - этапы буфера обновлены

### 5. Производственные линии (`settings-production-lines`)

**События:**
- `lineCreated` - линия создана
- `lineUpdated` - линия обновлена
- `lineDeleted` - линия удалена
- `stageLinkedToLine` - этап привязан к линии
- `stageUnlinkedFromLine` - этап отвязан от линии
- `materialLinkedToLine` - материал привязан к линии
- `materialUnlinkedFromLine` - материал отвязан от линии
- `lineMaterialsUpdated` - материалы линии обновлены
- `lineStagesUpdated` - этапы линии обновлены

### 6. Производственные этапы (`settings-production-stages`)

**События:**
- `stageLevel1Created` - этап 1-го уровня создан
- `stageLevel1Updated` - этап 1-го уровня обновлен
- `stageLevel1Deleted` - этап 1-го уровня удален
- `stageLevel2Created` - этап 2-го уровня создан
- `stageLevel2Updated` - этап 2-го уровня обновлен
- `stageLevel2Deleted` - этап 2-го уровня удален
- `substageLinkedToStage` - подэтап привязан к этапу
- `stageLevel2Rebound` - подэтап переназначен

### 7. Маршруты (`routes`)

**События:**
- `routeCreated` - маршрут создан
- `routeUpdated` - маршрут обновлен
- `routeDeleted` - маршрут удален
- `routeCopied` - маршрут скопирован
- `routeStageCreated` - этап маршрута создан
- `routeStageUpdated` - этап маршрута обновлен
- `routeStageDeleted` - этап маршрута удален
- `routeStagesReordered` - этапы маршрута переупорядочены
- `routeStageMoved` - этап маршрута перемещен

### 8. Пользователи (`settings-user`)

**События:**
- `userCreated` - пользователь создан
- `userUpdated` - пользователь обновлен
- `userDeleted` - пользователь удален
- `userRoleAssigned` - роль назначена пользователю
- `userRoleRemoved` - роль удалена у пользователя
- `userRoleBindingCreated` - привязка роли создана
- `userRoleBindingRemoved` - привязка роли удалена
- `pickerCreated` - комплектовщик создан
- `pickerUpdated` - комплектовщик обновлен
- `pickerDeleted` - комплектовщик удален

### 9. Производственные машины (`product-machines`)

**События:**
- `machineStatusUpdated` - статус машины обновлен

### 10. Паллеты (`pallets`)

**События:**
- `palletCreated` - паллета создана
- `palletUpdated` - паллета обновлена
- `palletDeleted` - паллета удалена
- `palletMoved` - паллета перемещена

## Структура данных событий

Все события содержат поле `timestamp` с временной меткой в формате ISO.

### Примеры структур данных:

#### Создание машины
```javascript
socket.on('machineCreated', (data) => {
  // data.machine - объект машины
  // data.timestamp - время события
});
```

#### Обновление матери��ла
```javascript
socket.on('materialUpdated', (data) => {
  // data.material - обновленный объект материала
  // data.timestamp - время события
});
```

#### Удаление буфера
```javascript
socket.on('bufferDeleted', (data) => {
  // data.bufferId - ID удаленного буфера
  // data.bufferName - название удаленного буфера
  // data.timestamp - время события
});
```

#### Изменение остатка материала
```javascript
socket.on('materialStockChanged', (data) => {
  // data.materialId - ID материала
  // data.materialName - название материала
  // data.oldStock - старый остаток
  // data.newStock - новый остаток
  // data.timestamp - время события
});
```

#### Обновление статуса производственной машины
```javascript
socket.on('machineStatusUpdated', (data) => {
  // data.machine.id - ID машины
  // data.machine.name - название машины
  // data.machine.status - статус машины
  // data.machine.recommendedLoad - рекомендуемая нагрузка (опционально)
  // data.machine.noShiftAssignment - без назначения смены (опционально)
  // data.machine.segmentId - ID сегмента (опционально)
  // data.machine.segmentName - название сегмента (опционально)
  // data.timestamp - время события
});
```

## Обработка ошибок

```javascript
socket.on('error', (error) => {
  console.error('WebSocket ошибка:', error.message);
  if (error.availableRooms) {
    console.log('Доступные комнаты:', error.availableRooms);
  }
});
```

## Пример полной интеграции

```javascript
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = io('ws://localhost:3000');
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Подключен к WebSocket');
    });

    this.socket.on('roomsAvailable', (data) => {
      console.log('Доступные комнаты:', data.rooms);
    });

    this.socket.on('error', (error) => {
      console.error('Ошибка:', error);
    });
  }

  joinRoom(room) {
    this.socket.emit('joinRoom', { room });
  }

  leaveRoom(room) {
    this.socket.emit('leaveRoom', { room });
  }

  subscribeToMachines(callback) {
    this.joinRoom('settings-machines');
    
    this.socket.on('machineCreated', callback);
    this.socket.on('machineUpdated', callback);
    this.socket.on('machineDeleted', callback);
    this.socket.on('machineStatusChanged', callback);
  }

  subscribeToMaterials(callback) {
    this.joinRoom('settings-materials');
    
    this.socket.on('materialCreated', callback);
    this.socket.on('materialUpdated', callback);
    this.socket.on('materialDeleted', callback);
    this.socket.on('materialStockChanged', callback);
  }
}

// Использование
const wsService = new WebSocketService();

wsService.subscribeToMachines((data) => {
  console.log('Событие машины:', data);
});

wsService.subscribeToMaterials((data) => {
  console.log('Событие материала:', data);
});
```