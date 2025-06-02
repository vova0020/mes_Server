// // src/your/your.service.ts

// import { Injectable, NotFoundException } from '@nestjs/common';
// import { CreateYourDto } from './dto/create-your.dto';
// import { UpdateYourDto } from './dto/update-your.dto';

// /**
//  * @Injectable() — делает класс доступным для инъекции в контроллер.
//  * Здесь описывается вся «бизнес-логика» для работы с ресурсами.
//  */
// @Injectable()
// export class YourService {
//   // Простой массив вместо базы данных, для примера
//   private readonly items: any[] = [];

//   /**
//    * Создаёт новый объект на основе DTO.
//    * Здесь обычно вызывали бы ORM (Prisma, TypeORM) для записи в БД.
//    */
//   create(dto: CreateYourDto) {
//     // Формируем новый объект: id + все поля из dto
//     const newItem = {
//       id: Date.now(),  // временный ID, в реальности — автоинкремент
//       ...dto,
//     };
//     this.items.push(newItem);
//     return newItem;
//   }

//   /**
//    * Возвращает все объекты.
//    * В реальном приложении — пагинация, фильтры и т.п.
//    */
//   findAll() {
//     return this.items;
//   }

//   /**
//    * Ищет объект по ID.
//    * Если не найден — бросает ошибку 404.
//    */
//   findOne(id: number) {
//     const item = this.items.find(i => i.id === id);
//     if (!item) {
//       throw new NotFoundException(`Item with id ${id} not found`);
//     }
//     return item;
//   }

//   /**
//    * Обновляет объект.
//    * Сначала находит, потом копирует новые поля.
//    */
//   update(id: number, dto: UpdateYourDto) {
//     const item = this.findOne(id);
//     Object.assign(item, dto);  // копируем поля из dto в существующий объект
//     return item;
//   }

//   /**
//    * Удаляет объект из массива.
//    * Если индекс не найден — бросает 404.
//    */
//   remove(id: number) {
//     const index = this.items.findIndex(i => i.id === id);
//     if (index === -1) {
//       throw new NotFoundException(`Item with id ${id} not found`);
//     }
//     this.items.splice(index, 1);
//     return { deleted: true };
//   }
// }
