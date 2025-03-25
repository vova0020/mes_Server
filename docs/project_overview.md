

# Полное руководство по системе авторизации и управления пользователями

## Содержание

1. [Введение и обзор системы](#1-введение-и-обзор-системы)
2. [Архитектура проекта](#2-архитектура-проекта)
   - [Структура каталогов](#21-структура-каталогов)
   - [Принципы архитектуры](#22-принципы-архитектуры)
   - [Схема взаимодействия компонентов](#23-схема-взаимодействия-компонентов)
3. [Базовые компоненты](#3-базовые-компоненты)
   - [Точка входа: main.ts](#31-точка-входа-maints)
   - [Корневой модуль: app.module.ts](#32-корневой-модуль-appmodulets)
   - [Работа с базой данных: prisma.service.ts](#33-работа-с-базой-данных-prismaservicets)
4. [Модуль аутентификации (auth)](#4-модуль-аутентификации-auth)
   - [auth.module.ts](#41-authmodulets)
   - [auth.controller.ts](#42-authcontrollerts)
   - [auth.service.ts](#43-authservicets)
   - [jwt.strategy.ts](#44-jwtstrategyts)
   - [jwt-auth.guard.ts](#45-jwt-authguardts)
   - [login.dto.ts](#46-logindtots)
5. [Модуль пользователей (users)](#5-модуль-пользователей-users)
   - [users.module.ts](#51-usersmodulets)
   - [users.controller.ts](#52-userscontrollerts)
   - [users.service.ts](#53-usersservicets)
   - [create-user.dto.ts](#54-create-userdtots)
6. [Общие компоненты (common)](#6-общие-компоненты-common)
   - [Декораторы](#61-декораторы)
   - [Перечисления](#62-перечисления)
7. [Процессы и потоки данных](#7-процессы-и-потоки-данных)
   - [Процесс аутентификации](#71-процесс-аутентификации)
   - [Процесс создания пользователя](#72-процесс-создания-пользователя)
   - [Процесс удаления пользователя](#73-процесс-удаления-пользователя)
   - [Процесс проверки доступа](#74-процесс-проверки-доступа)
   - [Процесс логирования](#75-процесс-логирования)
8. [Примеры использования](#8-примеры-использования)
9. [Руководство по расширению системы](#9-руководство-по-расширению-системы)
10. [Часто задаваемые вопросы](#10-часто-задаваемые-вопросы)

---

## 1. Введение и обзор системы

Данная система представляет собой серверное приложение, разработанное на платформе NestJS с использованием TypeScript. Система обеспечивает:

- **Аутентификацию пользователей**: проверку учетных данных и выдачу JWT токенов
- **Авторизацию**: контроль доступа к ресурсам на основе ролей пользователей
- **Управление пользователями**: создание, удаление, поиск пользователей
- **Логирование действий**: запись попыток входа и других важных событий

Система построена по модульному принципу, где каждый модуль отвечает за отдельный аспект функциональности.

---

## 2. Архитектура проекта

### 2.1 Структура каталогов

```
src/
├── common/                 # Общие компоненты
│   ├── decorators/        # Декораторы для удобства работы с данными
│   │   ├── current-user.decorator.ts  # Доступ к данным текущего пользователя
│   │   └── roles.decorator.ts  # Декоратор для проверки ролей
│   └── enums/             # Перечисления
│       └── role.enum.ts   # Определение ролей в системе
│
├── config/                # Конфигурации приложения
│   
├── modules/              # Основные модули приложения
│   ├── auth/            # Модуль аутентификации
│   │   ├── controllers/  # Обработка HTTP-запросов
│   │   │   └── auth.controller.ts  # Контроллер для аутентификации
│   │   ├── dto/          # Объекты передачи данных
│   │   │   ├── login.dto.ts       # Данные для входа
│   │   │   └── create-user.dto.ts  # Данные для создания пользователя
│   │   ├── guards/       # Защитники маршрутов
│   │   │   └── jwt-auth.guard.ts  # Проверка JWT токена
│   │   ├── services/     # Бизнес-логика
│   │   │   └── auth.service.ts    # Сервис аутентификации
│   │   ├── strategies/   # Стратегии Passport.js
│   │   │   └── jwt.strategy.ts    # Стратегия для работы с JWT
│   │   └── auth.module.ts  # Определение модуля auth
│   │
│   ├── users/           # Модуль управления пользователями
│   │   ├── controllers/  # Обработка HTTP-запросов
│   │   │   └── users.controller.ts  # Контроллер для управления пользователями
│   │   ├── dto/          # Объекты передачи данных
│   │   │   └── create-user.dto.ts   # Данные для создания пользователя
│   │   ├── services/     # Бизнес-логика
│   │   │   └── users.service.ts     # Сервис для работы с пользователями
│   │   └── users.module.ts  # Определение модуля users
│   │
│   └── orders/          # Модуль заказов (пример)
│
├── shared/              # Общие сервисы и компоненты
│   ├── prisma.service.ts  # Сервис для работы с базой данных
│   └── shared.module.ts   # Определение shared модуля
│
├── app.module.ts        # Корневой модуль приложения
└── main.ts              # Точка входа в приложение
```

### 2.2 Принципы архитектуры

Система построена по следующим принципам:

1. **Многослойная архитектура**:
   - **Контроллеры** - принимают HTTP-запросы и передают данные сервисам
   - **Сервисы** - содержат бизнес-логику и взаимодействуют с базой данных
   - **Entities/DTOs** - определяют структуры данных
   - **Guards/Strategies** - обеспечивают безопасность и авторизацию

2. **Dependency Injection (DI)**:
   - Сервисы и другие провайдеры внедряются через конструкторы классов
   - Это упрощает тестирование и поддержку кода

3. **Модульность**:
   - Каждый модуль имеет четкую зону ответственности
   - Модули могут быть переиспользованы

### 2.3 Схема взаимодействия компонентов

```mermaid
graph TD
    Client[Клиент] -->|HTTP запрос| Controller[Контроллер]
    Controller -->|Валидация DTO| Service[Сервис]
    Service -->|Запрос данных| Database[(База данных)]
    Database -->|Данные| Service
    Service -->|Обработанные данные| Controller
    Controller -->|HTTP ответ| Client
    
    Guard[JWT Guard] -->|Проверка токена| Controller
    Strategy[JWT Strategy] -->|Валидация данных| Guard
```

---

## 3. Базовые компоненты

### 3.1 Точка входа: main.ts

**Назначение**: Инициализация и запуск приложения.

**Код**:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Создает экземпляр приложения NestJS
  const app = await NestFactory.create(AppModule);
  
  // Запускает сервер на порту 3000
  await app.listen(3000);
}
bootstrap();
```

**Как работает**:
1. Импортирует необходимые модули
2. Создает функцию bootstrap для асинхронной инициализации
3. Создает экземпляр приложения на основе корневого модуля (`AppModule`)
4. Запускает HTTP-сервер на порту 3000

### 3.2 Корневой модуль: app.module.ts

**Назначение**: Объединяет все модули приложения.

**Код**:
```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
})
export class AppModule {}
```

**Как работает**:
1. Импортирует другие модули, необходимые для работы приложения
2. Объединяет их в один корневой модуль с помощью декоратора `@Module`

### 3.3 Работа с базой данных: prisma.service.ts

**Назначение**: Предоставляет интерфейс для работы с базой данных через Prisma ORM.

**Код**:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Подключение к базе данных при запуске модуля
    await this.$connect();
  }

  async onModuleDestroy() {
    // Закрытие соединения с базой данных при остановке модуля
    await this.$disconnect();
  }
}
```

**Как работает**:
1. Наследуется от `PrismaClient`, предоставляющего методы для работы с базой данных
2. Подключается к базе при инициализации модуля и отключается при его остановке
3. Через данный сервис выполняются все операции с базой данных

---

## 4. Модуль аутентификации (auth)

### 4.1 auth.module.ts

**Назначение**: Конфигурирует модуль аутентификации.

**Код**:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

**Как работает**:
1. Импортирует необходимые модули: UsersModule, ConfigModule, JwtModule
2. Настраивает JWT модуль:
   - Получает секретный ключ из переменных окружения или использует запасной
   - Устанавливает срок действия токена (1 час)
3. Регистрирует необходимые компоненты: контроллер, сервис и стратегию

### 4.2 auth.controller.ts

**Назначение**: Обрабатывает HTTP-запросы для аутентификации.

**Код**:
```typescript
import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

@Controller('auth') // Базовый путь для всех маршрутов: /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login') // Маршрут: POST /auth/login
  async login(@Body() loginDto: LoginDto) {
    // Вызываем сервис для проверки пользователя и генерации токена
    const token = await this.authService.validateUserAndGenerateToken(loginDto);
    if (!token) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return { token }; // Возвращаем токен клиенту
  }
}
```

**Как работает**:
1. Принимает POST-запрос на путь `/auth/login`
2. Извлекает данные из тела запроса в объект LoginDto
3. Вызывает метод `validateUserAndGenerateToken` сервиса AuthService
4. Возвращает токен клиенту или выбрасывает исключение при неверных учетных данных

### 4.3 auth.service.ts

**Назначение**: Содержит бизнес-логику для аутентификации.

**Код**:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserAndGenerateToken(dto: LoginDto, req?: Request) {
    // Получаем IP и User-Agent для логирования
    const ip = req ? (req.ip || 'unknown') : 'unknown';
    const userAgent = req ? (req.headers['user-agent'] || 'unknown') : 'unknown';

    // Ищем пользователя по имени
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      // Если пользователь не найден, логируем неудачную попытку
      await this.usersService.recordLoginLog(null, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // Если пароль неверный, логируем неудачную попытку
      await this.usersService.recordLoginLog(user.id, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    // Логируем успешный вход
    await this.usersService.recordLoginLog(user.id, ip, userAgent, true);

    // Создаем JWT-токен
    const payload = { sub: user.id, username: user.username, role: user.role.name };
    return this.jwtService.sign(payload);
  }
}
```

**Как работает**:
1. Получает данные для входа через dto и информацию о запросе (при наличии)
2. Ищет пользователя по имени через UsersService
3. Проверяет пароль с использованием bcrypt
4. Логирует попытку входа (успешную или неуспешную)
5. При успешной проверке:
   - Создает payload с данными пользователя (id, имя, роль)
   - Подписывает JWT токен
   - Возвращает токен

### 4.4 jwt.strategy.ts

**Назначение**: Определяет стратегию проверки JWT токенов.

**Код**:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Указываем, что токен будет извлекаться из заголовка Authorization в формате Bearer
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Используем тот же секретный ключ, что и при создании токена
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
    });
  }

  // Метод validate вызывается автоматически, когда токен прошел проверку
  async validate(payload: any) {
    // Возвращаем объект пользователя, который будет доступен в запросе (req.user)
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
```

**Как работает**:
1. Наследует PassportStrategy и настраивает способ извлечения токена
2. Получает секретный ключ из ConfigService
3. Реализует метод validate, который:
   - Принимает payload из проверенного токена
   - Возвращает объект пользователя, который будет доступен через `req.user`

### 4.5 jwt-auth.guard.ts

**Назначение**: Защищает маршруты API, требуя действительный JWT токен.

**Код**:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Как работает**:
1. Наследует AuthGuard из @nestjs/passport
2. Указывает, что используется стратегия 'jwt', определенная в JwtStrategy
3. При применении к маршруту:
   - Извлекает токен из запроса
   - Проверяет его подпись и срок действия
   - Если токен действителен, позволяет запросу продолжить выполнение
   - Если нет, возвращает ошибку 401 Unauthorized

### 4.6 login.dto.ts

**Назначение**: Определяет структуру данных для запроса на вход.

**Код**:
```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
```

**Как работает**:
1. Определяет два обязательных поля: username и password
2. Использует декораторы из class-validator для проверки данных
3. Обеспечивает типовую безопасность и валидацию для данных входа

---

## 5. Модуль пользователей (users)

### 5.1 users.module.ts

**Назначение**: Конфигурирует модуль управления пользователями.

**Код**:
```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule], // Импортируем SharedModule для доступа к PrismaService
  providers: [UsersService], // Регистрируем сервис пользователей
  controllers: [UsersController], // Регистрируем контроллер
  exports: [UsersService], // Экспортируем сервис для использования в других модулях
})
export class UsersModule {}
```

**Как работает**:
1. Импортирует SharedModule для доступа к PrismaService
2. Регистрирует UsersService и UsersController
3. Экспортирует UsersService, чтобы его можно было использовать в других модулях (например, в AuthModule)

### 5.2 users.controller.ts

**Назначение**: Обрабатывает HTTP-запросы для управления пользователями.

**Код**:
```typescript
import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleEnum } from '../../../common/enums/role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Регистрация нового пользователя (доступно только для администратора)
  @Post('register')
  @UseGuards(JwtAuthGuard) // Проверяем наличие валидного JWT токена
  @Roles(RoleEnum.ADMIN) // Только администратор может создавать пользователей
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.createUser(createUserDto);
  }

  // Удаление пользователя по id (только администратор)
  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Проверяем наличие валидного JWT токена
  @Roles(RoleEnum.ADMIN) // Только администратор может удалять пользователей
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.deleteUser(Number(id));
  }
}
```

**Как работает**:
1. Обрабатывает запросы на базовый путь `/users`
2. Предоставляет два маршрута:
   - POST `/users/register` - создание нового пользователя
   - DELETE `/users/:id` - удаление пользователя
3. Использует JwtAuthGuard для проверки токена
4. Использует декоратор @Roles для проверки роли пользователя
5. Делегирует выполнение операций UsersService

### 5.3 users.service.ts

**Назначение**: Содержит бизнес-логику для управления пользователями.

**Код**:
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    // Проверяем, существует ли пользователь с таким именем
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new BadRequestException('User with this username already exists.');
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Создаем пользователя в базе данных
    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: { connect: { id: dto.roleId } }, // Связываем с ролью
        details:
          dto.fullName || dto.phone || dto.position || dto.salary
            ? {
                create: {
                  fullName: dto.fullName || '',
                  phone: dto.phone,
                  position: dto.position,
                  salary: dto.salary,
                },
              }
            : undefined, // Создаем детали пользователя, если предоставлены
      },
    });

    return newUser;
  }

  async deleteUser(userId: number) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    
    // Удаляем пользователя
    return await this.prisma.user.delete({ where: { id: userId } });
  }

  async findByUsername(username: string) {
    // Ищем пользователя по имени, включая связанную роль
    return this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });
  }

  async recordLoginLog(userId: number | null, ip: string, userAgent: string, success: boolean) {
    // Записываем информацию о попытке входа
    return this.prisma.loginLog.create({
      data: {
        userId,
        ip,
        userAgent,
        success,
      },
    });
  }
}
```

**Как работает**:
1. Предоставляет методы для работы с пользователями:
   - `createUser`: создает нового пользователя
   - `deleteUser`: удаляет пользователя
   - `findByUsername`: ищет пользователя по имени
   - `recordLoginLog`: записывает информацию о попытке входа
2. Использует PrismaService для взаимодействия с базой данных
3. Обеспечивает безопасность:
   - Хеширует пароли
   - Проверяет уникальность имен пользователей
   - Логирует важные действия

### 5.4 create-user.dto.ts

**Назначение**: Определяет структуру данных для создания пользователя.

**Код**:
```typescript
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;
}
```

**Как работает**:
1. Определяет обязательные поля:
   - username: имя пользователя
   - password: пароль
   - roleId: идентификатор роли
2. Определяет необязательные поля:
   - fullName: полное имя
   - phone: телефон
   - position: должность
   - salary: зарплата
3. Использует декораторы для валидации данных

---

## 6. Общие компоненты (common)

### 6.1 Декораторы

#### current-user.decorator.ts

**Назначение**: Упрощает доступ к данным авторизованного пользователя.

**Код**:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

**Как работает**:
1. Создает параметрический декоратор
2. Извлекает объект пользователя из запроса
3. Позволяет выбрать конкретное поле или весь объект пользователя
4. Используется в контроллерах: `@CurrentUser() user`

#### roles.decorator.ts

**Назначение**: Определяет, какие роли имеют доступ к маршруту.

**Код**:
```typescript
import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
```

**Как работает**:
1. Создает декоратор, который сохраняет метаданные о требуемых ролях
2. Используется вместе с RolesGuard для проверки прав доступа
3. Пример использования: `@Roles(RoleEnum.ADMIN)`

### 6.2 Перечисления


#### role.enum.ts

**Назначение**: Определяет возможные роли пользователей.

**Код**:
```typescript
export enum RoleEnum {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
  // Другие роли при необходимости
}
```

**Как работает**:
1. Определяет константы для возможных ролей в системе
2. Используется для проверки прав доступа
3. Позволяет легко добавлять новые роли при необходимости

---

## 7. Процессы и потоки данных

### 7.1 Процесс аутентификации

**Шаги процесса**:

1. **Клиент отправляет запрос на вход**:
   ```http
   POST /auth/login
   Content-Type: application/json
   
   {
     "username": "admin",
     "password": "password123"
   }
   ```

2. **Контроллер принимает запрос**:
   - `auth.controller.ts` обрабатывает POST запрос на endpoint `/login`
   - Данные из тела запроса преобразуются в объект `LoginDto`
   - Валидируются входные данные (проверка на пустые значения, типы данных)

3. **Сервис проверяет учетные данные**:
   - `auth.service.ts` вызывает метод `validateUserAndGenerateToken`
   - Извлекает IP-адрес и User-Agent из запроса для логирования
   - Ищет пользователя по имени через `users.service.ts`
   - Если пользователь не найден, логирует неудачную попытку и возвращает ошибку
   - Сравнивает пароль с хешем в базе данных с помощью bcrypt
   - Если пароль неверный, логирует неудачную попытку и возвращает ошибку

4. **Создание и возврат токена**:
   - Логирует успешный вход
   - Создает JWT-токен с данными пользователя
   - Токен подписывается секретным ключом и имеет срок действия 1 час
   - Токен возвращается клиенту

5. **Клиент получает ответ**:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

**Диаграмма процесса**:
```mermaid
sequenceDiagram
    Клиент->>AuthController: POST /auth/login
    AuthController->>AuthService: validateUserAndGenerateToken()
    AuthService->>UsersService: findByUsername()
    UsersService-->>AuthService: Данные пользователя (или null)
    AuthService->>bcrypt: compare(password, hash)
    bcrypt-->>AuthService: true/false
    AuthService->>UsersService: recordLoginLog()
    AuthService->>JwtService: sign(payload)
    JwtService-->>AuthService: JWT токен
    AuthService-->>AuthController: JWT токен
    AuthController-->>Клиент: { token: "..." }
```

### 7.2 Процесс создания пользователя

**Шаги процесса**:

1. **Клиент отправляет запрос на создание пользователя**:
   ```http
   POST /users/register
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json
   
   {
     "username": "newuser",
     "password": "password123",
     "roleId": 2,
     "fullName": "John Doe",
     "phone": "+1234567890",
     "position": "Manager"
   }
   ```

2. **Проверка аутентификации и авторизации**:
   - `JwtAuthGuard` проверяет наличие и валидность JWT токена в заголовке Authorization
   - Если токен отсутствует или недействителен, возвращается ошибка 401 Unauthorized
   - Декоратор `@Roles(RoleEnum.ADMIN)` проверяет, имеет ли пользователь роль администратора
   - Если роль не подходит, возвращается ошибка 403 Forbidden

3. **Контроллер принимает запрос**:
   - `users.controller.ts` обрабатывает POST запрос на endpoint `/register`
   - Данные из тела запроса преобразуются в объект `CreateUserDto`
   - Выполняется валидация входных данных

4. **Сервис создает пользователя**:
   - `users.service.ts` вызывает метод `createUser`
   - Проверяет, существует ли пользователь с таким именем
   - Если существует, возвращает ошибку BadRequest
   - Хеширует пароль с помощью bcrypt
   - Создает запись пользователя в базе данных через Prisma
   - Создает связанные данные (детали пользователя)

5. **Клиент получает ответ**:
   ```json
   {
     "id": 3,
     "username": "newuser",
     "createdAt": "2023-06-10T12:34:56.789Z"
   }
   ```

**Диаграмма процесса**:
```mermaid
sequenceDiagram
    Клиент->>UsersController: POST /users/register
    UsersController->>JwtAuthGuard: Проверка токена
    JwtAuthGuard->>JwtStrategy: validate(payload)
    JwtStrategy-->>JwtAuthGuard: Данные пользователя
    JwtAuthGuard->>RolesGuard: Проверка роли
    RolesGuard-->>UsersController: OK/Ошибка
    UsersController->>UsersService: createUser(dto)
    UsersService->>PrismaService: Проверка существования пользователя
    PrismaService-->>UsersService: Результат проверки
    UsersService->>bcrypt: hash(password)
    bcrypt-->>UsersService: Хешированный пароль
    UsersService->>PrismaService: Создание пользователя
    PrismaService-->>UsersService: Созданный пользователь
    UsersService-->>UsersController: Данные пользователя
    UsersController-->>Клиент: Данные пользователя
```

### 7.3 Процесс удаления пользователя

**Шаги процесса**:

1. **Клиент отправляет запрос на удаление пользователя**:
   ```http
   DELETE /users/5
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Проверка аутентификации и авторизации**:
   - Аналогично процессу создания пользователя, проверяется токен и роль
   - Требуется роль администратора

3. **Контроллер принимает запрос**:
   - `users.controller.ts` обрабатывает DELETE запрос на endpoint `/:id`
   - Извлекает id пользователя из URL-параметра

4. **Сервис удаляет пользователя**:
   - `users.service.ts` вызывает метод `deleteUser`
   - Проверяет существование пользователя с указанным id
   - Если пользователь не найден, возвращает ошибку BadRequest
   - Удаляет запись пользователя из базы данных через Prisma

5. **Клиент получает ответ**:
   ```json
   {
     "message": "User deleted successfully"
   }
   ```

### 7.4 Процесс проверки доступа

**Шаги процесса**:

1. **Клиент отправляет защищенный запрос**:
   ```http
   GET /protected-resource
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **JwtAuthGuard проверяет токен**:
   - Извлекает токен из заголовка Authorization
   - Проверяет подпись токена с помощью секретного ключа
   - Проверяет срок действия токена
   - Если токен недействителен, возвращает ошибку 401 Unauthorized

3. **JwtStrategy извлекает данные пользователя**:
   - Декодирует payload токена
   - Возвращает объект пользователя: `{ id, username, role }`

4. **RolesGuard проверяет роль** (если применяется):
   - Получает требуемые роли из метаданных маршрута
   - Сравнивает с ролью пользователя из токена
   - Если роль не соответствует, возвращает ошибку 403 Forbidden

5. **Контроллер обрабатывает запрос**:
   - Получает доступ к данным пользователя через req.user или @CurrentUser()
   - Выполняет бизнес-логику
   - Возвращает результат клиенту

**Диаграмма процесса**:
```mermaid
sequenceDiagram
    Клиент->>Контроллер: Запрос с JWT-токеном
    Контроллер->>JwtAuthGuard: Проверка запроса
    JwtAuthGuard->>JwtStrategy: Валидация токена
    JwtStrategy-->>JwtAuthGuard: Данные пользователя
    JwtAuthGuard->>RolesGuard: Проверка роли (если используется)
    RolesGuard-->>Контроллер: OK/Ошибка
    Контроллер->>Сервис: Бизнес-логика
    Сервис-->>Контроллер: Результат
    Контроллер-->>Клиент: Ответ
```


### 7.5 Процесс логирования

**Назначение**: Отслеживание попыток входа и других важных действий в системе.

**Шаги процесса**:

1. **Событие, требующее логирования**:
   - Попытка входа в систему (успешная или неудачная)
   - Создание или удаление пользователя
   - Другие важные действия

2. **Сбор информации для логирования**:
   - Идентификатор пользователя (если известен)
   - IP-адрес клиента
   - User-Agent (информация о браузере/клиенте)
   - Временная метка
   - Результат операции (успех/неудача)

3. **Запись лога в базу данных**:
   - `users.service.ts` вызывает метод `recordLoginLog`
   - Создается запись в таблице `LoginLog` через Prisma

4. **Использование данных логирования**:
   - Анализ подозрительной активности
   - Сбор статистики использования системы
   - Аудит безопасности

**Пример кода логирования**:
```typescript
async recordLoginLog(userId: number | null, ip: string, userAgent: string, success: boolean) {
  return this.prisma.loginLog.create({
    data: {
      userId,
      ip,
      userAgent,
      timestamp: new Date(),
      success,
      details: success ? 'Successful login' : 'Failed login attempt',
    },
  });
}
```

**Диаграмма процесса**:
```mermaid
sequenceDiagram
    Клиент->>AuthService: Попытка входа
    AuthService->>UsersService: recordLoginLog()
    UsersService->>PrismaService: Создание записи лога
    PrismaService->>База данных: Запись в таблицу LoginLog
    PrismaService-->>UsersService: Подтверждение
    UsersService-->>AuthService: Подтверждение
```

---

## 8. Примеры использования

### 8.1 Аутентификация пользователя

**Запрос**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

**Успешный ответ**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2MjMzMjkzODAsImV4cCI6MTYyMzMzMjk4MH0.G_MxK5cPbtpvs6Z8C82zqrcoG5xfOC8MbFn0JL7Eagw"
}
```

**Ошибка (неверные учетные данные)**:
```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные.",
  "error": "Unauthorized"
}
```

### 8.2 Создание нового пользователя

**Запрос**:
```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "username": "newuser",
    "password": "password123",
    "roleId": 2,
    "fullName": "Иван Иванов",
    "phone": "+79001234567",
    "position": "Менеджер"
  }'
```

**Успешный ответ**:
```json
{
  "id": 5,
  "username": "newuser",
  "createdAt": "2023-06-10T15:30:45.123Z"
}
```

**Ошибка (пользователь уже существует)**:
```json
{
  "statusCode": 400,
  "message": "User with this username already exists.",
  "error": "Bad Request"
}
```

### 8.3 Удаление пользователя

**Запрос**:
```bash
curl -X DELETE http://localhost:3000/users/5 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Успешный ответ**:
```json
{
  "id": 5,
  "username": "newuser",
  "deletedAt": "2023-06-10T16:45:12.789Z"
}
```

**Ошибка (пользователь не найден)**:
```json
{
  "statusCode": 400,
  "message": "User not found.",
  "error": "Bad Request"
}
```

### 8.4 Использование защищенных маршрутов

**Запрос**:
```bash
curl -X GET http://localhost:3000/protected-resource \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Успешный ответ**:
```json
{
  "message": "Успешный доступ к защищенному ресурсу",
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

**Ошибка (отсутствует токен)**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Ошибка (недостаточно прав)**:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## 9. Руководство по расширению системы

### 9.1 Добавление новой роли

1. **Обновите перечисление ролей**:
   ```typescript
   // src/common/enums/role.enum.ts
   export enum RoleEnum {
     ADMIN = 'admin',
     USER = 'user',
     MANAGER = 'manager',
     SUPERVISOR = 'supervisor', // Новая роль
   }
   ```

2. **Добавьте роль в базу данных**:
   ```sql
   -- С помощью SQL или через Prisma Studio
   INSERT INTO "Role" (name, description) VALUES ('supervisor', 'Руководитель группы');
   ```

3. **Используйте новую роль в декораторах**:
   ```typescript
   @Roles(RoleEnum.ADMIN, RoleEnum.SUPERVISOR)
   async someProtectedMethod() {
     // ...
   }
   ```

### 9.2 Добавление нового поля пользователя

1. **Обновите схему Prisma**:
   ```prisma
   // prisma/schema.prisma
   model UserDetails {
     id        Int      @id @default(autoincrement())
     userId    Int      @unique
     fullName  String?
     phone     String?
     position  String?
     salary    Float?
     department String?  // Новое поле
     // ...
   }
   ```

2. **Создайте миграцию**:
   ```bash
   npx prisma migrate dev --name add_department_field
   ```

3. **Обновите DTO**:
   ```typescript
   // src/modules/users/dto/create-user.dto.ts
   export class CreateUserDto {
     // Существующие поля...
     
     @IsOptional()
     @IsString()
     department?: string;
   }
   ```

4. **Обновите сервис пользователей**:
   ```typescript
   // src/modules/users/services/users.service.ts
   async createUser(dto: CreateUserDto) {
     // ...
     const newUser = await this.prisma.user.create({
       data: {
         // Существующие поля...
         details: {
           create: {
             // Существующие поля...
             department: dto.department,
           },
         },
       },
     });
     // ...
   }
   ```

### 9.3 Создание нового модуля

1. **Создайте структуру модуля**:
   ```
   src/modules/reports/
   ├── controllers/
   │   └── reports.controller.ts
   ├── dto/
   │   └── create-report.dto.ts
   ├── services/
   │   └── reports.service.ts
   └── reports.module.ts
   ```

2. **Реализуйте модуль**:
   ```typescript
   // reports.module.ts
   import { Module } from '@nestjs/common';
   import { ReportsController } from './controllers/reports.controller';
   import { ReportsService } from './services/reports.service';
   import { SharedModule } from '../../shared/shared.module';

   @Module({
     imports: [SharedModule],
     controllers: [ReportsController],
     providers: [ReportsService],
     exports: [ReportsService],
   })
   export class ReportsModule {}
   ```

3. **Обновите app.module.ts**:
   ```typescript
   // src/app.module.ts
   import { Module } from '@nestjs/common';
   import { AuthModule } from './modules/auth/auth.module';
   import { UsersModule } from './modules/users/users.module';
   import { ReportsModule } from './modules/reports/reports.module';

   @Module({
     imports: [AuthModule, UsersModule, ReportsModule],
   })
   export class AppModule {}
   ```

### 9.4 Рекомендации по обеспечению безопасности

1. **Защита конфиденциальных данных**:
   - Всегда используйте переменные окружения для секретных ключей
   - Никогда не храните пароли в открытом виде
   - Используйте хеширование с "солью" (bcrypt)
   - Избегайте хранения конфиденциальных данных в JWT

2. **Защита от общих уязвимостей**:
   - Используйте Helmet для настройки HTTP-заголовков безопасности
   - Защитите API от CSRF-атак
   - Настройте ограничение скорости запросов (rate limiting)
   - Валидируйте все входные данные через DTOs и класс-валидаторы

3. **Рекомендации по JWT**:
   - Устанавливайте короткий срок действия токенов (например, 15-60 минут)
   - Реализуйте механизм обновления токенов
   - Используйте куки с флагами httpOnly и secure для хранения токенов на клиенте

4. **Журналирование и мониторинг**:
   - Логируйте все важные события безопасности
   - Настройте оповещения о подозрительной ��ктивности
   - Регулярно проверяйте журналы на предмет аномалий

---

## 10. Часто задаваемые вопросы

### 10.1 Общие вопросы

**В: Как изменить срок действия JWT-токена?**

О: Измените параметр `expiresIn` в конфигурации JwtModule в файле `auth.module.ts`:
```typescript
JwtModule.registerAsync({
  // ...
  useFactory: async () => ({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '2h' }, // Изменено с 1h на 2h
  }),
  // ...
}),
```

**В: Как добавить запрет одновременных сессий для одного пользователя?**

О: Реализуйте систему "белого списка" или "черного списка" токенов:
1. Создайте таблицу для хранения активных токенов
2. При входе пользователя отменяйте все предыдущие токены
3. Проверяйте действительность токена не только по подписи, но и по наличию в базе данных

**В: Как реализовать механизм восстановления пароля?**

О: Добавьте следующую функциональность:
1. Эндпоинт для запроса восстановления пароля (требует email)
2. Генерацию одноразовой ссылки с ограниченным сроком действия
3. Отправку ссылки на email пользователя
4. Эндпоинт для установки нового пароля с проверкой токена восстановления

### 10.2 Вопросы по ошибкам

**В: Почему возникает ошибка "Invalid token" при правильном пароле?**

О: Это может быть вызвано несколькими причинами:
1. Истек срок действия токена
2. Используется другой секретный ключ для проверки токена
3. Токен был сформирован некорректно

Проверьте, что секретный ключ в JWT_SECRET одинаков для создания и проверки токена.

**В: Почему не работает ролевая авторизация?**

О: Убедитесь, что:
1. Правильно настроен декоратор @Roles()
2. Добавлен RolesGuard в контроллер или глобально
3. В JWT токене присутствует поле role
4. Роль в токене совпадает с требуемой ролью по строгому сравнению

### 10.3 Вопросы по производительности

**В: Как оптимизировать запросы к базе данных?**

О: Следуйте этим рекомендациям:
1. Используйте select для выбора только необходимых полей
2. Применяйте индексы для часто используемых полей поиска
3. Используйте пакетные запросы вместо множества отдельных запросов
4. Кэшируйте данные, которые редко изменяются

**В: Как масштабировать систему аутентификации?**

О: Для масштабирования:
1. Переместите JWT-верификацию на уровень API-шлюза
2. Используйте Redis для хранения временных данных (черный список токенов)
3. Разделите сервис аутентификации на отдельный микросервис
4. Применяйте горизонтальное масштабирование для обработки большого количества запросов

### 10.4 Вопросы по безопасности

**В: Как защитить API от атак перебором пароля?**

О: Реализуйте следующие меры:
1. Ограничение количества попыток входа (например, 5 попыток в течение 15 минут)
2. Временная блокировка аккаунта после нескольких неудачных попыток
3. Увеличение задержки с каждой неудачной попыткой
4. Требование CAPTCHA после нескольких неудачных попыток

**В: Нужно ли обновлять JWT токены?**

О: Да, рекомендуется реализовать механизм обновления токенов:
1. Выдавайте клиенту два токена: access_token и refresh_token
2. Устанавливайте короткий срок действия для access_token (например, 15 минут)
3. Устанавливайте более длительный срок для refresh_token (например, 7 дней)
4. Когда access_token истекает, клиент использует refresh_token для получения нового набора токенов
5. При подозрительной активности отзывайте все refresh_token пользователя
