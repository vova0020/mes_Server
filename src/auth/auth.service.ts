import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Сервис для регистрации, логина и работы с JWT
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Регистрация нового пользователя
  async createUser(createUserDto: CreateUserDto) {
    const { username, password, roleName, fullName, phone, position } =
      createUserDto;

    // Хэширование пароля с помощью bcrypt (10 - число раундов)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Поиск роли по имени, если роль не найдена - создаем новую
    let role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: roleName },
      });
    }

    // Создаем пользователя с привязкой роли и дополнительными данными
    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: {
          connect: { id: role.id },
        },
        details: {
          create: {
            fullName,
            phone,
            position,
          },
        },
      },
      include: {
        details: true,
        role: true,
      },
    });
    return user;
  }

  // Валидация пользователя по логину и паролю
  async validateUser(username: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true, details: true },
    });
    // Сравнение хэшированного пароля
    if (user && (await bcrypt.compare(pass, user.password))) {
      // Не возвращаем поле password
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Неверное имя пользователя или пароль');
  }

  // Логин пользователя: проверка, генерация JWT и запись лога входа
  async login(loginDto: LoginDto, req: Request) {
    const { username, password } = loginDto;
    const user = await this.validateUser(username, password);

    // Генерация JWT токена с полезной нагрузкой (payload)
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role.name,
    };
    const token = this.jwtService.sign(payload);

    // Запись информации о входе: IP и user-agent, если доступны
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || null;
    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        ip,
        userAgent,
      },
    });

    return { message: 'Успешный вход', token, user };
  }
}
