import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  BindOperatorToMachineDto,
  UnbindOperatorFromMachineDto,
  GetOperatorBindingDto,
  OperatorBindingResponseDto,
  BindOperatorResponseDto,
  UnbindOperatorResponseDto,
  BoundOperatorInfo,
  GetMachineBindingsDto,
  MachineBindingsResponseDto,
  ChangeOperatorNumberDto,
  ChangeOperatorNumberResponseDto,
} from '../../dto/operators/operator-binding.dto';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class OperatorBindingService {
  private readonly logger = new Logger(OperatorBindingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  /**
   * Получить информацию о привязке оператора
   */
  async getOperatorBinding(
    dto: GetOperatorBindingDto,
  ): Promise<OperatorBindingResponseDto> {
    this.logger.log(
      `Получение информации о привязке оператора ID: ${dto.userId}`,
    );

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { userId: dto.userId },
      include: { userDetail: true },
    });

    if (!user) {
      throw new NotFoundException(
        `Пользователь с ID ${dto.userId} не найден`,
      );
    }

    // Ищем активную привязку оператора
    const activeBinding = await this.prisma.operatorMachineBinding.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
        unboundAt: null,
      },
      include: {
        machine: true,
      },
      orderBy: {
        boundAt: 'desc',
      },
    });

    if (!activeBinding) {
      return {
        isBound: false,
      };
    }

    // Получаем других операторов на этом станке
    const otherOperators = await this.getOtherOperatorsOnMachine(
      activeBinding.machineId,
      dto.userId,
    );

    return {
      isBound: true,
      machine: {
        machineId: activeBinding.machine.machineId,
        machineName: activeBinding.machine.machineName,
        machineCode: activeBinding.machine.machineCode || '',
        operatorNumber: activeBinding.operatorNumber,
        boundAt: activeBinding.boundAt,
      },
      otherOperators,
    };
  }

  /**
   * Привязать оператора к станку по коду
   */
  async bindOperatorToMachine(
    dto: BindOperatorToMachineDto,
  ): Promise<BindOperatorResponseDto> {
    this.logger.log(
      `Привязка оператора ID: ${dto.userId} к станку с кодом: ${dto.machineCode}`,
    );

    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { userId: dto.userId },
      include: { userDetail: true },
    });

    if (!user) {
      throw new NotFoundException(
        `Пользователь с ID ${dto.userId} не найден`,
      );
    }

    // Ищем станок по коду
    const machine = await this.prisma.machine.findUnique({
      where: { machineCode: dto.machineCode },
    });

    if (!machine) {
      throw new NotFoundException(
        `Станок с кодом "${dto.machineCode}" не найден`,
      );
    }

    // Проверяем, не привязан ли уже оператор к другому станку
    const existingBinding = await this.prisma.operatorMachineBinding.findFirst(
      {
        where: {
          userId: dto.userId,
          isActive: true,
          unboundAt: null,
        },
      },
    );

    if (existingBinding) {
      // Если привязан к тому же станку, возвращаем информацию
      if (existingBinding.machineId === machine.machineId) {
        const otherOperators = await this.getOtherOperatorsOnMachine(
          machine.machineId,
          dto.userId,
        );

        return {
          success: true,
          message: 'Оператор уже привязан к этому станку',
          binding: {
            bindingId: existingBinding.bindingId,
            machineId: machine.machineId,
            machineName: machine.machineName,
            machineCode: machine.machineCode || '',
            operatorNumber: existingBinding.operatorNumber,
            boundAt: existingBinding.boundAt,
          },
          otherOperators,
        };
      }

      throw new ConflictException(
        `Оператор уже привязан к другому станку. Сначала отвяжитесь от текущего станка.`,
      );
    }

    // Определяем номер оператора (следующий свободный)
    const maxOperatorNumber = await this.prisma.operatorMachineBinding.findFirst(
      {
        where: {
          machineId: machine.machineId,
          isActive: true,
          unboundAt: null,
        },
        orderBy: {
          operatorNumber: 'desc',
        },
        select: {
          operatorNumber: true,
        },
      },
    );

    const operatorNumber = maxOperatorNumber
      ? maxOperatorNumber.operatorNumber + 1
      : 1;

    // Создаем привязку
    const binding = await this.prisma.operatorMachineBinding.create({
      data: {
        userId: dto.userId,
        machineId: machine.machineId,
        operatorNumber,
        isActive: true,
      },
    });

    this.logger.log(
      `Оператор ${user.userDetail?.firstName} ${user.userDetail?.lastName} привязан к станку "${machine.machineName}" с номером ${operatorNumber}`,
    );

    // Получаем других операторов на этом станке
    const otherOperators = await this.getOtherOperatorsOnMachine(
      machine.machineId,
      dto.userId,
    );

    // Отправляем WebSocket уведомление
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

    return {
      success: true,
      message: `Успешно привязан к станку "${machine.machineName}" как оператор №${operatorNumber}`,
      binding: {
        bindingId: binding.bindingId,
        machineId: machine.machineId,
        machineName: machine.machineName,
        machineCode: machine.machineCode || '',
        operatorNumber,
        boundAt: binding.boundAt,
      },
      otherOperators,
    };
  }

  /**
   * Отвязать оператора от станка
   */
  async unbindOperatorFromMachine(
    dto: UnbindOperatorFromMachineDto,
  ): Promise<UnbindOperatorResponseDto> {
    this.logger.log(
      `Отвязка оператора ID: ${dto.userId} от станка ID: ${dto.machineId}`,
    );

    // Ищем активную привязку
    const binding = await this.prisma.operatorMachineBinding.findFirst({
      where: {
        userId: dto.userId,
        machineId: dto.machineId,
        isActive: true,
        unboundAt: null,
      },
    });

    if (!binding) {
      throw new NotFoundException(
        `Активная привязка оператора к станку не найдена`,
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

    this.logger.log(
      `Оператор ID: ${dto.userId} отвязан от станка ID: ${dto.machineId}`,
    );

    // Отправляем WebSocket уведомление
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

    return {
      success: true,
      message: 'Успешно отвязан от станка',
      unboundAt,
    };
  }

  /**
   * Получить список привязок станка
   */
  async getMachineBindings(
    dto: GetMachineBindingsDto,
  ): Promise<MachineBindingsResponseDto> {
    this.logger.log(`Получение привязок станка ID: ${dto.machineId}`);

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: dto.machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${dto.machineId} не найден`);
    }

    // Получаем привязки
    const whereClause: any = {
      machineId: dto.machineId,
    };

    if (dto.activeOnly) {
      whereClause.isActive = true;
      whereClause.unboundAt = null;
    }

    const bindings = await this.prisma.operatorMachineBinding.findMany({
      where: whereClause,
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
    });

    const activeOperators: BoundOperatorInfo[] = bindings.map((binding) => ({
      userId: binding.userId,
      operatorNumber: binding.operatorNumber,
      firstName: binding.user.userDetail?.firstName || 'Неизвестно',
      lastName: binding.user.userDetail?.lastName || '',
      position: binding.user.userDetail?.position || undefined,
      boundAt: binding.boundAt,
    }));

    return {
      machineId: machine.machineId,
      machineName: machine.machineName,
      machineCode: machine.machineCode || '',
      activeOperators,
      totalActive: activeOperators.length,
    };
  }

  /**
   * Получить других операторов на станке (кроме указанного)
   */
  private async getOtherOperatorsOnMachine(
    machineId: number,
    excludeUserId: number,
  ): Promise<BoundOperatorInfo[]> {
    const bindings = await this.prisma.operatorMachineBinding.findMany({
      where: {
        machineId,
        userId: { not: excludeUserId },
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
    });

    return bindings.map((binding) => ({
      userId: binding.userId,
      operatorNumber: binding.operatorNumber,
      firstName: binding.user.userDetail?.firstName || 'Неизвестно',
      lastName: binding.user.userDetail?.lastName || '',
      position: binding.user.userDetail?.position || undefined,
      boundAt: binding.boundAt,
    }));
  }

  /**
   * Изменить номер оператора на станке
   */
  async changeOperatorNumber(
    dto: ChangeOperatorNumberDto,
  ): Promise<ChangeOperatorNumberResponseDto> {
    this.logger.log(
      `Смена номера оператора ID: ${dto.userId} на станке ID: ${dto.machineId} на номер ${dto.newOperatorNumber}`,
    );

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: dto.machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${dto.machineId} не найден`);
    }

    // Ищем активную привязку оператора
    const currentBinding = await this.prisma.operatorMachineBinding.findFirst({
      where: {
        userId: dto.userId,
        machineId: dto.machineId,
        isActive: true,
        unboundAt: null,
      },
    });

    if (!currentBinding) {
      throw new NotFoundException(
        `Оператор с ID ${dto.userId} не привязан к станку ID ${dto.machineId}`,
      );
    }

    const oldNumber = currentBinding.operatorNumber;

    // Если номер не изменился
    if (oldNumber === dto.newOperatorNumber) {
      return {
        success: true,
        message: 'Номер оператора не изменился',
        oldNumber,
        newNumber: dto.newOperatorNumber,
      };
    }

    // Проверяем, занят ли новый номер другим оператором
    const conflictBinding = await this.prisma.operatorMachineBinding.findFirst({
      where: {
        machineId: dto.machineId,
        operatorNumber: dto.newOperatorNumber,
        isActive: true,
        unboundAt: null,
        userId: { not: dto.userId },
      },
    });

    if (conflictBinding) {
      // Меняем номера местами
      await this.prisma.$transaction([
        // Временно устанавливаем отрицательное значение для избежания конфликта уникальности
        this.prisma.operatorMachineBinding.update({
          where: { bindingId: currentBinding.bindingId },
          data: { operatorNumber: -1 },
        }),
        // Меняем номер у конфликтующего оператора
        this.prisma.operatorMachineBinding.update({
          where: { bindingId: conflictBinding.bindingId },
          data: { operatorNumber: oldNumber },
        }),
        // Устанавливаем новый номер текущему оператору
        this.prisma.operatorMachineBinding.update({
          where: { bindingId: currentBinding.bindingId },
          data: { operatorNumber: dto.newOperatorNumber },
        }),
      ]);

      this.logger.log(
        `Номера операторов поменяны местами: ${dto.userId} (${oldNumber} -> ${dto.newOperatorNumber}), ${conflictBinding.userId} (${dto.newOperatorNumber} -> ${oldNumber})`,
      );

      // Отправляем WebSocket уведомление
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

      return {
        success: true,
        message: `Номера операторов поменяны местами`,
        oldNumber,
        newNumber: dto.newOperatorNumber,
      };
    } else {
      // Просто меняем номер
      await this.prisma.operatorMachineBinding.update({
        where: { bindingId: currentBinding.bindingId },
        data: { operatorNumber: dto.newOperatorNumber },
      });

      this.logger.log(
        `Номер оператора ${dto.userId} изменен с ${oldNumber} на ${dto.newOperatorNumber}`,
      );

      // Отправляем WebSocket уведомление
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

      return {
        success: true,
        message: `Номер оператора изменен с ${oldNumber} на ${dto.newOperatorNumber}`,
        oldNumber,
        newNumber: dto.newOperatorNumber,
      };
    }
  }

  /**
   * Автоматическая отвязка всех операторов (вызывается при сбросе смены)
   */
  async unbindAllOperators(): Promise<number> {
    this.logger.log('Автоматическая отвязка всех операторов при сбросе смены');

    const unboundAt = new Date();

    const result = await this.prisma.operatorMachineBinding.updateMany({
      where: {
        isActive: true,
        unboundAt: null,
      },
      data: {
        isActive: false,
        unboundAt,
      },
    });

    this.logger.log(`Отвязано операторов: ${result.count}`);

    // Отправляем WebSocket уведомление
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

    return result.count;
  }
}
