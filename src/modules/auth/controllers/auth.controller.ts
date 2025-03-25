import { Body, Controller, Post, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const token = await this.authService.validateUserAndGenerateToken(loginDto, req);
    return { token };
  }
}
