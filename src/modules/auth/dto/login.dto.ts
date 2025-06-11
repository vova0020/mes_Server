import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Логин пользователя',
    example: 'user123',
  })
  @IsString({
    message: 'Логин должен быть строкой',
  })
  @IsNotEmpty({
    message: 'Логин не может быть пустым',
  })
  username: string; // Остается username для совместимости с фронтендом, но маппится на login в БД

  @ApiProperty({
    description: 'Пароль пользователя',
    example: 'password123',
    minLength: 4,
  })
  @IsString({
    message: 'Пароль должен быть строкой',
  })
  @IsNotEmpty({
    message: 'Пароль не может быть пустым',
  })
  @MinLength(4, {
    message: 'Пароль должен содержать не менее 4 символов',
  })
  password: string;
}
