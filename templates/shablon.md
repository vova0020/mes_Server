# Шаблоны файлов NestJS с подробными комментариями

Ниже приведены четыре ключевых файла для любого ресурса (`Your` → `your`), снабжённые максимально подробными комментариями: что делает каждая строка, какой декоратор или импорт можно добавить и для чего он нужен.

---

## 1. Контроллер (`your.controller.ts`)

```ts
// Базовые импорты из NestJS для контроллеров
import {
  Controller,           // Объявляет класс контроллером, связывает URL-путь и методы
  Get,                  // Декоратор для метода, обрабатывающего HTTP GET
  Post,                 // Декоратор для метода, обрабатывающего HTTP POST
  Put,                  // Декоратор для метода, обрабатывающего HTTP PUT
  Delete,               // Декоратор для метода, обрабатывающего HTTP DELETE
  Param,                // Извлекает переменные из URL (например, /your/:id)
  Query,                // Извлекает query-параметры (?page=1&limit=10)
  Body,                 // Извлекает тело запроса (POST/PUT)
  Headers,              // Извлекает заголовки HTTP
  Req,                  // Доступ к объекту Request (Express/Fastify)
  HttpCode,             // Позволяет вернуть нестандартный HTTP-код
  HttpStatus,           // Перечисление статусов (200, 201, 404 и т.д.)
  UseGuards,            // Применяет Guard (например, для авторизации)
  UsePipes,             // Применяет Pipe (например, ValidationPipe)
  UseInterceptors,      // Применяет Interceptor (логирование, трансформация)
  UseFilters            // Применяет фильтры ошибок (ExceptionFilter)
} from '@nestjs/common';

// Расширенные импорты для Swagger (документация OpenAPI)
import {
  ApiTags,              // Группирует эндпоинты в Swagger UI
  ApiOperation,         // Описывает назначение метода
  ApiResponse,          // Описывает возможные ответы (статус, тип, описание)
  ApiParam,             // Описывает параметры URL
  ApiQuery,             // Описывает query-параметры
  ApiBody,              // Описывает тело запроса
  ApiBearerAuth         // Указывает, что нужен Bearer-токен (JWT)
} from '@nestjs/swagger';

// Импортируем сервис и DTO
import { YourService } from './your.service';
import { CreateYourDto } from './dto/create-your.dto';
import { UpdateYourDto } from './dto/update-your.dto';

// @ApiTags объединяет все методы контроллера в группу "your" в Swagger UI
@ApiTags('your')
// @UseGuards — здесь можно подключить, например, AuthGuard('jwt') для проверки JWT
@UseGuards(/* AuthGuard('jwt') */)
// @UsePipes — подключаем ValidationPipe для автоматической валидации DTO
@UsePipes(/* new ValidationPipe({ whitelist: true, transform: true }) */)
// @UseInterceptors — добавляем, например, ClassSerializerInterceptor для трансформации объектов
@UseInterceptors(/* ClassSerializerInterceptor */)
// Объявляем контроллер с базовым путём '/your'
@Controller('your')
export class YourController {
  // Инжектим сервис, чтобы не писать логику в контроллере
  constructor(private readonly yourService: YourService) {}

  /**
   * Создание нового ресурса
   * HTTP: POST /your
   */
  @Post()
  @HttpCode(HttpStatus.CREATED) // Возвращаем статус 201 вместо 200
  @ApiOperation({ summary: 'Создать новый ресурс your' })
  @ApiResponse({ status: 201, description: 'Ресурс создан', type: CreateYourDto })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiBearerAuth() // Указывает, что нужен JWT в заголовке Authorization
  create(
    @Body() dto: CreateYourDto // Валидация и мэппинг тела запроса по CreateYourDto
  ) {
    return this.yourService.create(dto);
  }

  /**
   * Получение списка ресурсов
   * HTTP: GET /your
   */
  @Get()
  @ApiOperation({ summary: 'Получить список ресурсов your' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы для пагинации' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество элементов на странице' })
  @ApiResponse({ status: 200, description: 'Список ресурсов', type: [CreateYourDto] })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.yourService.findAll();
  }

  /**
   * Получение одного ресурса по ID
   * HTTP: GET /your/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Получить ресурс your по ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID ресурса' })
  @ApiResponse({ status: 200, description: 'Найденный ресурс', type: CreateYourDto })
  @ApiResponse({ status: 404, description: 'Не найдено' })
  findOne(
    @Param('id') id: string,               // id из URL
    @Headers('authorization') authHeader?: string // пример доступа к заголовкам
  ) {
    // +id преобразует строку в число
    return this.yourService.findOne(+id);
  }

  /**
   * Обновление ресурса
   * HTTP: PUT /your/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Обновить ресурс your' })
  @ApiParam({ name: 'id', type: Number, description: 'ID ресурса' })
  @ApiBody({ type: UpdateYourDto })
  @ApiResponse({ status: 200, description: 'Ресурс обновлён', type: UpdateYourDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateYourDto,
    @Req() req // полный объект запроса (Express/ Fastify)
  ) {
    return this.yourService.update(+id, dto);
  }

  /**
   * Удаление ресурса
   * HTTP: DELETE /your/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Удалить ресурс your' })
  @ApiParam({ name: 'id', type: Number, description: 'ID ресурса' })
  @ApiResponse({ status: 200, description: 'Ресурс удалён' })
  @ApiResponse({ status: 404, description: 'Не найдено' })
  remove(@Param('id') id: string) {
    return this.yourService.remove(+id);
  }
}
```

**Что можно добавить/изменить в контроллере:**

* **Middleware** (например, логгирование, CORS) на уровне модуля или глобально.
* **Guards** (`AuthGuard`, кастомные) для защиты маршрутов.
* **Pipes** (`ValidationPipe`, `ParseIntPipe`) для валидации и преобразования параметров.
* **Interceptors** (`TimeoutInterceptor`, `CacheInterceptor`).
* **Exception Filters** для централизованной обработки ошибок.
* **Swagger**: дополнительные декораторы (`@ApiDeprecated`, `@ApiCookieAuth`).

---

## 2. Сервис (`your.service.ts`)

```ts
import {
  Injectable,           // Позволяет NestJS инжектировать сервис
  NotFoundException,    // Исключение для возвращения 404 ошибки
  BadRequestException,  // Исключение для 400
  ForbiddenException    // Исключение для 403
} from '@nestjs/common';
import { CreateYourDto } from './dto/create-your.dto';
import { UpdateYourDto } from './dto/update-your.dto';

/**
 * @Injectable говорит NestJS, что сервис можно внедрять в контроллеры.
 * Здесь реализуется вся бизнес-логика: работа с БД, внешними API и т.д.
 */
@Injectable()
export class YourService {
  // Пример хранения: временный массив. В реальности замените на ORM/Prisma.
  private readonly items: any[] = [];

  /**
   * Создание ресурса
   * Обычно здесь вы бы вызывали репозиторий/Prisma/TypeORM.
   */
  create(dto: CreateYourDto) {
    const newItem = {
      id: Date.now(), // временная генерация ID
      ...dto         // все поля из dto
    };
    this.items.push(newItem);
    return newItem;
  }

  /**
   * Получение всех ресурсов
   * Можно добавить пагинацию, фильтры или сортировку.
   */
  findAll() {
    return this.items;
  }

  /**
   * Получение одного ресурса по ID
   * Если не найден — бросаем NotFoundException (404).
   */
  findOne(id: number) {
    const item = this.items.find(i => i.id === id);
    if (!item) {
      throw new NotFoundException(`Элемент с id=${id} не найден`);
    }
    return item;
  }

  /**
   * Обновление ресурса
   * Ищем через findOne, потом обновляем поля.
   */
  update(id: number, dto: UpdateYourDto) {
    const item = this.findOne(id);
    Object.assign(item, dto); // копируем новые поля в объект
    return item;
  }

  /**
   * Удаление ресурса
   * Если элемент не найден — NotFoundException.
   */
  remove(id: number) {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) {
      throw new NotFoundException(`Элемент с id=${id} не найден`);
    }
    this.items.splice(index, 1);
    return { deleted: true };
  }
}
```

**Что можно добавить/изменить в сервисе:**

* **Инъекция репозитория** (`constructor(private prisma: PrismaService)`) для работы с БД.
* **Кастомные ошибки** с разными кодами (400, 403 и т.п.).
* **Кэширование** (например, `CacheKey`, `CacheTTL` из `@nestjs/common`).
* **Логирование** через `Logger` или сторонние библиотеки.

---

## 3. DTO (`create-your.dto.ts` и `update-your.dto.ts`)

```ts
// src/your/dto/create-your.dto.ts

import {
  IsString,          // Проверка, что поле строка
  IsNumber,          // Проверка, что поле число
  IsOptional,        // Поле необязательное
  IsBoolean,         // Проверка, что поле boolean
  IsDateString,      // Проверка, что строка в формате ISO-даты
  Min, Max,          // Числовые ограничения
  Length,            // Длина строки
  Matches            // Регулярное выражение
} from 'class-validator';
import { Type } from 'class-transformer'; // Для преобразования типов (строка → число и т.д.)

/**
 * DTO — Data Transfer Object.
 * Определяет набор полей, которые можно принимать в запросе,
 * а также правила их валидации.
 */
export class CreateYourDto {
  @IsString({ message: 'Название должно быть строкой' })
  @Length(2, 50, { message: 'Длина от 2 до 50 символов' })
  readonly name: string;              // Обязательное строковое поле

  @IsOptional()
  @Type(() => Number)                 // Преобразует входящую строку в число
  @IsNumber({}, { message: 'count должен быть числом' })
  @Min(0, { message: 'count не может быть отрицательным' })
  readonly count?: number;            // Необязательное числовое поле

  @IsOptional()
  @IsDateString({ message: 'startDate должен быть датой в формате ISO' })
  readonly startDate?: string;        // Необязательное поле-дата

  @IsOptional()
  @IsBoolean({ message: 'isActive должно быть true/false' })
  readonly isActive?: boolean;        // Необязательное boolean
}
```

```ts
// src/your/dto/update-your.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateYourDto } from './create-your.dto';

/**
 * UpdateYourDto имеет все поля CreateYourDto, но все они становятся необязательными.
 * Удобно для частичного обновления (PATCH/PUT).
 */
export class UpdateYourDto extends PartialType(CreateYourDto) {}
```

**Что можно добавить в DTO:**

* **Кастомные валидаторы** (`@Validate(CustomValidator)`).
* **Группы валидации** (`@ValidateIf`).
* **Трансформацию дат и чисел** через `class-transformer` (`@Type()`).

---

## 4. Модуль (`your.module.ts`)

```ts
import { Module, Global } from '@nestjs/common';
// Вы можете объявить модуль глобальным через @Global(), чтобы его провайдеры были видны везде.

import { YourController } from './your.controller';
import { YourService } from './your.service';

// Дополнительные зависимости модуля:
// import { PrismaModule } from '../prisma/prisma.module';
// import { AuthModule } from '../auth/auth.module';
// import { CacheModule } from '@nestjs/common';

@Global() // Если хотите, чтобы сервис был доступен глобально без импорта модуля.
@Module({
  imports: [
    // Сюда импортируем модули, от которых зависит логика:
    // PrismaModule, AuthModule, CacheModule.register(), и т.д.
  ],
  controllers: [YourController], // Контроллеры этого модуля
  providers: [YourService],      // Сервисы, репозитории и пр.
  exports: [YourService]         // Экспортируем сервис, чтобы другие модули могли его использовать
})
export class YourModule {}
```

**Что ещё можно добавить в модуль:**

* **CacheModule** (`CacheModule.register({ ttl: 5 }),`) для настройки кеширования.
* **ConfigModule** (`ConfigModule.forRoot()`), **MongooseModule**, **TypeOrmModule**, **ScheduleModule**, **MailerModule** и др.
* **Guard/Interceptor/Filter** на уровне модуля в `providers` с `APP_GUARD`, `APP_INTERCEPTOR`, `APP_FILTER`.

---

Теперь у тебя есть максимально подробные шаблоны со всеми возможными импортами и декораторами, понятными даже новичку без опыта!
