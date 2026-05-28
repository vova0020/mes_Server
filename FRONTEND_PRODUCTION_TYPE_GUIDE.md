# Руководство для фронтенда: Поддержка типов производства

## Обзор изменений

В систему добавлена поддержка разделения данных по типам производства:
- **SERIAL** - Серийное производство
- **CUSTOM** - Индивидуальное производство  
- **BOTH** - Используется в обоих типах (значение по умолчанию)

Поле `productionType` добавлено для:
1. Пользователей (User)
2. Станков (Machine)

---

## 1. Авторизация

### Эндпоинт: `POST /auth/login`

**Изменения в ответе:**

```typescript
interface LoginResponse {
  token: string;
  user: {
    id: number;
    login: string;
    roles: string[];
    primaryRole: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ
  };
  assignments: {
    stages?: Array<{
      id: number;
      name: string;
      finalStage: boolean;
    }>;
    machines?: Array<{
      id: number;
      name: string;
      noSmenTask?: boolean;
    }>;
    pickers?: Array<{
      id: number;
      userId: number;
    }>;
  };
}
```

**Что делать на фронтенде:**
- Сохранить `user.productionType` в состояние приложения (Redux/Context)
- Использовать для фильтрации данных и отображения соответствующих разделов UI

---

## 2. Управление пользователями

### Базовый путь: `/settings/users`

### 2.1 Создание пользователя

**Эндпоинт:** `POST /settings/users`

**Тело запроса:**
```typescript
interface CreateUserDto {
  login: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  salary?: number;
  productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ (опционально)
}
```

**Пример запроса:**
```json
{
  "login": "operator1",
  "password": "password123",
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Оператор",
  "productionType": "SERIAL"
}
```

### 2.2 Обновление пользователя

**Эндпоинт:** `PUT /settings/users/:userId`

**Тело запроса:**
```typescript
interface UpdateUserDto {
  login?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  salary?: number;
  productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ (опционально)
}
```

**Пример запроса:**
```json
{
  "productionType": "CUSTOM"
}
```

### 2.3 Получение пользователей

**Эндпоинт:** `GET /settings/users`

**Ответ:**
```typescript
interface UserResponse {
  userId: number;
  login: string;
  createdAt: Date;
  updatedAt: Date;
  productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ
  userDetail?: {
    firstName: string;
    lastName: string;
    phone?: string;
    position?: string;
    salary?: number;
  };
}
```

**Эндпоинт:** `GET /settings/users/:userId` - возвращает тот же формат

---

## 3. Управление станками

### Базовый путь: `/machines`

### 3.1 Создание станка

**Эндпоинт:** `POST /machines`

**Тело запроса:**
```typescript
interface CreateMachineDto {
  machineName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';
  recommendedLoad: number;
  loadUnit: string;
  noSmenTask: boolean;
  productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ (опционально)
}
```

**Пример запроса:**
```json
{
  "machineName": "Станок CNC-01",
  "status": "ACTIVE",
  "recommendedLoad": 100,
  "loadUnit": "кг",
  "noSmenTask": false,
  "productionType": "SERIAL"
}
```

### 3.2 Обновление станка

**Эндпоинт:** `PUT /machines/:id`

**Тело запроса:**
```typescript
interface UpdateMachineDto {
  machineName?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';
  recommendedLoad?: number;
  loadUnit?: string;
  noSmenTask?: boolean;
  productionType?: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ (опционально)
}
```

**Пример запроса:**
```json
{
  "productionType": "BOTH"
}
```

### 3.3 Получение станков

**Эндпоинт:** `GET /machines`

**Ответ:**
```typescript
interface MachineResponse {
  machineId: number;
  machineName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';
  recommendedLoad: number;
  loadUnit: string;
  noSmenTask: boolean;
  productionType: 'SERIAL' | 'CUSTOM' | 'BOTH'; // ← НОВОЕ ПОЛЕ
  machinesStages?: Array<{
    machineStageId: number;
    machineId: number;
    stageId: number;
    stage: {
      stageId: number;
      stageName: string;
      description: string | null;
    };
  }>;
  machineSubstages?: Array<{
    machineSubstageId: number;
    machineId: number;
    substageId: number;
    substage: {
      substageId: number;
      substageName: string;
      description: string | null;
      stage: {
        stageId: number;
        stageName: string;
      };
    };
  }>;
}
```

**Эндпоинт:** `GET /machines/:id` - возвращает тот же формат

---

## 4. Рекомендации по реализации на фронтенде

### 4.1 TypeScript типы

Создайте файл `types/production.ts`:

```typescript
export enum ProductionType {
  SERIAL = 'SERIAL',
  CUSTOM = 'CUSTOM',
  BOTH = 'BOTH'
}

export interface ProductionTypeOption {
  value: ProductionType;
  label: string;
}

export const PRODUCTION_TYPE_OPTIONS: ProductionTypeOption[] = [
  { value: ProductionType.SERIAL, label: 'Серийное производство' },
  { value: ProductionType.CUSTOM, label: 'Индивидуальное производство' },
  { value: ProductionType.BOTH, label: 'Оба типа' }
];
```

### 4.2 Компонент выбора типа производства

```tsx
import React from 'react';
import { Select } from 'antd'; // или ваша UI библиотека
import { PRODUCTION_TYPE_OPTIONS, ProductionType } from '@/types/production';

interface ProductionTypeSelectProps {
  value?: ProductionType;
  onChange: (value: ProductionType) => void;
  disabled?: boolean;
}

export const ProductionTypeSelect: React.FC<ProductionTypeSelectProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Выберите тип производства"
      style={{ width: '100%' }}
    >
      {PRODUCTION_TYPE_OPTIONS.map(option => (
        <Select.Option key={option.value} value={option.value}>
          {option.label}
        </Select.Option>
      ))}
    </Select>
  );
};
```

### 4.3 Форма создания пользователя

```tsx
import React from 'react';
import { Form, Input, Button } from 'antd';
import { ProductionTypeSelect } from '@/components/ProductionTypeSelect';
import { ProductionType } from '@/types/production';

export const CreateUserForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      const response = await fetch('/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          productionType: values.productionType || ProductionType.BOTH
        })
      });
      
      if (response.ok) {
        // Успешно создано
        form.resetFields();
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
    }
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical">
      <Form.Item
        name="login"
        label="Логин"
        rules={[{ required: true, message: 'Введите логин' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name="firstName"
        label="Имя"
        rules={[{ required: true, message: 'Введите имя' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="lastName"
        label="Фамилия"
        rules={[{ required: true, message: 'Введите фамилию' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="productionType"
        label="Тип производства"
        initialValue={ProductionType.BOTH}
      >
        <ProductionTypeSelect />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Создать пользователя
        </Button>
      </Form.Item>
    </Form>
  );
};
```

### 4.4 Форма создания станка

```tsx
import React from 'react';
import { Form, Input, InputNumber, Switch, Select, Button } from 'antd';
import { ProductionTypeSelect } from '@/components/ProductionTypeSelect';
import { ProductionType } from '@/types/production';

export const CreateMachineForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      const response = await fetch('/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          productionType: values.productionType || ProductionType.BOTH
        })
      });
      
      if (response.ok) {
        // Успешно создано
        form.resetFields();
      }
    } catch (error) {
      console.error('Ошибка создания станка:', error);
    }
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical">
      <Form.Item
        name="machineName"
        label="Название станка"
        rules={[{ required: true, message: 'Введите название' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="status"
        label="Статус"
        rules={[{ required: true, message: 'Выберите статус' }]}
      >
        <Select>
          <Select.Option value="ACTIVE">Активен</Select.Option>
          <Select.Option value="INACTIVE">Неактивен</Select.Option>
          <Select.Option value="MAINTENANCE">На обслуживании</Select.Option>
          <Select.Option value="BROKEN">Сломан</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="recommendedLoad"
        label="Рекомендуемая нагрузка"
        rules={[{ required: true, message: 'Введите нагрузку' }]}
      >
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="loadUnit"
        label="Единица измерения"
        rules={[{ required: true, message: 'Введите единицу' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="noSmenTask"
        label="Запретить сменные задачи"
        valuePropName="checked"
        initialValue={false}
      >
        <Switch />
      </Form.Item>

      <Form.Item
        name="productionType"
        label="Тип производства"
        initialValue={ProductionType.BOTH}
      >
        <ProductionTypeSelect />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Создать станок
        </Button>
      </Form.Item>
    </Form>
  );
};
```

### 4.5 Фильтрация данных

```tsx
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ProductionType } from '@/types/production';

export const MachinesList: React.FC = () => {
  const currentUser = useSelector(state => state.auth.user);
  const allMachines = useSelector(state => state.machines.list);

  // Фильтруем станки по типу производства текущего пользователя
  const filteredMachines = useMemo(() => {
    if (!currentUser?.productionType) return allMachines;
    
    return allMachines.filter(machine => {
      // Показываем станки с типом BOTH всем
      if (machine.productionType === ProductionType.BOTH) return true;
      
      // Пользователи с типом BOTH видят все станки
      if (currentUser.productionType === ProductionType.BOTH) return true;
      
      // Иначе показываем только совпадающие типы
      return machine.productionType === currentUser.productionType;
    });
  }, [allMachines, currentUser]);

  return (
    <div>
      {filteredMachines.map(machine => (
        <div key={machine.machineId}>
          {machine.machineName} - {machine.productionType}
        </div>
      ))}
    </div>
  );
};
```

---

## 5. Значения по умолчанию

При создании новых записей без указания `productionType`:
- **Backend автоматически устанавливает:** `BOTH`
- **Рекомендация для фронтенда:** Явно указывать `BOTH` в формах для ясности

---

## 6. Миграция существующих данных

Все существующие записи в базе данных получат значение `BOTH` после применения миграции.

---

## 7. Проверка изменений

### Тестовые запросы:

**Создание пользователя с типом SERIAL:**
```bash
curl -X POST http://localhost:3000/settings/users \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test_serial",
    "password": "password123",
    "firstName": "Тест",
    "lastName": "Серийный",
    "productionType": "SERIAL"
  }'
```

**Создание станка с типом CUSTOM:**
```bash
curl -X POST http://localhost:3000/machines \
  -H "Content-Type: application/json" \
  -d '{
    "machineName": "Станок Custom-01",
    "status": "ACTIVE",
    "recommendedLoad": 50,
    "loadUnit": "шт",
    "noSmenTask": false,
    "productionType": "CUSTOM"
  }'
```

**Получение данных:**
```bash
# Получить всех пользователей
curl http://localhost:3000/settings/users

# Получить все станки
curl http://localhost:3000/machines

# Авторизация
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_serial",
    "password": "password123"
  }'
```

---

## 8. Контрольный список для фронтенда

- [ ] Добавить enum `ProductionType` в типы
- [ ] Создать компонент `ProductionTypeSelect`
- [ ] Обновить формы создания пользователей
- [ ] Обновить формы редактирования пользователей
- [ ] Обновить формы создания станков
- [ ] Обновить формы редактирования станков
- [ ] Обновить интерфейсы для ответов API
- [ ] Добавить фильтрацию по `productionType` в списках
- [ ] Сохранять `productionType` из ответа авторизации
- [ ] Обновить таблицы/списки для отображения типа производства
- [ ] Добавить индикаторы типа производства (бейджи/иконки)
- [ ] Протестировать создание/редактирование с разными типами
- [ ] Протестировать фильтрацию данных

---

## Вопросы?

При возникновении вопросов обращайтесь к backend команде.
