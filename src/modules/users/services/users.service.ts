import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Пользователь с таким логином уже существует.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: { connect: { id: dto.roleId } },
        details:
          dto.fullName || dto.phone || dto.position || dto.salary
            ? {
                create: {
                  fullName: dto.fullName || '',
                  phone: dto.phone,
                  position: dto.position,
                  salary: dto.salary,
                },
              }
            : undefined,
      },
    });

    return newUser;
  }

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Пользователь не найден.');
    }
    return await this.prisma.user.delete({ where: { id: userId } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });
  }

  // Новый метод для записи логов входа
  async recordLoginLog(
    userId: number | null,
    ip: string,
    userAgent: string,
    success: boolean,
  ) {
    return this.prisma.loginLog.create({
      data: {
        userId: userId, // Может быть null для неудачных попыток, когда пользователь не найден
        ip,
        userAgent,
        success,
      },
    });
  }
}
