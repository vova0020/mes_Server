
# Справка по API управления пользователями
> **Базовый URL:** `http://localhost:5000` (или ваш сервер)
## Базовый URL
```
/settings/users
```

## 1. CRUD операции с пользователями

### 1.1 Создание пользователя
```http
POST /settings/users
```

**Тело запроса:**
```json
{
  "login": "string",          // min 3 символа
  "password": "string",       // min 6 символов
  "firstName": "string",
  "lastName": "string",
  "phone": "string",         // опционально
  "position": "string",      // опционально
  "salary": "number"         // опционально
}
```

**Ответ (201):**
```json
{
  "userId": 1,
  "login": "testuser",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "userDetail": {
    "firstName": "Иван",
    "lastName": "Иванов",
    "phone": "+7123456789",
    "position": "Оператор",
    "salary": 50000
  }
}
```

### 1.2 Получение всех пользователей
```http
GET /settings/users
```

**Ответ (200):** Массив объектов пользователей

### 1.3 Получение пользователя по ID
```http
GET /settings/users/:userId
```

**Ответ (200):** Объект пользователя

### 1.4 Обновление пользователя
```http
PUT /settings/users/:userId
```

**Тело запроса:** Все поля опциональны
```json
{
  "login": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "position": "string",
  "salary": "number"
}
```

### 1.5 Удаление пользователя
```http
DELETE /settings/users/:userId
```

**Ответ (204):** Пустой ответ

## 2. Управление глобальными ролями

### 2.1 Назначение глобальной роли
```http
POST /settings/users/roles/global
```

**Тело запроса:**
```json
{
  "userId": 1,
  "role": "admin"  // см. доступные роли ниже
}
```

### 2.2 Удаление глобальной роли
```http
DELETE /settings/users/roles/global/:userId/:role
```

## 3. Управление контекстными привязками

### 3.1 Создание контекстной привязки
```http
POST /settings/users/roles/bindings
```

**Тело запроса:**
```json
{
  "userId": 1,
  "role": "operator",
  "contextType": "STAGE_LEVEL1",  // MACHINE | STAGE_LEVEL1 | ORDER_PICKER
  "contextId": 5
}
```

### 3.2 Удаление контекстной привязки
```http
DELETE /settings/users/roles/bindings/:bindingId
```

## 4. Получение информации о ролях

### 4.1 Получение ролей пользователя
```http
GET /settings/users/:userId/roles
```

**Ответ (200):**
```json
{
  "userId": 1,
  "globalRoles": ["admin", "technologist"],
  "roleBindings": [
    {
      "id": 1,
      "role": "operator",
      "contextType": "STAGE_LEVEL1",
      "contextId": 5,
      "contextName": "Механическая обработка"
    }
  ]
}
```

### 4.2 Получение доступных ролей
```http
GET /settings/users/roles/available
```

**Ответ (200):**
```json
{
  "roles": [
    "admin",
    "management", 
    "technologist",
    "master",
    "operator",
    "orderPicker",
    "workplace"
  ]
}
```

## 5. Вспомогательные эндпоинты

### 5.1 Получение станков для привязки
```http
GET /settings/users/context/machines
```

**Ответ (200):**
```json
{
  "machines": [
    {
      "machineId": 1,
      "machineName": "Станок ЧПУ-001"
    }
  ]
}
```

### 5.2 Получение этапов для привязки
```http
GET /settings/users/context/stages
```

**Ответ (200):**
```json
{
  "stages": [
    {
      "stageId": 1,
      "stageName": "Механическая обработка"
    }
  ]
}
```

### 5.3 Получение комплектовщиков для привязки
```http
GET /settings/users/context/pickers
```

**Ответ (200):**
```json
{
  "pickers": [
    {
      "pickerId": 1,
      "pickerName": "Иван Иванов"
    }
  ]
}
```

## 6. Типы ролей и контекстов

### Типы ролей (UserRoleType)
- `admin` - Администратор
- `management` - Менеджмент  
- `technologist` - Технолог
- `master` - Мастер
- `operator` - Оператор
- `orderPicker` - Комплектовщик заказов
- `workplace` - Рабочее место

### Типы контекстов (RoleContextType)
- `MACHINE` - Станок (для роли `workplace`)
- `STAGE_LEVEL1` - Этап 1-го уровня (для ролей `master`, `operator`)
- `ORDER_PICKER` - Комплектовщик (для роли `orderPicker`)

## 7. Socket.IO обновления

### Подключение к Socket.IO
```javascript
import io from 'socket.io-client';
const socket = io('ws://localhost:3000');
```

### События пользователей

#### 7.1 Создание пользователя
```javascript
socket.on('user:created', (data) => {
  console.log('Новый пользователь создан:', data);
  // data: { userId, login, firstName, lastName }
});
```

#### 7.2 Обновление пользователя
```javascript
socket.on('user:updated', (data) => {
  console.log('Пользователь обновлен:', data);
  // data: { userId, login }
});
```

#### 7.3 Удаление пользователя
```javascript
socket.on('user:deleted', (data) => {
  console.log('Пользователь удален:', data);
  // data: { userId, login }
});
```

#### 7.4 Назначение глобальной роли
```javascript
socket.on('user:role:assigned', (data) => {
  console.log('Роль назначена:', data);
  // data: { userId, role, type: 'global' }
});
```

#### 7.5 Удаление глобальной роли
```javascript
socket.on('user:role:removed', (data) => {
  console.log('Роль удалена:', data);
  // data: { userId, role, type: 'global' }
});
```

#### 7.6 Создание контекстной привязки
```javascript
socket.on('user:role:binding:created', (data) => {
  console.log('Контекстная привязка создана:', data);
  // data: { userId, role, contextType, contextId }
});
```

#### 7.7 Удаление контекстной привязки
```javascript
socket.on('user:role:binding:removed', (data) => {
  console.log('Контекстная привязка удалена:', data);
  // data: { bindingId, userId, role, contextType, contextId }
});
```

## 8. Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверные данные в запросе |
| 404 | Пользователь/роль/привязка не найдены |
| 409 | Конфликт (логин занят, роль уже назначена) |


