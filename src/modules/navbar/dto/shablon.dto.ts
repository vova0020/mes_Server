// // src/your/dto/create-your.dto.ts

// import { IsString, IsOptional, IsNumber } from 'class-validator';

// /**
//  * DTO (Data Transfer Object) для создания ресурса.
//  * Здесь описываем только те поля, которые приходят из запроса.
//  * Класс-валидатор автоматически проверит их типы.
//  */
// export class CreateYourDto {
//   @IsString() // поле обязательно и должно быть строкой
//   readonly name: string;

//   @IsOptional() // поле может отсутствовать
//   @IsNumber() // но если есть — должно быть числом
//   readonly count?: number;

//   // Добавь другие поля по аналогии:
//   // @IsBoolean() readonly isActive: boolean;
//   // @IsDateString() readonly startDate: string;
// }
