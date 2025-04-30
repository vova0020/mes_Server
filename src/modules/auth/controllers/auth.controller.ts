import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { Request } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({
    status: 200,
    description: 'Успешная авторизация',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Неверные учетные данные',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    return this.authService.validateUserAndGenerateToken(loginDto, req);
  }
}
