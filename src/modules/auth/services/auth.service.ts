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
    const ip = req ? (req.ip || 'unknown') : 'unknown';
    const userAgent = req ? (req.headers['user-agent'] || 'unknown') : 'unknown';

    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      // Логирование неудачной попытки: пользователь не найден
      await this.usersService.recordLoginLog(null, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // Логирование неудачной попытки: неверный пароль
      await this.usersService.recordLoginLog(user.id, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    // Логирование успешного входа
    await this.usersService.recordLoginLog(user.id, ip, userAgent, true);

    const payload = { sub: user.id, username: user.username, role: user.role.name };
    return this.jwtService.sign(payload);
  }
}
