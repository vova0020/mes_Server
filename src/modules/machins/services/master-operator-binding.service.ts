import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { SocketService } from '../../websocket/services/socket.service';
import {
  MasterSegmentResponseDto,
  SegmentMachineWithOperatorsDto,
  BoundOperatorInfoDto,
  OperatorInfoDto,
  MasterBindOperatorResponseDto,
  MasterUnbindOperatorResponseDto,
  MasterChangeNumberResponseDto,
} from '../dto/master-operator-binding.dto';

@Injectable()
export class MasterOperatorBindingService {
  private readonly logger = new Logger(MasterOperatorBindingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  /**
   * 1) Получить список участков, доступных мастеру
   * Мастер привязан к участкам через RoleBinding с contextType = STAGE_LEVEL1
   */
  async getMasterSegments(
    masterId: number,
  ): Promise<MasterSegmentResponseDto[]> {
    this.logger.log(
      `Получение участков для мастера ID: ${masterId}`,
    );

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { userId: masterId },
    });

    if (!user) {
      throw new NotFoundException(
        `Пользователь с ID ${masterId} не найден`,
      );
    }

    // Получаем привязки мастера к участкам через RoleBinding
    const roleBindings = await this.prisma.roleBinding.findMany({
      where: {
        userId: masterId,
        contextType: 'STAGE_LEVEL1',
      },
      select: {
        contextId: true,
      },
    });

    if (roleBindings.length === 0) {
      this.logger.warn(
        `У мастера ID ${masterId} нет привязанных участков`,
      );
      return [];
    }

    const stageIds = roleBindings.map((rb) => rb.contextId);

    // Получаем информацию об участках
    const stages = await this.prisma.productionStageLevel1.findMany({
      where: {
        stageId: { in: stageIds },
      },
      select: {
        stageId: true,
        stageName: true,
      },
      orderBy: {
        stageId: 'asc',
      },
    });

    this.logger.log(
      `Найдено ${stages.length} участков для мастера ID ${masterId}`,
    );

    return stages.map((stage) => ({
      stageId: stage.stageId,
      stageName: stage.stageName,
    }));
  }

  /**
   * 2) Получить список станков для участка с информацией о привязанных операторах
   */
  async getSegmentMachinesWithOperators(
    stageId: number,
  ): Promise<SegmentMachineWithOperatorsDto[]> {
    this.logger.log(
      `Получение станков с операторами для участка ID: ${stageId}`,
    );

    // Проверяем существование участка
    const stage = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId },
    });

    if (!stage) {
      throw new NotFoundException(
        `Участок с ID ${stageId} не найден`,
      );
    }

    // Получаем станки участка с привязанными операторами
    const machines = await this.prisma.machine.findMany({
      where: {
        machinesStages: {
          some: {
            stageId,
          },
        },
      },
      include: {
        operatorBindings: {
          where: {
            isActive: true,
            unboundAt: null,
          },
          include: {
            user: {
              include: {
                userDetail: true,
              },
            },
          },
          orderBy: {
            operatorNumber: 'asc',
          },
        },
      },
      orderBy: {
        machineId: 'asc',
      },
    });

    this.logger.log(
      `Найдено ${machines.length} станков для участка ID ${stageId}`,
    );

    return machines.map((machine) => {
      const operators: BoundOperatorInfoDto[] = machine.operatorBindings.map(
        (binding) => ({
          userId: binding.userId,
          operatorNumber: binding.operatorNumber,
          firstName:
            binding.user.userDetail?.firstName || 'Неизвестно',
          lastName: binding.user.userDetail?.lastName || '',
          position: binding.user.userDetail?.position || undefined,
          boundAt: binding.boundAt,
        }),
      );

      return {
        machineId: machine.machineId,
        machineName: machine.machineName,
        machineCode: machine.machineCode,
        status: machine.status,
        operatorsCount: operators.length,
        operators,
      };
    });
  }

  /**
   * 3) Получить список всех пользователей с ролью «Оператор»
   */
  async getOperators(stageId?: number): Promise<OperatorInfoDto[]> {
    this.logger.log(
      `Получение списка операторов${stageId ? ` для участка ID: ${stageId}` : ''}`,
    );

    // Ищем роль "Оператор"
    const operatorRole = await this.prisma.role.findFirst({
      where: {
        roleName: {
          in: ['Оператор', 'operator', 'Operator'],
        },
      },
    });

    if (!operatorRole) {
      this.logger.warn(
        'Роль "Оператор" не найдена в системе',
      );
      return [];
    }

    // Получаем пользователей с ролью оператора
    const users = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: operatorRole.roleId,
          },
        },
      },
      include: {
        userDetail: true,
        operatorMachineBindings: {
          where: {
            isActive: true,
            unboundAt: null,
          },
          include: {
            machine: true,
          },
        },
      },
      orderBy: {
        userId: 'asc',
      },
    });

    this.logger.log(`Найдено ${users.length} операторов`);

    return users.map((user) => {
      const activeBinding = user.operatorMachineBindings[0] || null;

      return {
        userId: user.userId,
        firstName: user.userDetail?.firstName || 'Неизвестно',
        lastName: user.userDetail?.lastName || '',
        position: user.userDetail?.position || undefined,
        isBound: !!activeBinding,
        currentBinding: activeBinding
          ? {
              machineId: activeBinding.machine.machineId,
              machineName: activeBinding.machine.machineName,
              machineCode: activeBinding.machine.machineCode,
              operatorNumber: activeBinding.operatorNumber,
              boundAt: activeBinding.boundAt,
            }
          : undefined,
      };
    });
  }

  /**
   * 4) Привязать оператора к станку (от имени мастера)
   */
  async bindOperatorToMachine(
    operatorId: number,
    machineId: number,
    operatorNumber?: number,
  ): Promise<MasterBindOperatorResponseDto> {
    this.logger.log(
      `Мастер привязывает оператора ID: ${operatorId} к станку ID: ${machineId}`,
    );

    // Проверяем существование оператора
    const operator = await this.prisma.user.findUnique({
      where: { userId: operatorId },
      include: { userDetail: true },
    });

    if (!operator) {
      throw new NotFoundException(
        `Пользователь (оператор) с ID ${operatorId} не найден`,
      );
    }

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(
        `Станок с ID ${machineId} не найден`,
      );
    }

    // Проверяем, не привязан ли уже оператор к другому станку
    const existingBinding =
      await this.prisma.operatorMachineBinding.findFirst({
        where: {
          userId: operatorId,
          isActive: true,
          unboundAt: null,
        },
        include: {
          machine: true,
        },
      });

    if (existingBinding) {
      if (existingBinding.machineId === machineId) {
        return {
          success: true,
          message: 'Оператор уже привязан к этому станку',
          binding: {
            bindingId: existingBinding.bindingId,
            machineId: machine.machineId,
            machineName: machine.machineName,
            machineCode: machine.machineCode,
            operatorNumber: existingBinding.operatorNumber,
            boundAt: existingBinding.boundAt,
          },
        };
      }

      const opName =
        `${operator.userDetail?.firstName || ''} ${operator.userDetail?.lastName || ''}`.trim();
      throw new ConflictException(
        `Оператор ${opName} уже привязан к станку "${existingBinding.machine.machineName}". Сначала отвяжите его.`,
      );
    }

    // Определяем номер оператора
    let assignedNumber: number;

    if (operatorNumber) {
      // Если указан конкретный номер — проверяем и сдвигаем при необходимости
      assignedNumber = operatorNumber;
      await this.shiftOperatorNumbers(machineId, operatorNumber);
    } else {
      // Автоматически назначаем следующий свободный номер
      const maxBinding =
        await this.prisma.operatorMachineBinding.findFirst({
          where: {
            machineId,
            isActive: true,
            unboundAt: null,
          },
          orderBy: {
            operatorNumber: 'desc',
          },
          select: {
            operatorNumber: true,
          },
        });

      assignedNumber = maxBinding ? maxBinding.operatorNumber + 1 : 1;
    }

    // Создаем привязку
    const binding = await this.prisma.operatorMachineBinding.create({
      data: {
        userId: operatorId,
        machineId,
        operatorNumber: assignedNumber,
        isActive: true,
      },
    });

    const operatorName =
      `${operator.userDetail?.firstName || ''} ${operator.userDetail?.lastName || ''}`.trim();

    this.logger.log(
      `Оператор ${operatorName} привязан к станку "${machine.machineName}" с номером ${assignedNumber}`,
    );

    // WebSocket уведомления
    this.emitBindingUpdate();

    return {
      success: true,
      message: `Оператор ${operatorName} привязан к станку "${machine.machineName}" как оператор №${assignedNumber}`,
      binding: {
        bindingId: binding.bindingId,
        machineId: machine.machineId,
        machineName: machine.machineName,
        machineCode: machine.machineCode,
        operatorNumber: assignedNumber,
        boundAt: binding.boundAt,
      },
    };
  }

  /**
   * 5) Отвязать оператора от станка (от имени мастера)
   */
  async unbindOperatorFromMachine(
    operatorId: number,
    machineId: number,
  ): Promise<MasterUnbindOperatorResponseDto> {
    this.logger.log(
      `Мастер отвязывает оператора ID: ${operatorId} от станка ID: ${machineId}`,
    );

    // Проверяем существование оператора
    const operator = await this.prisma.user.findUnique({
      where: { userId: operatorId },
      include: { userDetail: true },
    });

    if (!operator) {
      throw new NotFoundException(
        `Пользователь (оператор) с ID ${operatorId} не найден`,
      );
    }

    // Ищем активную привязку
    const binding = await this.prisma.operatorMachineBinding.findFirst({
      where: {
        userId: operatorId,
        machineId,
        isActive: true,
        unboundAt: null,
      },
      include: {
        machine: true,
      },
    });

    if (!binding) {
      throw new NotFoundException(
        `Активная привязка оператора ID ${operatorId} к станку ID ${machineId} не найдена`,
      );
    }

    const unboundAt = new Date();

    // Обновляем привязку
    await this.prisma.operatorMachineBinding.update({
      where: { bindingId: binding.bindingId },
      data: {
        isActive: false,
        unboundAt,
      },
    });

    const operatorName =
      `${operator.userDetail?.firstName || ''} ${operator.userDetail?.lastName || ''}`.trim();

    this.logger.log(
      `Оператор ${operatorName} отвязан от станка "${binding.machine.machineName}"`,
    );

    // WebSocket уведомления
    this.emitBindingUpdate();

    return {
      success: true,
      message: `Оператор ${operatorName} отвязан от станка "${binding.machine.machineName}"`,
      unboundAt,
    };
  }

  /**
   * 6) Изменить номер оператора на станке (со сдвигом номеров)
   *
   * Логика сдвига: если мы ставим оператору номер N, а у кого-то уже стоит N,
   * то тот, у кого был N, получает номер N+1, и так далее по цепочке.
   */
  async changeOperatorNumber(
    operatorId: number,
    machineId: number,
    newOperatorNumber: number,
  ): Promise<MasterChangeNumberResponseDto> {
    this.logger.log(
      `Смена номера оператора ID: ${operatorId} на станке ID: ${machineId} на номер ${newOperatorNumber}`,
    );

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(
        `Станок с ID ${machineId} не найден`,
      );
    }

    // Ищем активную привязку оператора
    const currentBinding =
      await this.prisma.operatorMachineBinding.findFirst({
        where: {
          userId: operatorId,
          machineId,
          isActive: true,
          unboundAt: null,
        },
      });

    if (!currentBinding) {
      throw new NotFoundException(
        `Оператор с ID ${operatorId} не привязан к станку ID ${machineId}`,
      );
    }

    const oldNumber = currentBinding.operatorNumber;

    // Если номер не изменился
    if (oldNumber === newOperatorNumber) {
      return {
        success: true,
        message: 'Номер оператора не изменился',
        oldNumber,
        newNumber: newOperatorNumber,
      };
    }

    // Получаем все активные привязки на этом станке, кроме текущего оператора
    const otherBindings = await this.prisma.operatorMachineBinding.findMany({
      where: {
        machineId,
        isActive: true,
        unboundAt: null,
        userId: { not: operatorId },
      },
      orderBy: {
        operatorNumber: 'asc',
      },
    });

    // Проверяем, занят ли новый номер
    const conflictBinding = otherBindings.find(
      (b) => b.operatorNumber === newOperatorNumber,
    );

    if (conflictBinding) {
      // Сдвигаем номера: все операторы с номером >= newOperatorNumber сдвигаются на +1
      const bindingsToShift = otherBindings.filter(
        (b) => b.operatorNumber >= newOperatorNumber,
      );

      // Сортируем по убыванию, чтобы сдвигать с конца (избежать конфликтов)
      bindingsToShift.sort((a, b) => b.operatorNumber - a.operatorNumber);

      // Выполняем в транзакции: сначала сдвигаем, потом ставим новый номер
      await this.prisma.$transaction(async (tx) => {
        // Сдвигаем все конфликтующие номера на +1
        for (const b of bindingsToShift) {
          await tx.operatorMachineBinding.update({
            where: { bindingId: b.bindingId },
            data: { operatorNumber: b.operatorNumber + 1 },
          });
        }

        // Устанавливаем новый номер текущему оператору
        await tx.operatorMachineBinding.update({
          where: { bindingId: currentBinding.bindingId },
          data: { operatorNumber: newOperatorNumber },
        });
      });

      this.logger.log(
        `Номер оператора ${operatorId} изменен с ${oldNumber} на ${newOperatorNumber}, сдвинуто ${bindingsToShift.length} операторов`,
      );
    } else {
      // Просто меняем номер
      await this.prisma.operatorMachineBinding.update({
        where: { bindingId: currentBinding.bindingId },
        data: { operatorNumber: newOperatorNumber },
      });

      this.logger.log(
        `Номер оператора ${operatorId} изменен с ${oldNumber} на ${newOperatorNumber}`,
      );
    }

    // WebSocket уведомления
    this.emitBindingUpdate();

    return {
      success: true,
      message: `Номер оператора изменен с ${oldNumber} на ${newOperatorNumber}`,
      oldNumber,
      newNumber: newOperatorNumber,
    };
  }

  /**
   * Сдвигает номера операторов на станке, начиная с указанного номера
   * Используется при привязке с указанием конкретного номера
   */
  private async shiftOperatorNumbers(
    machineId: number,
    fromNumber: number,
  ): Promise<void> {
    // Получаем все привязки с номером >= fromNumber
    const bindingsToShift =
      await this.prisma.operatorMachineBinding.findMany({
        where: {
          machineId,
          isActive: true,
          unboundAt: null,
          operatorNumber: { gte: fromNumber },
        },
        orderBy: {
          operatorNumber: 'desc', // Сдвигаем с конца, чтобы не было конфликтов
        },
      });

    if (bindingsToShift.length === 0) return;

    // Сдвигаем каждый номер на +1
    for (const binding of bindingsToShift) {
      await this.prisma.operatorMachineBinding.update({
        where: { bindingId: binding.bindingId },
        data: { operatorNumber: binding.operatorNumber + 1 },
      });
    }

    this.logger.log(
      `Сдвинуто ${bindingsToShift.length} номеров операторов на станке ID ${machineId} начиная с номера ${fromNumber}`,
    );
  }

  /**
   * Отправка WebSocket уведомлений об изменении привязок
   */
  private emitBindingUpdate(): void {
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'machine:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'machine_setting:event',
      { status: 'updated' },
    );
  }
}
