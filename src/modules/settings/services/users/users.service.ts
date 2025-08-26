import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';

import { PickersService } from './pickers.service';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../../dto/users/user-management.dto';
import {
  CreateUserRoleDto,
  CreateRoleBindingDto,
  UpdateRoleBindingDto,
  UserRolesResponseDto,
  UserRoleType,
  RoleContextType,
} from '../../dto/users/user-roles.dto';
import {
  CreatePickerDto,
  UpdatePickerDto,
  PickerResponseDto,
  CreatePickerWithRoleDto,
  PickerWithRoleResponseDto,
} from '../../dto/users/picker-management.dto';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pickersService: PickersService,
    private readonly socketService: SocketService,
  ) { }

  // ========================================
  // CRUD операции с пользователями
  // ========================================

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Создание нового пользователя: ${createUserDto.login}`);

    try {
      // Проверяем уникальность логина
      const existingUser = await this.prisma.user.findUnique({
        where: { login: createUserDto.login },
      });

      if (existingUser) {
        throw new ConflictException(
          `Пользователь с логином "${createUserDto.login}" уже существует`,
        );
      }

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Создаём пользователя с деталями в транзакции
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            login: createUserDto.login,
            password: hashedPassword,
          },
        });

        await tx.userDetail.create({
          data: {
            userId: newUser.userId,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            phone: createUserDto.phone,
            position: createUserDto.position,
            salary: createUserDto.salary,
          },
        });

        return tx.user.findUnique({
          where: { userId: newUser.userId },
          include: { userDetail: true },
        });
      });

      // Проверяем, что user не null
      if (!user) {
        throw new Error('Не удалось создать пользователя');
      }

      this.logger.log(
        `Пользователь создан успешно: ID ${user.userId}, логин: ${user.login}`,
      );

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

      return this.formatUserResponse(user);
    } catch (error) {
      this.logger.error(
        `Ошибка создания пользователя: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    this.logger.log('Получение списка всех пользователей');

    const users = await this.prisma.user.findMany({
      include: { userDetail: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.formatUserResponse(user));
  }

  async getUserById(userId: number): Promise<UserResponseDto> {
    this.logger.log(`Получение пользователя по ID: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { userDetail: true },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    return this.formatUserResponse(user);
  }

  async updateUser(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Обновление пользователя ID: ${userId}`);

    try {
      // Проверяем существование пользователя
      const existingUser = await this.prisma.user.findUnique({
        where: { userId },
        include: { userDetail: true },
      });

      if (!existingUser) {
        throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
      }

      // Проверяем уникальность логина при обновлении
      if (updateUserDto.login && updateUserDto.login !== existingUser.login) {
        const loginExists = await this.prisma.user.findUnique({
          where: { login: updateUserDto.login },
        });

        if (loginExists) {
          throw new ConflictException(
            `Пользователь с логином "${updateUserDto.login}" уже существует`,
          );
        }
      }

      // Обновляем в транзакции
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        // Обновляем основную информацию пользователя
        const userUpdateData: any = {};
        if (updateUserDto.login) userUpdateData.login = updateUserDto.login;
        if (updateUserDto.password) {
          userUpdateData.password = await bcrypt.hash(
            updateUserDto.password,
            10,
          );
        }

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { userId },
            data: userUpdateData,
          });
        }

        // Обновляем детали пользователя
        const detailUpdateData: any = {};
        if (updateUserDto.firstName)
          detailUpdateData.firstName = updateUserDto.firstName;
        if (updateUserDto.lastName)
          detailUpdateData.lastName = updateUserDto.lastName;
        if (updateUserDto.phone !== undefined)
          detailUpdateData.phone = updateUserDto.phone;
        if (updateUserDto.position !== undefined)
          detailUpdateData.position = updateUserDto.position;
        if (updateUserDto.salary !== undefined)
          detailUpdateData.salary = updateUserDto.salary;

        if (Object.keys(detailUpdateData).length > 0) {
          await tx.userDetail.update({
            where: { userId },
            data: detailUpdateData,
          });
        }

        return tx.user.findUnique({
          where: { userId },
          include: { userDetail: true },
        });
      });

      // Проверяем, что updatedUser не null
      if (!updatedUser) {
        throw new Error('Не удалось обновить пользователя');
      }

      this.logger.log(`Пользователь обновлён успешно: ID ${userId}`);

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

      return this.formatUserResponse(updatedUser);
    } catch (error) {
      this.logger.error(
        `Ошибка обновления пользователя ID ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    this.logger.log(`Удаление пользователя ID: ${userId}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: { userDetail: true },
      });

      if (!user) {
        throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
      }

      await this.prisma.user.delete({
        where: { userId },
      });

      this.logger.log(
        `Пользователь удалён успешно: ID ${userId}, логин: ${user.login}`,
      );

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

    } catch (error) {
      this.logger.error(
        `Ошибка удаления пользователя ID ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========================================
  // Управление ролями и привязками
  // ========================================

  async assignGlobalRole(createUserRoleDto: CreateUserRoleDto): Promise<void> {
    this.logger.log(
      `Назначение глобальной роли ${createUserRoleDto.role} пользователю ID: ${createUserRoleDto.userId}`,
    );

    try {
      // Проверяем существование пользователя
      await this.validateUserExists(createUserRoleDto.userId);

      // Получаем или создаём роль
      const role = await this.getOrCreateRole(createUserRoleDto.role);

      // Проверяем, не назначена ли уже эта роль
      const existingUserRole = await this.prisma.userRole.findFirst({
        where: {
          userId: createUserRoleDto.userId,
          roleId: role.roleId,
        },
      });

      if (existingUserRole) {
        throw new ConflictException(
          `Роль "${createUserRoleDto.role}" уже назначена пользователю`,
        );
      }

      // Назначаем роль
      await this.prisma.userRole.create({
        data: {
          userId: createUserRoleDto.userId,
          roleId: role.roleId,
        },
      });

      this.logger.log(
        `Глобальная роль назначена успешно: ${createUserRoleDto.role} -> пользователь ID ${createUserRoleDto.userId}`,
      );

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

    } catch (error) {
      this.logger.error(
        `Ошибка назначения глобальной роли: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createRoleBinding(
    createRoleBindingDto: CreateRoleBindingDto,
  ): Promise<void> {
    this.logger.log(
      `Создание контекстной привязки роли ${createRoleBindingDto.role} для пользователя ID: ${createRoleBindingDto.userId}`,
    );

    try {
      // Валидируем данные
      await this.validateUserExists(createRoleBindingDto.userId);
      await this.validateContextualRole(
        createRoleBindingDto.role,
        createRoleBindingDto.contextType,
      );
      await this.validateContextObject(
        createRoleBindingDto.contextType,
        createRoleBindingDto.contextId,
      );

      // Получаем или создаём роль
      const role = await this.getOrCreateRole(createRoleBindingDto.role);

      // Проверяем на дублирование привязки
      const existingBinding = await this.prisma.roleBinding.findFirst({
        where: {
          userId: createRoleBindingDto.userId,
          roleId: role.roleId,
          contextType: this.mapDtoContextTypeToPrisma(createRoleBindingDto.contextType),
          contextId: createRoleBindingDto.contextId,
        },
      });

      if (existingBinding) {
        throw new ConflictException('Такая привязка роли уже существует');
      }

      // Создаём привязку
      await this.prisma.roleBinding.create({
        data: {
          userId: createRoleBindingDto.userId,
          roleId: role.roleId,
          contextType: this.mapDtoContextTypeToPrisma(createRoleBindingDto.contextType),
          contextId: createRoleBindingDto.contextId,
        },
      });

      // Получаем название объекта контекста для уведомления
      const contextName = await this.getContextObjectName(
        createRoleBindingDto.contextType,
        createRoleBindingDto.contextId,
      );

      // Получаем ID созданной привязки
      const createdBinding = await this.prisma.roleBinding.findFirst({
        where: {
          userId: createRoleBindingDto.userId,
          roleId: role.roleId,
          contextType: this.mapDtoContextTypeToPrisma(createRoleBindingDto.contextType),
          contextId: createRoleBindingDto.contextId,
        },
      });

      this.logger.log(
        `Контекстная привязка создана успешно: ${createRoleBindingDto.role} -> ${createRoleBindingDto.contextType}:${createRoleBindingDto.contextId}`,
      );

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

    } catch (error) {
      this.logger.error(
        `Ошибка создания контекстной привязки: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserRoles(userId: number): Promise<UserRolesResponseDto> {
    this.logger.log(`Получение ролей пользователя ID: ${userId}`);

    await this.validateUserExists(userId);

    // Получаем глобальные роли
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    // Получаем контекстные привязки
    const roleBindings = await this.prisma.roleBinding.findMany({
      where: { userId },
      include: { role: true },
    });

    // Получаем названия объектов контекста
    const bindingsWithNames = await Promise.all(
      roleBindings.map(async (binding) => {
        const contextName = await this.getContextObjectName(
          this.mapPrismaContextTypeToDto(binding.contextType),
          binding.contextId,
        );
        return {
          id: binding.id,
          role: binding.role.roleName as UserRoleType,
          contextType: this.mapPrismaContextTypeToDto(binding.contextType),
          contextId: binding.contextId,
          contextName,
        };
      }),
    );

    return {
      userId,
      globalRoles: userRoles.map((ur) => ur.role.roleName as UserRoleType),
      roleBindings: bindingsWithNames,
    };
  }

  async removeGlobalRole(userId: number, role: UserRoleType): Promise<void> {
    this.logger.log(
      `Удаление глобальной роли ${role} у пользователя ID: ${userId}`,
    );

    try {
      await this.validateUserExists(userId);

      const roleRecord = await this.prisma.role.findFirst({
        where: { roleName: role },
      });

      if (!roleRecord) {
        throw new NotFoundException(`Роль "${role}" не найдена`);
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userId,
          roleId: roleRecord.roleId,
        },
      });

      if (!userRole) {
        throw new NotFoundException(`Роль "${role}" не назначена пользователю`);
      }

      await this.prisma.userRole.delete({
        where: { userRoleId: userRole.userRoleId },
      });

      this.logger.log(
        `Глобальная роль удалена успешно: ${role} у пользователя ID ${userId}`,
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

    } catch (error) {
      this.logger.error(
        `Ошибка удаления глобальной роли: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async removeRoleBinding(bindingId: number): Promise<void> {
    this.logger.log(`Удаление контекстной привязки ID: ${bindingId}`);

    try {
      const binding = await this.prisma.roleBinding.findUnique({
        where: { id: bindingId },
        include: { role: true },
      });

      if (!binding) {
        throw new NotFoundException(`Привязка с ID ${bindingId} не найдена`);
      }

      await this.prisma.roleBinding.delete({
        where: { id: bindingId },
      });

      // Получаем название объекта контекста для уведомления
      const contextName = await this.getContextObjectName(
        this.mapPrismaContextTypeToDto(binding.contextType),
        binding.contextId,
      );

      this.logger.log(`Контекстная привязка удалена успешно: ID ${bindingId}`);
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:technologist',
          'room:masterypack',
          'room:director',
        ],
        'user:event',
        { status: 'updated' },
      );

    } catch (error) {
      this.logger.error(
        `Ошибка удаления контекстной привязки: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========================================
  // Методы для получения списков объектов привязки
  // ========================================

  async getMachinesForBinding(): Promise<{ machines: Array<{ machineId: number; machineName: string }> }> {
    this.logger.log('Получение списка станков для привязки');

    try {
      const machines = await this.prisma.machine.findMany({
        select: {
          machineId: true,
          machineName: true,
        },
        orderBy: { machineName: 'asc' },
      });

      this.logger.log(`Получено ${machines.length} станков для привязки`);
      return { machines };
    } catch (error) {
      this.logger.error(
        `Ошибка получения списка станков: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Не удалось получить список станков');
    }
  }

  async getStagesForBinding(): Promise<{ stages: Array<{ stageId: number; stageName: string }> }> {
    this.logger.log('Получение списка этапов для привязки');

    try {
      const stages = await this.prisma.productionStageLevel1.findMany({
        select: {
          stageId: true,
          stageName: true,
        },
        orderBy: { stageName: 'asc' },
      });

      this.logger.log(`Получено ${stages.length} этапов для привязки`);
      return { stages };
    } catch (error) {
      this.logger.error(
        `Ошибка получения списка этапов: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Не удалось получить список этапов');
    }
  }

  async getPickersForBinding(): Promise<{ pickers: Array<{ pickerId: number; pickerName: string }> }> {
    this.logger.log('Получение списка комплектовщиков для привязки - делегирование в PickersService');
    return await this.pickersService.getPickersForBinding();
  }

  // ========================================
  // Методы для работы с комплектовщиками (делегирование в PickersService)
  // ========================================

  async createPicker(createPickerDto: CreatePickerDto): Promise<PickerResponseDto> {
    this.logger.log(`Создание комплектовщика через UsersService - делегирование в PickersService`);
    return await this.pickersService.createPicker(createPickerDto);
  }

  async createPickerWithRole(
    createPickerWithRoleDto: CreatePickerWithRoleDto,
  ): Promise<PickerWithRoleResponseDto> {
    this.logger.log(`Создание комплектовщика с ролью через UsersService - делегирование в PickersService`);
    return await this.pickersService.createPickerWithRole(createPickerWithRoleDto);
  }

  async getAllPickers(): Promise<PickerResponseDto[]> {
    this.logger.log('Получение всех комплектовщиков через UsersService - делегирование в PickersService');
    return await this.pickersService.getAllPickers();
  }

  async getPickerById(pickerId: number): Promise<PickerResponseDto> {
    this.logger.log(`Получение комплектовщика по ID через UsersService - делегирование в PickersService`);
    return await this.pickersService.getPickerById(pickerId);
  }

  async getPickerByUserId(userId: number): Promise<PickerResponseDto> {
    this.logger.log(`Получение комплектовщика по userId через UsersService - делегирование в PickersService`);
    return await this.pickersService.getPickerByUserId(userId);
  }

  async updatePicker(
    pickerId: number,
    updatePickerDto: UpdatePickerDto,
  ): Promise<PickerResponseDto> {
    this.logger.log(`Обновление комплектовщика через UsersService - делегирование в PickersService`);
    return await this.pickersService.updatePicker(pickerId, updatePickerDto);
  }

  async deletePicker(pickerId: number): Promise<void> {
    this.logger.log(`Удаление комплектовщика через UsersService - делегирование в PickersService`);
    return await this.pickersService.deletePicker(pickerId);
  }

  // ========================================
  // Вспомогательные методы
  // ========================================

  private getChangesFromUpdateDto(updateDto: UpdateUserDto): Record<string, boolean> {
    const changes: Record<string, boolean> = {};

    if (updateDto.login !== undefined) changes.login = true;
    if (updateDto.password !== undefined) changes.password = true;
    if (updateDto.firstName !== undefined) changes.firstName = true;
    if (updateDto.lastName !== undefined) changes.lastName = true;
    if (updateDto.phone !== undefined) changes.phone = true;
    if (updateDto.position !== undefined) changes.position = true;
    if (updateDto.salary !== undefined) changes.salary = true;

    return changes;
  }

  private formatUserResponse(user: any): UserResponseDto {
    return {
      userId: user.userId,
      login: user.login,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userDetail: user.userDetail
        ? {
          firstName: user.userDetail.firstName,
          lastName: user.userDetail.lastName,
          phone: user.userDetail.phone,
          position: user.userDetail.position,
          salary: user.userDetail.salary,
        }
        : undefined,
    };
  }

  private async validateUserExists(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
  }

  private async getOrCreateRole(roleName: UserRoleType): Promise<any> {
    let role = await this.prisma.role.findFirst({
      where: { roleName },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: { roleName },
      });
      this.logger.log(`Создана новая роль: ${roleName}`);
    }

    return role;
  }

  private validateContextualRole(
    role: UserRoleType,
    contextType: RoleContextType,
  ): void {
    const allowedRoles: Record<RoleContextType, UserRoleType[]> = {
      [RoleContextType.MACHINE]: [UserRoleType.WORKPLACE],
      [RoleContextType.STAGE_LEVEL1]: [
        UserRoleType.MASTER,
        UserRoleType.OPERATOR,
      ],
      [RoleContextType.ORDER_PICKER]: [UserRoleType.ORDER_PICKER],
    };

    if (!allowedRoles[contextType].includes(role)) {
      throw new BadRequestException(
        `Роль "${role}" не может быть привязана к контексту "${contextType}". ` +
        `Допустимые роли: ${allowedRoles[contextType].join(', ')}`,
      );
    }
  }

  private async validateContextObject(
    contextType: RoleContextType,
    contextId: number,
  ): Promise<void> {
    let exists = false;

    switch (contextType) {
      case RoleContextType.MACHINE:
        const machine = await this.prisma.machine.findUnique({
          where: { machineId: contextId },
        });
        exists = !!machine;
        break;

      case RoleContextType.STAGE_LEVEL1:
        const stage = await this.prisma.productionStageLevel1.findUnique({
          where: { stageId: contextId },
        });
        exists = !!stage;
        break;

      case RoleContextType.ORDER_PICKER:
        // Используем метод из PickersService для валидации
        try {
          await this.pickersService.validatePickerExists(contextId);
          exists = true;
        } catch (error) {
          exists = false;
        }
        break;
    }

    if (!exists) {
      throw new BadRequestException(
        `Объект контекста ${contextType} с ID ${contextId} не найден`,
      );
    }
  }

  private async getContextObjectName(
    contextType: RoleContextType,
    contextId: number,
  ): Promise<string> {
    try {
      switch (contextType) {
        case RoleContextType.MACHINE:
          const machine = await this.prisma.machine.findUnique({
            where: { machineId: contextId },
          });
          return machine?.machineName || `Станок ${contextId}`;

        case RoleContextType.STAGE_LEVEL1:
          const stage = await this.prisma.productionStageLevel1.findUnique({
            where: { stageId: contextId },
          });
          return stage?.stageName || `Этап ${contextId}`;

        case RoleContextType.ORDER_PICKER:
          // Используем метод из PickersService для получения имени
          return await this.pickersService.getContextObjectName(contextId);

        default:
          return `Объект ${contextId}`;
      }
    } catch (error) {
      this.logger.warn(
        `Не удалось получить название объекта ${contextType}:${contextId}: ${error.message}`,
      );
      return `Объект ${contextId}`;
    }
  }

  // Методы для преобразования типов между DTO и Prisma
  private mapDtoContextTypeToPrisma(dtoType: RoleContextType): any {
    switch (dtoType) {
      case RoleContextType.MACHINE:
        return 'MACHINE';
      case RoleContextType.STAGE_LEVEL1:
        return 'STAGE_LEVEL1';
      case RoleContextType.ORDER_PICKER:
        return 'ORDER_PICKER';
      default:
        throw new Error(`Неизвестный тип контекста: ${dtoType}`);
    }
  }

  private mapPrismaContextTypeToDto(prismaType: any): RoleContextType {
    switch (prismaType) {
      case 'MACHINE':
        return RoleContextType.MACHINE;
      case 'STAGE_LEVEL1':
        return RoleContextType.STAGE_LEVEL1;
      case 'ORDER_PICKER':
        return RoleContextType.ORDER_PICKER;
      default:
        throw new Error(`Неизвестный тип контекста Prisma: ${prismaType}`);
    }
  }
}