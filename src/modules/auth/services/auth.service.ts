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

    // Поиск пользователя по login (вместо username)
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

    // Получаем роли пользователя
    console.log('🎭 Обработка ролей пользователя...');
    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const primaryRole = roles[0];

    console.log('🎭 Роли пользователя:', roles);
    console.log('🎭 Основная роль:', primaryRole);

    // Формируем payload для JWT-токена
    const payload = {
      sub: user.userId,
      login: user.login,
      roles: roles,
      primaryRole: primaryRole,
    };

    console.log('🔐 JWT Payload:', payload);
    const token = this.jwtService.sign(payload);
    console.log('🔐 JWT Token сформирован, длина:', token.length);

    // Получаем данные о привязанных технологических этапах
    console.log('🏭 Получение assignments для пользователя...');
    const assignments = await this.getUserStageAssignments(user.userId, roles);
    console.log('🏭 Полученные assignments:', assignments);

    // Формируем полный ответ с токеном, информацией о пользователе и привязками
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

  // Получение привязанных технологических этапов для пользователя
  private async getUserStageAssignments(userId: number, roles: string[]) {
    console.log('🏭 === Начало получения assignments ===');
    console.log('🏭 UserId:', userId);
    console.log('🏭 Roles:', roles);

    const assignments: any = {};

    // Проверяем роли
    const isOperator = this.hasOperatorRole(roles);
    const isMaster = this.hasMasterRole(roles);
    const isPicker = this.hasPickerRole(roles);
    const isAdmin = this.hasAdminRole(roles);

    console.log('🏭 Проверка ролей:');
    console.log('🏭 - isOperator:', isOperator);
    console.log('🏭 - isMaster:', isMaster);
    console.log('🏭 - isPicker:', isPicker);
    console.log('🏭 - isAdmin:', isAdmin);

    // Для операторов и мастеров получаем технологические этапы
    if (isOperator || isMaster) {
      console.log('🏭 Получаем технологические этапы для оператора/мастера...');

      const stages = await this.prisma.productionStageLevel1.findMany({
        include: {
          productionStagesLevel2: true,
          linesStages: {
            include: {
              line: true,
            },
          },
        },
      });

      console.log('🏭 Найдено технологических этапов Level1:', stages.length);

      assignments.stages = stages.map((stage) => {
        const stageData = {
          id: stage.stageId,
          name: stage.stageName,
          description: stage.description,
          substages: stage.productionStagesLevel2.map((substage) => ({
            id: substage.substageId,
            name: substage.substageName,
            description: substage.description,
            allowance: substage.allowance,
          })),
          lines: stage.linesStages.map((ls) => ({
            id: ls.line.lineId,
            name: ls.line.lineName,
            type: ls.line.lineType,
          })),
        };

        console.log(`🏭 Этап ${stage.stageId} (${stage.stageName}):`, {
          subsStages: stage.productionStagesLevel2.length,
          lines: stage.linesStages.length,
        });

        return stageData;
      });

      console.log('🏭 Обработанные stages:', assignments.stages.length);
    }

    // Для операторов также получаем доступные станки
    if (isOperator) {
      console.log('🏭 Получаем станки для оператора...');

      const machines = await this.prisma.machine.findMany({
        include: {
          machinesStages: {
            include: {
              stage: true,
            },
          },
        },
      });

      console.log('🏭 Найдено станков:', machines.length);

      assignments.machines = machines.map((machine) => {
        const machineData = {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status,
          recommendedLoad: machine.recommendedLoad,
          loadUnit: machine.loadUnit,
          stages: machine.machinesStages.map((ms) => ({
            id: ms.stage.stageId,
            name: ms.stage.stageName,
          })),
        };

        console.log(
          `🏭 Станок ${machine.machineId} (${machine.machineName}):`,
          {
            status: machine.status,
            stages: machine.machinesStages.length,
          },
        );

        return machineData;
      });

      console.log('🏭 Обработанные machines:', assignments.machines.length);
    }

    // Для комплектовщиков получаем информацию о picker
    if (isPicker) {
      console.log('🏭 Получаем информацию picker для комплектовщика...');

      const picker = await this.prisma.picker.findFirst({
        where: { userId: userId },
      });

      console.log(
        '🏭 Найден picker:',
        picker ? `ID: ${picker.pickerId}` : 'Не найден',
      );

      if (picker) {
        assignments.picker = {
          id: picker.pickerId,
          userId: picker.userId,
        };
        console.log('🏭 Добавлен picker в assignments:', assignments.picker);
      }
    }

    console.log('🏭 === Финальные assignments ===');
    console.log(
      '🏭 stages:',
      assignments.stages ? assignments.stages.length : 'не задано',
    );
    console.log(
      '🏭 machines:',
      assignments.machines ? assignments.machines.length : 'не задано',
    );
    console.log('🏭 picker:', assignments.picker ? 'задано' : 'не задано');

    return assignments;
  }

  // Вспомогательные методы для проверки ролей
  private hasOperatorRole(roles: string[]): boolean {
    const result = roles.some(
      (role) =>
        role.toLowerCase().includes('operator') ||
        role.toLowerCase().includes('оператор'),
    );
    console.log('🎭 hasOperatorRole check:', roles, '=> result:', result);
    return result;
  }

  private hasMasterRole(roles: string[]): boolean {
    const result = roles.some(
      (role) =>
        role.toLowerCase().includes('master') ||
        role.toLowerCase().includes('мастер'),
    );
    console.log('🎭 hasMasterRole check:', roles, '=> result:', result);
    return result;
  }

  private hasPickerRole(roles: string[]): boolean {
    const result = roles.some(
      (role) =>
        role.toLowerCase().includes('picker') ||
        role.toLowerCase().includes('комплектовщик'),
    );
    console.log('🎭 hasPickerRole check:', roles, '=> result:', result);
    return result;
  }

  private hasAdminRole(roles: string[]): boolean {
    const result = roles.some(
      (role) =>
        role.toLowerCase().includes('admin') ||
        role.toLowerCase().includes('администратор'),
    );
    console.log('🎭 hasAdminRole check:', roles, '=> result:', result);
    return result;
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
