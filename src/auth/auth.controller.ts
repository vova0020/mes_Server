import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Импортируем наш JWT Guard

// Контроллер для обработки HTTP-запросов регистрации и логина
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Эндпоинт для регистрации нового пользователя
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.createUser(createUserDto);
    return { message: 'Пользователь создан', user };
  }

  // Эндпоинт для входа в систему

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req);
  }
}
