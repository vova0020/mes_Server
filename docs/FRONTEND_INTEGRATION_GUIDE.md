# Руководство по интеграции фронтенда с системой привязки операторов

## 📋 Содержание
1. [Применение изменений БД](#применение-изменений-бд)
2. [API эндпоинты](#api-эндпоинты)
3. [Типы данных TypeScript](#типы-данных-typescript)
4. [Примеры использования](#примеры-использования)
5. [Компоненты React](#компоненты-react)
6. [WebSocket интеграция](#websocket-интеграция)
7. [Обработка ошибок](#обработка-ошибок)

---

## Применение изменений БД

### Для существующей базы данных (production)

```bash
# 1. Создать миграцию вручную
npx prisma migrate dev --name add_operator_machine_bindings --create-only

# 2. Применить миграцию
npx prisma migrate deploy

# 3. Сгенерировать Prisma Client
npx prisma generate

# 4. Запустить скрипт генерации кодов
npx ts-node prisma/generate-machine-codes.ts
```

### Альтернативный способ (если миграция не работает)

Выполните SQL напрямую в базе данных:

```sql
-- Добавить поле machine_code
ALTER TABLE machines ADD COLUMN machine_code TEXT;

-- Создать уникальный индекс
CREATE UNIQUE INDEX machines_machine_code_key ON machines(machine_code);

-- Создать таблицу привязок
CREATE TABLE operator_machine_bindings (
    binding_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    operator_number INTEGER NOT NULL,
    bound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unbound_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT operator_machine_bindings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT operator_machine_bindings_machine_id_fkey 
        FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
);

-- Создать индексы
CREATE INDEX operator_machine_bindings_user_id_idx 
    ON operator_machine_bindings(user_id);
    
CREATE INDEX operator_machine_bindings_machine_id_is_active_idx 
    ON operator_machine_bindings(machine_id, is_active);
    
CREATE INDEX operator_machine_bindings_machine_id_operator_number_is_act_idx 
    ON operator_machine_bindings(machine_id, operator_number, is_active);
```

Затем:
```bash
# Обновить Prisma Client
npx prisma generate

# Сгенерировать коды станков
npx ts-node prisma/generate-machine-codes.ts
```

---

## API эндпоинты

### Base URL
```
http://localhost:5004/api/operators/bindings
```

### 1. Проверить статус привязки оператора

**GET** `/status?userId={userId}`

**Пример:**
```typescript
const userId = 123;
const response = await fetch(
  `http://localhost:5004/api/operators/bindings/status?userId=${userId}`
);
const data = await response.json();
```

**Ответ (привязан):**
```json
{
  "isBound": true,
  "machine": {
    "machineId": 5,
    "machineName": "Станок раскроя №1",
    "machineCode": "H431",
    "operatorNumber": 1,
    "boundAt": "2026-08-18T08:00:00.000Z"
  },
  "otherOperators": [
    {
      "userId": 124,
      "operatorNumber": 2,
      "firstName": "Иван",
      "lastName": "Петров",
      "position": "Оператор",
      "boundAt": "2026-08-18T08:15:00.000Z"
    }
  ]
}
```

**Ответ (не привязан):**
```json
{
  "isBound": false
}
```

---

### 2. Привязать оператора к станку

**POST** `/bind`

**Body:**
```json
{
  "userId": 123,
  "machineCode": "H431"
}
```

**Пример:**
```typescript
const response = await fetch('http://localhost:5004/api/operators/bindings/bind', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 123,
    machineCode: 'H431'
  })
});

const data = await response.json();
```

**Успешный ответ:**
```json
{
  "success": true,
  "message": "Успешно привязан к станку \"Станок раскроя №1\" как оператор №1",
  "binding": {
    "bindingId": 456,
    "machineId": 5,
    "machineName": "Станок раскроя №1",
    "machineCode": "H431",
    "operatorNumber": 1,
    "boundAt": "2026-08-18T08:00:00.000Z"
  },
  "otherOperators": []
}
```

**Ошибки:**
- `404` - Станок с кодом не найден
- `404` - Пользователь не найден
- `409` - Оператор уже привязан к другому станку

---

### 3. Отвязать оператора от станка

**POST** `/unbind`

**Body:**
```json
{
  "userId": 123,
  "machineId": 5
}
```

**Пример:**
```typescript
const response = await fetch('http://localhost:5004/api/operators/bindings/unbind', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 123,
    machineId: 5
  })
});

const data = await response.json();
```

**Успешный ответ:**
```json
{
  "success": true,
  "message": "Успешно отвязан от станка",
  "unboundAt": "2026-08-18T16:00:00.000Z"
}
```

---

### 4. Получить список операторов на станке

**GET** `/machine?machineId={machineId}&activeOnly={true|false}`

**Пример:**
```typescript
const machineId = 5;
const response = await fetch(
  `http://localhost:5004/api/operators/bindings/machine?machineId=${machineId}&activeOnly=true`
);
const data = await response.json();
```

**Ответ:**
```json
{
  "machineId": 5,
  "machineName": "Станок раскроя №1",
  "machineCode": "H431",
  "activeOperators": [
    {
      "userId": 123,
      "operatorNumber": 1,
      "firstName": "Петр",
      "lastName": "Сидоров",
      "position": "Старший оператор",
      "boundAt": "2026-08-18T08:00:00.000Z"
    },
    {
      "userId": 124,
      "operatorNumber": 2,
      "firstName": "Иван",
      "lastName": "Петров",
      "position": "Оператор",
      "boundAt": "2026-08-18T08:15:00.000Z"
    }
  ],
  "totalActive": 2
}
```

---

## Типы данных TypeScript

```typescript
// Статус привязки оператора
interface OperatorBindingStatus {
  isBound: boolean;
  machine?: {
    machineId: number;
    machineName: string;
    machineCode: string;
    operatorNumber: number;
    boundAt: string; // ISO date string
  };
  otherOperators?: BoundOperatorInfo[];
}

// Информация об операторе
interface BoundOperatorInfo {
  userId: number;
  operatorNumber: number;
  firstName: string;
  lastName: string;
  position?: string;
  boundAt: string; // ISO date string
}

// Ответ при привязке
interface BindOperatorResponse {
  success: boolean;
  message: string;
  binding: {
    bindingId: number;
    machineId: number;
    machineName: string;
    machineCode: string;
    operatorNumber: number;
    boundAt: string;
  };
  otherOperators: BoundOperatorInfo[];
}

// Ответ при отвязке
interface UnbindOperatorResponse {
  success: boolean;
  message: string;
  unboundAt: string;
}

// Список операторов на станке
interface MachineBindingsResponse {
  machineId: number;
  machineName: string;
  machineCode: string;
  activeOperators: BoundOperatorInfo[];
  totalActive: number;
}
```

---

## Примеры использования

### Сервис для работы с привязками (TypeScript)

```typescript
// services/operatorBindingService.ts

const API_BASE = 'http://localhost:5004/api/operators/bindings';

export class OperatorBindingService {
  /**
   * Проверить статус привязки оператора
   */
  static async getBindingStatus(userId: number): Promise<OperatorBindingStatus> {
    const response = await fetch(`${API_BASE}/status?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения статуса привязки');
    }
    
    return response.json();
  }

  /**
   * Привязать оператора к станку по коду
   */
  static async bindToMachine(
    userId: number, 
    machineCode: string
  ): Promise<BindOperatorResponse> {
    const response = await fetch(`${API_BASE}/bind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, machineCode })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка привязки к станку');
    }

    return data;
  }

  /**
   * Отвязать оператора от станка
   */
  static async unbindFromMachine(
    userId: number, 
    machineId: number
  ): Promise<UnbindOperatorResponse> {
    const response = await fetch(`${API_BASE}/unbind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, machineId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка отвязки от станка');
    }

    return data;
  }

  /**
   * Получить список операторов на станке
   */
  static async getMachineOperators(
    machineId: number, 
    activeOnly: boolean = true
  ): Promise<MachineBindingsResponse> {
    const response = await fetch(
      `${API_BASE}/machine?machineId=${machineId}&activeOnly=${activeOnly}`
    );

    if (!response.ok) {
      throw new Error('Ошибка получения списка операторов');
    }

    return response.json();
  }
}
```

---

## Компоненты React

### 1. Компонент проверки статуса привязки

```tsx
// components/OperatorBindingStatus.tsx
import React, { useEffect, useState } from 'react';
import { OperatorBindingService } from '../services/operatorBindingService';

interface Props {
  userId: number;
  onBound?: (machineId: number) => void;
  onNotBound?: () => void;
}

export const OperatorBindingStatus: React.FC<Props> = ({ 
  userId, 
  onBound, 
  onNotBound 
}) => {
  const [status, setStatus] = useState<OperatorBindingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, [userId]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const data = await OperatorBindingService.getBindingStatus(userId);
      setStatus(data);

      if (data.isBound && onBound) {
        onBound(data.machine!.machineId);
      } else if (!data.isBound && onNotBound) {
        onNotBound();
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!status?.isBound) {
    return (
      <div className="alert alert-warning">
        Вы не привязаны к станку
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Текущий станок</h5>
        <p><strong>Станок:</strong> {status.machine!.machineName}</p>
        <p><strong>Код:</strong> {status.machine!.machineCode}</p>
        <p><strong>Ваш номер:</strong> {status.machine!.operatorNumber}</p>
        <p><strong>Время привязки:</strong> {new Date(status.machine!.boundAt).toLocaleString('ru-RU')}</p>

        {status.otherOperators && status.otherOperators.length > 0 && (
          <div className="mt-3">
            <h6>Другие операторы на станке:</h6>
            <ul>
              {status.otherOperators.map(op => (
                <li key={op.userId}>
                  {op.firstName} {op.lastName} (№{op.operatorNumber})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 2. Компонент привязки к станку

```tsx
// components/MachineBindingForm.tsx
import React, { useState } from 'react';
import { OperatorBindingService } from '../services/operatorBindingService';

interface Props {
  userId: number;
  onSuccess?: () => void;
}

export const MachineBindingForm: React.FC<Props> = ({ userId, onSuccess }) => {
  const [machineCode, setMachineCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!machineCode || machineCode.length !== 4) {
      setError('Код станка должен содержать 4 символа');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await OperatorBindingService.bindToMachine(
        userId, 
        machineCode.toUpperCase()
      );

      setSuccess(result.message);
      setMachineCode('');

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка привязки к станку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Привязка к станку</h5>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="machineCode" className="form-label">
              Введите код станка (4 символа)
            </label>
            <input
              type="text"
              className="form-control"
              id="machineCode"
              value={machineCode}
              onChange={(e) => setMachineCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="H431"
              disabled={loading}
              style={{ 
                textTransform: 'uppercase',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '0.5rem'
              }}
            />
            <small className="form-text text-muted">
              Формат: буква + 3 цифры (например, H431)
            </small>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-100"
            disabled={loading || machineCode.length !== 4}
          >
            {loading ? 'Привязка...' : 'Привязаться к станку'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

---

### 3. Компонент отвязки от станка

```tsx
// components/UnbindButton.tsx
import React, { useState } from 'react';
import { OperatorBindingService } from '../services/operatorBindingService';

interface Props {
  userId: number;
  machineId: number;
  machineName: string;
  onSuccess?: () => void;
}

export const UnbindButton: React.FC<Props> = ({ 
  userId, 
  machineId, 
  machineName,
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUnbind = async () => {
    try {
      setLoading(true);
      await OperatorBindingService.unbindFromMachine(userId, machineId);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка отвязки от станка');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (!showConfirm) {
    return (
      <button 
        className="btn btn-warning"
        onClick={() => setShowConfirm(true)}
      >
        Завершить работу на станке
      </button>
    );
  }

  return (
    <div className="alert alert-warning">
      <p>Вы уверены, что хотите отвязаться от станка "{machineName}"?</p>
      <div className="d-flex gap-2">
        <button 
          className="btn btn-danger"
          onClick={handleUnbind}
          disabled={loading}
        >
          {loading ? 'Отвязка...' : 'Да, завершить'}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          Отмена
        </button>
      </div>
    </div>
  );
};
```

---

### 4. Главный компонент личного кабинета оператора

```tsx
// pages/OperatorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { OperatorBindingStatus } from '../components/OperatorBindingStatus';
import { MachineBindingForm } from '../components/MachineBindingForm';
import { UnbindButton } from '../components/UnbindButton';
import { OperatorBindingService } from '../services/operatorBindingService';

interface Props {
  userId: number;
  userName: string;
}

export const OperatorDashboard: React.FC<Props> = ({ userId, userName }) => {
  const [isBound, setIsBound] = useState(false);
  const [machineId, setMachineId] = useState<number | null>(null);
  const [machineName, setMachineName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBound = (mId: number) => {
    setIsBound(true);
    setMachineId(mId);
  };

  const handleNotBound = () => {
    setIsBound(false);
    setMachineId(null);
  };

  const handleBindSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleUnbindSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mt-4">
      <h2>Личный кабинет оператора</h2>
      <p className="text-muted">Добро пожаловать, {userName}!</p>

      <div className="row mt-4">
        <div className="col-md-6">
          <OperatorBindingStatus
            key={refreshKey}
            userId={userId}
            onBound={handleBound}
            onNotBound={handleNotBound}
          />

          {isBound && machineId && (
            <div className="mt-3">
              <UnbindButton
                userId={userId}
                machineId={machineId}
                machineName={machineName}
                onSuccess={handleUnbindSuccess}
              />
            </div>
          )}
        </div>

        {!isBound && (
          <div className="col-md-6">
            <MachineBindingForm
              userId={userId}
              onSuccess={handleBindSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## WebSocket интеграция

```typescript
// services/websocketService.ts
import io from 'socket.io-client';

const socket = io('http://localhost:5004');

// Подписка на события привязки
socket.on('operator:binding:updated', (data: {
  machineId: number;
  userId: number;
  action: 'bound' | 'unbound';
}) => {
  console.log('Привязка обновлена:', data);
  
  // Обновить UI
  if (data.action === 'bound') {
    // Показать уведомление о привязке
  } else {
    // Показать уведомление об отвязке
  }
});

// Подписка на сброс смены
socket.on('operator:binding:shift-reset', (data: {
  unboundCount: number;
  unboundAt: string;
}) => {
  console.log('Сброс смены:', data);
  alert(`Смена завершена. Все операторы отвязаны от станков.`);
  
  // Перезагрузить страницу или обновить статус
  window.location.reload();
});

export { socket };
```

---

## Обработка ошибок

```typescript
// utils/errorHandler.ts

export const handleApiError = (error: any): string => {
  if (error.response) {
    // Ошибка от сервера
    switch (error.response.status) {
      case 404:
        return 'Станок с указанным кодом не найден';
      case 409:
        return 'Вы уже привязаны к другому станку. Сначала отвяжитесь от текущего.';
      case 400:
        return 'Неверный формат данных';
      default:
        return error.response.data?.message || 'Ошибка сервера';
    }
  } else if (error.request) {
    // Нет ответа от сервера
    return 'Нет связи с сервером. Проверьте подключение к интернету.';
  } else {
    // Другая ошибка
    return error.message || 'Неизвестная ошибка';
  }
};
```

---

## Полный пример использования

```tsx
// App.tsx
import React from 'react';
import { OperatorDashboard } from './pages/OperatorDashboard';

function App() {
  // Получить userId из контекста авторизации
  const userId = 123; // Замените на реальный ID из вашей системы авторизации
  const userName = 'Иван Петров';

  return (
    <div className="App">
      <OperatorDashboard userId={userId} userName={userName} />
    </div>
  );
}

export default App;
```

---

## Чек-лист интеграции

- [ ] База данных обновлена (SQL выполнен)
- [ ] Коды станков сгенерированы
- [ ] Сервер перезапущен
- [ ] API эндпоинты доступны
- [ ] TypeScript типы добавлены
- [ ] Сервис для работы с API создан
- [ ] Компоненты React созданы
- [ ] WebSocket события обрабатываются
- [ ] Обработка ошибок реализована
- [ ] Тестирование выполнено

---

## Тестирование

### Тест 1: Проверка статуса
```bash
curl "http://localhost:5004/api/operators/bindings/status?userId=1"
```

### Тест 2: Привязка к станку
```bash
curl -X POST http://localhost:5004/api/operators/bindings/bind \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "machineCode": "H431"}'
```

### Тест 3: Отвязка от станка
```bash
curl -X POST http://localhost:5004/api/operators/bindings/unbind \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "machineId": 5}'
```

---

Готово! Теперь у вас есть полное руководство по интеграции фронтенда с системой привязки операторов. 🎉
