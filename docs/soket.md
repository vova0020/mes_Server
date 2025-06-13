# Документация по интеграции Socket.IO для фронтенда

## 📋 Обзор

Данная документация описывает интеграцию с Socket.IO сервером для получения обновлений в реальном времени по материалам и группам материалов в системе MES.

**Сервер:** `https://github.com/vova0020/mes_Server.git`

## 🔧 Настройка подключения


## 🏠 Доступные комнаты (Rooms)

### Подключение к комнатам

```javascript
// Подключение к комнате материалов
socket.emit('joinMaterialsRoom');

// Подключение к комнате групп материалов
socket.emit('joinMaterialGroupsRoom');
```

## 📡 События материалов (Materials Events)

### Подписка на события материалов

```javascript
// Создание нового материала
socket.on('materialCreated', (data) => {
  console.log('Создан новый материал:', data);
  /*
  Структура data:
  {
    material: {
      materialId: number,
      materialName: string,
      article: string,
      unit: string,
      groups: Array<{
        groupId: number,
        groupName: string
      }>
    },
    timestamp: string (ISO)
  }
  */
  
  // Обновите список материалов в UI
  updateMaterialsList(data.material);
});

// Обновление материала
socket.on('materialUpdated', (data) => {
  console.log('Материал обновлен:', data);
  /*
  Структура data: такая же как у materialCreated
  */
  
  // Обновите конкретный материал в UI
  updateMaterialInList(data.material);
});

// Удаление материала
socket.on('materialDeleted', (data) => {
  console.log('Материал удален:', data);
  /*
  Структура data:
  {
    materialId: number,
    materialName: string,
    timestamp: string (ISO)
  }
  */
  
  // Удалите материал из UI
  removeMaterialFromList(data.materialId);
});

// Привязка материала к группе
socket.on('materialLinkedToGroup', (data) => {
  console.log('Материал привязан к группе:', data);
  /*
  Структура data:
  {
    groupId: number,
    materialId: number,
    groupName: string,
    materialName: string,
    timestamp: string (ISO)
  }
  */
  
  // Обновите связи материала с группами
  updateMaterialGroupLinks(data);
});

// Отвязка материала от группы
socket.on('materialUnlinkedFromGroup', (data) => {
  console.log('Материал отвязан от группы:', data);
  // Структура data: такая же как у materialLinkedToGroup
  
  // Обновите связи материала с группами
  updateMaterialGroupLinks(data);
});
```

## 📦 События групп материалов (Material Groups Events)

### Подписка на события групп материалов

```javascript
// Создание новой группы материалов
socket.on('materialGroupCreated', (data) => {
  console.log('Создана новая группа материалов:', data);
  /*
  Структура data:
  {
    group: {
      groupId: number,
      groupName: string,
      materialsCount: number
    },
    timestamp: string (ISO)
  }
  */
  
  // Обновите список групп в UI
  updateGroupsList(data.group);
});

// Обновление группы материалов
socket.on('materialGroupUpdated', (data) => {
  console.log('Группа материалов обновлена:', data);
  /*
  Структура data: такая же как у materialGroupCreated
  */
  
  // Обновите конкретную группу в UI
  updateGroupInList(data.group);
});

// Удаление группы материалов
socket.on('materialGroupDeleted', (data) => {
  console.log('Группа материалов удалена:', data);
  /*
  Структура data:
  {
    groupId: number,
    groupName: string,
    timestamp: string (ISO)
  }
  */
  
  // Удалите группу из UI
  removeGroupFromList(data.groupId);
});
```

