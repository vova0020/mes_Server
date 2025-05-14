import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from '../dto/login-response.dto';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUserAndGenerateToken(
    dto: LoginDto,
    req?: Request,
  ): Promise<LoginResponseDto> {
    const ip = req ? req.ip || 'unknown' : 'unknown';
    const userAgent = req ? req.headers['user-agent'] || 'unknown' : 'unknown';

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

    // Формируем payload для JWT-токена
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role.name,
    };
    const token = this.jwtService.sign(payload);

    // Получаем данные о привязках пользователя в зависимости от роли
    const assignments = await this.getUserAssignments(user.id, user.role.name);

    // Формируем полный ответ с токеном, информацией о пользователе и привязками
    const response: LoginResponseDto = {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,
        fullName: user.details?.fullName,
      },
      assignments,
    };

    return response;
  }

  // Получение привязок пользователя в зависимости от роли
  private async getUserAssignments(userId: number, roleName: string) {
    const assignments: any = {};

    switch (roleName.toLowerCase()) {
      case 'operator':
      case 'ypakoperator':
      case 'nosmen':
        // Для операторов получаем привязанные станки
        const machines = await this.prisma.machine.findMany({
          where: {
            assignedOperators: {
              some: {
                id: userId,
              },
            },
          },
          include: {
            segment: true,
          },
        });

        assignments.machines = machines.map((machine) => ({
          id: machine.id,
          name: machine.name,
          status: machine.status,
          segmentId: machine.segmentId,
          segmentName: machine.segment?.name,
        }));
        break;

      case 'master':
      case 'ypakmaster':
        // Для мастеров получаем контролируемые участки
        const segments = await this.prisma.productionSegment.findMany({
          where: {
            supervisors: {
              some: {
                id: userId,
              },
            },
          },
          include: {
            line: true,
          },
        });

        assignments.segments = segments.map((segment) => ({
          id: segment.id,
          name: segment.name,
          lineId: segment.lineId,
          lineName: segment.line.name,
        }));
        break;

      case 'admin':
      case 'complect':
        // Для администраторов можно вернуть полный доступ или специфичную информацию
        // В данном случае оставляем пустым, так как админы имеют доступ ко всему
        break;

      default:
        // Для неизвестных ролей возвращаем пустой объект
        break;
    }

    return assignments;
  }
}
