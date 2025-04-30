# Документация по API авторизации (обновленная)

## Оглавление
1. [Общая информация](#общая-информация)
2. [Авторизация](#авторизация)
   - [Вход в систему](#вход-в-систему)
   - [Структура ответа авторизации](#структура-ответа-авторизации)
   - [Структура JWT-токена](#структура-jwt-токена)
3. [Привязки пользователей](#привязки-пользователей)
   - [Операторы и станки](#операторы-и-станки)
   - [Мастера и участки](#мастера-и-участки)
   - [Администраторы](#администраторы)
4. [Использование токена для защищенных запросов](#использование-токена-для-защищенных-запросов)
5. [Обработка ошибок](#обработка-ошибок)
6. [Примеры интеграции](#примеры-и��теграции)
   - [Авторизация и получение привязок](#авторизация-и-получение-привязок)
   - [Направление пользователя на нужную страницу](#направление-пользователя-на-нужную-страницу)

## Общая информация

API авторизации позволяет выполнять вход пользователей в систему, получать JWT-токен и информацию о привязках пользователя к объектам системы (станкам, участкам), в зависимости от роли пользователя.

**Базовый URL API**: `https://your-api-domain.com/api`

## Авторизация

### Вход в систему

**Эндпоинт**: `POST /auth/login`

**Описание**: Аутентифицирует пользователя и возвращает JWT-токен, а также информацию о привязках пользователя.

**Тело запроса**:
```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**Параметры запроса**:
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| username | string | Да | Имя пользователя |
| password | string | Да | Пароль пользователя |

### Структура ответа авторизации

**Ответ в случае успеха (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 10,
    "username": "operator1",
    "role": "operator",
    "fullName": "Иванов Иван Иванович"
  },
  "assignments": {
    "machines": [
      {
        "id": 3,
        "name": "Присадка-В1",
        "status": "ACTIVE",
        "segmentId": 2,
        "segmentName": "Участок присадки"
      }
    ]
  }
}
```

**Для мастера будет возвращен другой формат assignments**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "master1",
    "role": "master",
    "fullName": "Петров Петр Петрович"
  },
  "assignments": {
    "segments": [
      {
        "id": 2,
        "name": "Участок присадки",
        "lineId": 1,
        "lineName": "Основная линия"
      }
    ]
  }
}
```

**Для администратора**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "Администратор Системы"
  },
  "assignments": {}
}
```

**Ошибки**:
- `401 Unauthorized` - Неверные учетные данные.

### Структура JWT-токена

JWT-токен содержит закодированную информацию о пользователе. После декодирования, токен содержит следующие ключевые поля в разделе payload:

```json
{
  "sub": 123,         // ID пользователя
  "username": "user123", // Имя пользователя
  "role": "operator",  // Роль пользователя (operator, admin, master и т.д.)
  "iat": 1516239022,   // Время выдачи токена (Unix timestamp)
  "exp": 1516242622    // Время истечения токена (Unix timestamp)
}
```

**Важно**: Токен действителен в течение 1 часа с момента выдачи. После истечения срока действия, необходимо выполнить повторную аутентификацию.

## Привязки пользователей

### Операторы и станки

Операторы привязаны к конкретным станкам. При авторизации пользователя с ролью `operator`, в поле `assignments.machines` будет возвращен массив станков, к которым привязан оператор.

Каждый элемент массива `machines` содержит:
- `id` - идентификатор станка
- `name` - название станка
- `status` - статус станка (ACTIVE, INACTIVE, MAINTENANCE)
- `segmentId` - идентификатор участка, к которому относится станок
- `segmentName` - название участка

### Мастера и участки

Мастера контролируют целые производственные участки. При авторизации пользователя с ролью `master`, в поле `assignments.segments` будет возвращен массив участков, которые контролирует мастер.

Каждый элемент массива `segments` содержит:
- `id` - идентификатор участка
- `name` - название участка
- `lineId` - идентификатор производственной линии
- `lineName` - название производственной линии

### Администраторы

Администраторы имеют полный доступ ко всем ресурсам системы, поэтому для них поле `assignments` может быть пустым или содержать дополнительную информацию в зависимости от настроек системы.

## Использование токена для защищенных запросов

После получения JWT-токена, его необходимо включать в заголовок `Authorization` для всех последующих запросов к защищенным эндпоинтам API:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Пример запроса с использованием токена**:
```javascript
// Пример запроса с использованием Fetch API
const response = await fetch('https://your-api-domain.com/api/protected-resource', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Обработка ошибок

При взаимодействии с API авторизации могут возникать следующие ошибки:

### 1. Неверные учетные данные (401 Unauthorized)

```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные.",
  "error": "Unauthorized"
}
```

### 2. Отсутствие или недействительный токен (401 Unauthorized)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 3. Недостаточно прав для доступа к ресурсу (403 Forbidden)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

## Примеры интеграции

### Авторизация и получение привязок

```javascript
// React/JavaScript приме��

async function login(username, password) {
  try {
    const response = await fetch('https://your-api-domain.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка авторизации');
    }

    const authData = await response.json();
    
    // Сохраняем токен в localStorage
    localStorage.setItem('authToken', authData.token);
    
    // Сохраняем информацию о пользователе
    localStorage.setItem('userInfo', JSON.stringify(authData.user));
    
    // Сохраняем информацию о привязках
    localStorage.setItem('userAssignments', JSON.stringify(authData.assignments));
    
    // Декодируем JWT для получения срока действия
    const payload = JSON.parse(atob(authData.token.split('.')[1]));
    const tokenExpires = new Date(payload.exp * 1000);
    
    return {
      user: authData.user,
      assignments: authData.assignments,
      tokenExpires
    };
  } catch (error) {
    console.error('Ошибка при входе:', error);
    throw error;
  }
}
```

### Направление пользователя на нужную страницу

```javascript
// Пример функции для определения начальной страницы после входа

function determineHomePage(user, assignments) {
  // Проверяем роль пользователя
  switch (user.role.toLowerCase()) {
    case 'admin':
      // Администраторы направляются на панель администратора
      return '/admin-panel';
      
    case 'master':
      // Проверяем, есть ли у мастера привязанные участки
      if (assignments.segments && assignments.segments.length > 0) {
        // Если есть только один участок, направляем сразу на него
        if (assignments.segments.length === 1) {
          const segmentId = assignments.segments[0].id;
          return `/production-segments/${segmentId}`;
        } else {
          // Если участков несколько, направляем на страницу выбора участка
          return '/select-segment';
        }
      } else {
        // Если привязанных участков нет, направляем на страницу по умолчанию
        return '/dashboard';
      }
      
    case 'operator':
      // Проверяем, есть ли у оператора привязанные станки
      if (assignments.machines && assignments.machines.length > 0) {
        // Если есть только один станок, направляем сразу на него
        if (assignments.machines.length === 1) {
          const machineId = assignments.machines[0].id;
          return `/machines/${machineId}`;
        } else {
          // Если станков несколько, направляем на страницу выбора станка
          return '/select-machine';
        }
      } else {
        // Если привязанных станков нет, направляем на страницу по умолчанию
        return '/dashboard';
      }
      
    default:
      // По умолчанию направляем на общую панель мониторинга
      return '/dashboard';
  }
}

// Пример использования в React-приложении
function handleSuccessfulLogin(loginData) {
  const { user, assignments } = loginData;
  
  // Определяем нужную страницу
  const homePage = determineHomePage(user, assignments);
  
  // Перенаправляем пользователя
  navigate(homePage);
}
```

## Заключение

Обновленное API авторизации теперь предоставляет не только токен доступа, но и подробную информацию о привязках пользователя в системе. Это позволяет фронтенд-приложению сразу определить, на какую страницу следует направить пользователя и какие данные ему необходимо отображать.

Для корректной работы с API, фронтенд-разработчикам рекомендуется:

1. Сохранять полученные привязки в хранилище (localStorage, sessionStorage или state management system)
2. Использовать эти данные для динамического формирования навигации и маршрутизации
3. Обрабатывать ситуации, когда у пользователя нет привязок или есть множественные привязки

В случае возникновения вопросов обращайтесь к разработчикам бэкенда.