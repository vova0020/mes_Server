// // src/your/your.controller.ts

// import {
//   Controller, // Декоратор для определения контроллера
//   Get, // Декоратор для HTTP GET-запросов
//   Post, // Декоратор для HTTP POST-запросов
//   Put, // Декоратор для HTTP PUT-запросов
//   Delete, // Декоратор для HTTP DELETE-запросов
//   Param, // Декоратор для параметров из URL (/:id)
//   Body, // Декоратор для тела запроса
// } from '@nestjs/common';
// import { YourService } from './your.service';
// import { CreateYourDto } from './dto/create-your.dto';
// import { UpdateYourDto } from './dto/update-your.dto';

// /**
//  * Декоратор @Controller задаёт префикс пути для всех методов этого класса.
//  * В данном случае все маршруты будут начинаться с "/your".
//  */
// @Controller('your')
// export class YourController {
//   /**
//    * Инъекция сервиса, чтобы можно было вызывать бизнес-логику.
//    */
//   constructor(private readonly yourService: YourService) {}

//   /**
//    * Обрабатывает POST /your
//    * Создаёт новый ресурс на основе данных DTO.
//    */
//   @Post()
//   create(@Body() dto: CreateYourDto) {
//     return this.yourService.create(dto);
//   }

//   /**
//    * Обрабатывает GET /your
//    * Возвращает список всех ресурсов.
//    */
//   @Get()
//   findAll() {
//     return this.yourService.findAll();
//   }

//   /**
//    * Обрабатывает GET /your/:id
//    * Возвращает один ресурс по ID из URL.
//    */
//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     // +id — преобразуем строку в число
//     return this.yourService.findOne(+id);
//   }

//   /**
//    * Обрабатывает PUT /your/:id
//    * Обновляет существующий ресурс.
//    */
//   @Put(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateYourDto) {
//     return this.yourService.update(+id, dto);
//   }

//   /**
//    * Обрабатывает DELETE /your/:id
//    * Удаляет ресурс.
//    */
//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.yourService.remove(+id);
//   }
// }
