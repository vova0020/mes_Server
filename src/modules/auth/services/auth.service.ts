import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from '../dto/login-response.dto';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    console.log('🔧 AuthService constructor initialized');
  }

  async validateUserAndGenerateToken(
    dto: LoginDto,
    req?: Request,
  ): Promise<LoginResponseDto> {
    console.log('🚀 === Начало процесса аутентификации ===');
    console.log('📋 Login DTO:', dto);

    const ip = req ? req.ip || 'unknown' : 'unknown';
    const userAgent = req ? req.headers['user-agent'] || 'unknown' : 'unknown';

    console.log('🌐 IP адрес:', ip);
    console.log('🖥️ User Agent:', userAgent);

    console.log('🔍 Поиск пользователя по login:', dto.username);
    const user = await this.prisma.user.findUnique({
      where: { login: dto.username },
      include: {
        userDetail: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log(
      '👤 Результат поиска пользователя:',
      user ? 'Найден' : 'Не найден',
    );
    if (user) {
      console.log('👤 ID пользователя:', user.userId);
      console.log('👤 Login пользователя:', user.login);
      console.log('👤 UserDetail:', user.userDetail);
      console.log('👤 UserRoles количество:', user.userRoles.length);
      console.log('👤 UserRoles детали:', user.userRoles);
    }

    if (!user) {
      console.log('❌ Пользователь не найден - логируем неудачную попытку');
      await this.recordLoginLog(null, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    console.log('🔒 Проверка пароля...');
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    console.log(
      '🔒 Результат проверки пароля:',
      isPasswordValid ? 'Верный' : 'Неверный',
    );

    if (!isPasswordValid) {
      console.log('❌ Неверный пароль - логируем неудачную попытку');
      await this.recordLoginLog(user.userId, ip, userAgent, false);
      throw new UnauthorizedException('Неверные учетные данные.');
    }

    console.log('✅ Пароль верный - логируем успешный вход');
    await this.recordLoginLog(user.userId, ip, userAgent, true);

    console.log('🎭 Обработка ролей пользователя...');
    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const primaryRole = roles[0];

    console.log('🎭 Роли пользователя:', roles);
    console.log('🎭 Основная роль:', primaryRole);

    const payload = {
      sub: user.userId,
      login: user.login,
      roles: roles,
      primaryRole: primaryRole,
    };

    console.log('🔐 JWT Payload:', payload);
    const token = this.jwtService.sign(payload);
    console.log('🔐 JWT Token сформирован, длина:', token.length);

    console.log('🏭 Получение assignments для пользователя...');
    const assignments = await this.getUserStageAssignments(user.userId, roles);
    console.log('🏭 Полученные assignments:', assignments);

    const response: LoginResponseDto = {
      token,
      user: {
        id: user.userId,
        login: user.login,
        roles: roles,
        primaryRole: primaryRole,
        fullName: user.userDetail
          ? `${user.userDetail.firstName} ${user.userDetail.lastName}`
          : undefined,
        firstName: user.userDetail?.firstName,
        lastName: user.userDetail?.lastName,
        position: user.userDetail?.position || undefined,
      },
      assignments,
    };

    console.log('📤 Финальный ответ LoginResponseDto:');
    console.log('📤 Token длина:', response.token.length);
    console.log('📤 User данные:', response.user);
    console.log('📤 Assignments:', response.assignments);
    console.log('✅ === Аутентификация завершена успешно ===');

    return response;
  }

  private async getUserStageAssignments(userId: number, roles: string[]) {
    console.log('🏭 === Начало получения assignments ===');
    console.log('🏭 UserId:', userId);
    console.log('🏭 Roles:', roles);

    const assignments: any = {};

    // Получаем все контекстные привязки пользователя
    const roleBindings = await this.prisma.roleBinding.findMany({
      where: { userId },
    });

    console.log('🏭 Найдено roleBindings:', roleBindings.length);

    // Группируем привязки по contextType
    const bindingsByType = roleBindings.reduce((acc, binding) => {
      const type = binding.contextType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(binding);
      return acc;
    }, {});

    console.log('🏭 bindingsByType:', Object.keys(bindingsByType));

    // Обрабатываем STAGE_LEVEL1
    if (bindingsByType['STAGE_LEVEL1']) {
      const stageIds = bindingsByType['STAGE_LEVEL1'].map(b => b.contextId);
      const stages = await this.prisma.productionStageLevel1.findMany({
        where: { stageId: { in: stageIds } },
        select: {
          stageId: true,
          stageName: true,
        },
      });

      assignments.stages = stages.map(stage => ({
        id: stage.stageId,
        name: stage.stageName,
      }));

      console.log('🏭 Обработанные stages:', assignments.stages.length);
    }

    // Обрабатываем MACHINE
    if (bindingsByType['MACHINE']) {
      const machineIds = bindingsByType['MACHINE'].map(b => b.contextId);
      const machines = await this.prisma.machine.findMany({
        where: { machineId: { in: machineIds } },
        select: {
          machineId: true,
          machineName: true,
        },
      });

      assignments.machines = machines.map(machine => ({
        id: machine.machineId,
        name: machine.machineName,
      }));

      console.log('🏭 Обработанные machines:', assignments.machines.length);
    }

    // Обрабатываем ORDER_PICKER
    if (bindingsByType['ORDER_PICKER']) {
      const pickerIds = bindingsByType['ORDER_PICKER'].map(b => b.contextId);
      const pickers = await this.prisma.picker.findMany({
        where: { pickerId: { in: pickerIds } },
        select: {
          pickerId: true,
          userId: true,
        },
      });

      assignments.pickers = pickers.map(picker => ({
        id: picker.pickerId,
        userId: picker.userId,
      }));

      console.log('🏭 Обработанные pickers:', assignments.pickers.length);
    }

    console.log('🏭 === Финальные assignments ===');
    console.log('🏭 stages:', assignments.stages ? assignments.stages.length : 'не задано');
    console.log('🏭 machines:', assignments.machines ? assignments.machines.length : 'не задано');
    console.log('🏭 pickers:', assignments.pickers ? assignments.pickers.length : 'не задано');

    return assignments;
  }

   // Запись лога входа в систему
  private async recordLoginLog(
    userId: number | null,
    ip: string,
    userAgent: string,
    success: boolean,
  ) {
    console.log('📝 === Запись лога входа ===');
    console.log('📝 UserId:', userId);
    console.log('📝 IP:', ip);
    console.log('📝 UserAgent:', userAgent);
    console.log('📝 Success:', success);

    try {
      await this.prisma.loginLog.create({
        data: {
          userId,
          ipAddress: ip,
          deviceInfo: userAgent,
          attemptTime: new Date(),
          success,
        },
      });
      console.log('📝 ✅ Лог входа успешно записан');
    } catch (error) {
      console.log('📝 ❌ Ошибка записи лога входа:', error);
    }
  }
}