import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { EventsService } from '../../../websocket/services/events.service';
import { WebSocketRooms } from '../../../websocket/types/rooms.types';
import {
  CreatePickerDto,
  UpdatePickerDto,
  PickerResponseDto,
  CreatePickerWithRoleDto,
  PickerWithRoleResponseDto,
} from '../../dto/users/picker-management.dto';
import { UserRoleType, RoleContextType } from '../../dto/users/user-roles.dto';

@Injectable()
export class PickersService {
  private readonly logger = new Logger(PickersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  // ========================================
  // CRUD операции с комплектовщиками
  // ========================================

  async createPicker(
    createPickerDto: CreatePickerDto,
  ): Promise<PickerResponseDto> {
    this.logger.log(
      `Создание комплектовщика для пользователя ID: ${createPickerDto.userId}`,
    );

    try {
      // Проверяем существование пользователя
      await this.validateUserExists(createPickerDto.userId);

      // Проверяем, не является ли пользователь уже комплектовщиком
      const existingPicker = await this.prisma.picker.findFirst({
        where: { userId: createPickerDto.userId },
      });

      if (existingPicker) {
        throw new ConflictException(
          `Пользователь с ID ${createPickerDto.userId} уже является комплектовщиком`,
        );
      }

      // Создаём запись комплектовщика
      const picker = await this.prisma.picker.create({
        data: {
          userId: createPickerDto.userId,
        },
        include: {
          user: {
            include: { userDetail: true },
          },
        },
      });

      this.logger.log(
        `Комплектовщик создан успешно: ID ${picker.pickerId} для пользователя ${createPickerDto.userId}`,
      );

      // Уведомляем через WebSocket
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_USER,
        'pickerCreated',
        {
          picker: this.formatPickerResponse(picker),
          timestamp: new Date().toISOString(),
        }
      );

      return this.formatPickerResponse(picker);
    } catch (error) {
      this.logger.error(
        `Ошибка создания комплектовщика: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createPickerWithRole(
    createPickerWithRoleDto: CreatePickerWithRoleDto,
  ): Promise<PickerWithRoleResponseDto> {
    this.logger.log(
      `Создание комплектовщика с ролью для пользователя ID: ${createPickerWithRoleDto.userId}`,
    );

    try {
      // Проверяем существование пользователя
      await this.validateUserExists(createPickerWithRoleDto.userId);

      // Проверяем, не является ли пользователь уже комплектовщиком
      const existingPicker = await this.prisma.picker.findFirst({
        where: { userId: createPickerWithRoleDto.userId },
      });

      if (existingPicker) {
        throw new ConflictException(
          `Пользователь с ID ${createPickerWithRoleDto.userId} уже является комплектовщиком`,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        // Этап 1: Создаём профиль комплектовщика
        const picker = await tx.picker.create({
          data: {
            userId: createPickerWithRoleDto.userId,
          },
          include: {
            user: {
              include: { userDetail: true },
            },
          },
        });

        let roleBindingId: number | undefined;

        // Этап 2: Привязываем роль (если требуется)
        if (createPickerWithRoleDto.assignRole !== false) {
          // Получаем или создаём роль orderPicker
          const role = await this.getOrCreateRole(
            tx,
            UserRoleType.ORDER_PICKER,
          );

          // Создаём привязку роли
          const roleBinding = await tx.roleBinding.create({
            data: {
              userId: createPickerWithRoleDto.userId,
              roleId: role.roleId,
              contextType: 'ORDER_PICKER',
              contextId: picker.pickerId,
            },
          });

          roleBindingId = roleBinding.id;
        }

        const result: PickerWithRoleResponseDto = {
          picker: this.formatPickerResponse(picker),
          roleBindingId,
          message:
            createPickerWithRoleDto.assignRole !== false
              ? 'Комплектовщик создан успешно с привязкой роли'
              : 'Комплектовщик создан успешно без привязки роли',
        };

        this.logger.log(
          `Комплектовщик с ролью создан успешно: picker ID ${picker.pickerId}, binding ID ${roleBindingId}`,
        );

        // Уведомляем через WebSocket
        this.eventsService.emitToRoom(
          WebSocketRooms.SETTINGS_USER,
          'pickerCreated',
          {
            picker: this.formatPickerResponse(picker),
            timestamp: new Date().toISOString(),
          }
        );

        // Если была создана привязка роли, отправляем дополнительное уведомление
        if (roleBindingId) {
          this.eventsService.emitToRoom(
            WebSocketRooms.SETTINGS_USER,
            'userRoleBindingCreated',
            {
              userId: createPickerWithRoleDto.userId,
              bindingId: roleBindingId,
              role: UserRoleType.ORDER_PICKER,
              contextType: RoleContextType.ORDER_PICKER,
              contextId: picker.pickerId,
              contextName: this.formatPickerName(picker),
              timestamp: new Date().toISOString(),
            }
          );
        }

        return result;
      });
    } catch (error) {
      this.logger.error(
        `Ошибка создания комплектовщика с ролью: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAllPickers(): Promise<PickerResponseDto[]> {
    this.logger.log('Получение списка всех комплектовщиков');

    const pickers = await this.prisma.picker.findMany({
      include: {
        user: {
          include: { userDetail: true },
        },
      },
      orderBy: { pickerId: 'asc' },
    });

    return pickers.map((picker) => this.formatPickerResponse(picker));
  }

  async getPickerById(pickerId: number): Promise<PickerResponseDto> {
    this.logger.log(`Получение комплектовщика по ID: ${pickerId}`);

    const picker = await this.prisma.picker.findUnique({
      where: { pickerId },
      include: {
        user: {
          include: { userDetail: true },
        },
      },
    });

    if (!picker) {
      throw new NotFoundException(`Комплектовщик с ID ${pickerId} не найден`);
    }

    return this.formatPickerResponse(picker);
  }

  async getPickerByUserId(userId: number): Promise<PickerResponseDto> {
    this.logger.log(`Получение комплектовщика по ID пользователя: ${userId}`);

    const picker = await this.prisma.picker.findFirst({
      where: { userId },
      include: {
        user: {
          include: { userDetail: true },
        },
      },
    });

    if (!picker) {
      throw new NotFoundException(
        `Комплектовщик для пользователя с ID ${userId} не найден`,
      );
    }

    return this.formatPickerResponse(picker);
  }

  async updatePicker(
    pickerId: number,
    updatePickerDto: UpdatePickerDto,
  ): Promise<PickerResponseDto> {
    this.logger.log(`Обновление комплектовщика ID: ${pickerId}`);

    try {
      // Проверяем существование комплектовщика
      const existingPicker = await this.prisma.picker.findUnique({
        where: { pickerId },
      });

      if (!existingPicker) {
        throw new NotFoundException(`Комплектовщик с ID ${pickerId} не найден`);
      }

      // Если обновляется userId, проверяем валидность нового пользователя
      if (updatePickerDto.userId) {
        await this.validateUserExists(updatePickerDto.userId);

        // Проверяем, не привязан ли новый пользователь к другому комплектовщику
        const anotherPicker = await this.prisma.picker.findFirst({
          where: {
            userId: updatePickerDto.userId,
            pickerId: { not: pickerId },
          },
        });

        if (anotherPicker) {
          throw new ConflictException(
            `Пользователь с ID ${updatePickerDto.userId} уже является комплектовщиком`,
          );
        }
      }

      // Обновляем комплектовщика
      const updatedPicker = await this.prisma.picker.update({
        where: { pickerId },
        data: {
          userId: updatePickerDto.userId,
        },
        include: {
          user: {
            include: { userDetail: true },
          },
        },
      });

      this.logger.log(`Комплектовщик обновлён успешно: ID ${pickerId}`);

      // Уведомляем через WebSocket
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_USER,
        'pickerUpdated',
        {
          picker: this.formatPickerResponse(updatedPicker),
          changes: this.getChangesFromUpdateDto(updatePickerDto),
          timestamp: new Date().toISOString(),
        }
      );

      return this.formatPickerResponse(updatedPicker);
    } catch (error) {
      this.logger.error(
        `Ошибка обновления комплектовщика ID ${pickerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deletePicker(pickerId: number): Promise<void> {
    this.logger.log(`Удаление комплектовщика ID: ${pickerId}`);

    try {
      const picker = await this.prisma.picker.findUnique({
        where: { pickerId },
        include: {
          user: {
            include: { userDetail: true },
          },
        },
      });

      if (!picker) {
        throw new NotFoundException(`Комплектовщик с ID ${pickerId} не найден`);
      }

      await this.prisma.picker.delete({
        where: { pickerId },
      });

      this.logger.log(`Комплектовщик удалён успешно: ID ${pickerId}`);

      // Уведомляем через WebSocket
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_USER,
        'pickerDeleted',
        {
          pickerId,
          pickerName: this.formatPickerName(picker),
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      this.logger.error(
        `Ошибка удаления комплектовщика ID ${pickerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========================================
  // Методы для получения списков для привязки
  // ========================================

  async getPickersForBinding(): Promise<{
    pickers: Array<{ pickerId: number; pickerName: string }>;
  }> {
    this.logger.log('Получение списка комплектовщиков для привязки');

    try {
      const pickers = await this.prisma.picker.findMany({
        include: {
          user: {
            include: { userDetail: true },
          },
        },
        orderBy: { pickerId: 'asc' },
      });

      const formattedPickers = pickers.map((picker) => ({
        pickerId: picker.pickerId,
        pickerName: picker.user?.userDetail
          ? `${picker.user.userDetail.firstName} ${picker.user.userDetail.lastName}`
          : `Комплектовщик ${picker.pickerId}`,
      }));

      this.logger.log(
        `Получено ${formattedPickers.length} комплектовщиков для привязки`,
      );
      return { pickers: formattedPickers };
    } catch (error) {
      this.logger.error(
        `Ошибка получения списка комплектовщиков: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Не удалось получить список комплектовщиков',
      );
    }
  }

  // ========================================
  // Вспомогательные методы
  // ========================================

  private formatPickerResponse(picker: any): PickerResponseDto {
    return {
      pickerId: picker.pickerId,
      userId: picker.userId,
      user: {
        userId: picker.user.userId,
        login: picker.user.login,
        userDetail: picker.user.userDetail
          ? {
              firstName: picker.user.userDetail.firstName,
              lastName: picker.user.userDetail.lastName,
              phone: picker.user.userDetail.phone,
              position: picker.user.userDetail.position,
            }
          : undefined,
      },
      createdAt: picker.user.createdAt,
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

  private async getOrCreateRole(tx: any, roleName: UserRoleType): Promise<any> {
    let role = await tx.role.findFirst({
      where: { roleName },
    });

    if (!role) {
      role = await tx.role.create({
        data: { roleName },
      });
      this.logger.log(`Создана новая роль: ${roleName}`);
    }

    return role;
  }

  async getContextObjectName(contextId: number): Promise<string> {
    try {
      const picker = await this.prisma.picker.findUnique({
        where: { pickerId: contextId },
        include: {
          user: {
            include: { userDetail: true },
          },
        },
      });
      return picker?.user?.userDetail
        ? `${picker.user.userDetail.firstName} ${picker.user.userDetail.lastName}`
        : `Комплектовщик ${contextId}`;
    } catch (error) {
      this.logger.warn(
        `Не удалось получить название комплектовщика ${contextId}: ${error.message}`,
      );
      return `Комплектовщик ${contextId}`;
    }
  }

  async validatePickerExists(pickerId: number): Promise<void> {
    const picker = await this.prisma.picker.findUnique({
      where: { pickerId },
    });

    if (!picker) {
      throw new BadRequestException(`Комплектовщик с ID ${pickerId} не найден`);
    }
  }

  private formatPickerName(picker: any): string {
    return picker?.user?.userDetail
      ? `${picker.user.userDetail.firstName} ${picker.user.userDetail.lastName}`
      : `Комплектовщик ${picker.pickerId}`;
  }

  private getChangesFromUpdateDto(updateDto: UpdatePickerDto): Record<string, boolean> {
    const changes: Record<string, boolean> = {};
    
    if (updateDto.userId !== undefined) {
      changes.userId = true;
    }
    
    return changes;
  }
}
