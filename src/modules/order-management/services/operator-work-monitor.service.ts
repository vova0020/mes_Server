import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { WorkMonitorOperatorDto } from '../dto/work-monitor.dto';

/**
 * Сервис для монитора персонала.
 * Возвращает данные об операторах (роль 'operator'), привязанных к станкам
 * за текущие сутки (по времени Moscow, UTC+3).
 */
@Injectable()
export class OperatorWorkMonitorService {
  // Смещение времени Moscow (UTC+3) в миллисекундах
  private readonly MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

  constructor(private prisma: PrismaService) {}

  /**
   * Возвращает список операторов с информацией об их текущей привязке
   * к станку (если привязка была совершена за текущие сутки).
   */
  async getOperatorStatus(): Promise<WorkMonitorOperatorDto[]> {
    const startOfDayUtc = this.getStartOfDayMoscowAsUtc();

    // Все активные привязки за текущие сутки
    const bindings = await this.prisma.operatorMachineBinding.findMany({
      where: {
        isActive: true,
        unboundAt: null,
        boundAt: { gte: startOfDayUtc },
      },
      include: {
        user: {
          select: {
            userId: true,
            userDetail: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        machine: {
          select: {
            machineId: true,
            machineName: true,
            machinesStages: {
              select: {
                stage: {
                  select: {
                    stageId: true,
                    stageName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Строим карту привязок по userId для быстрого доступа
    const bindingByUser = new Map<number, any>();
    for (const binding of bindings) {
      bindingByUser.set(binding.userId, binding);
    }

    // Все пользователи с ролью 'operator'
    const operators = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              roleName: 'operator',
            },
          },
        },
      },
      select: {
        userId: true,
        userDetail: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { userDetail: { lastName: 'asc' } },
        { userDetail: { firstName: 'asc' } },
      ],
    });

    return operators.map((operator) => {
      const binding = bindingByUser.get(operator.userId);
      const lastName = operator.userDetail?.lastName ?? '';
      const firstName = operator.userDetail?.firstName ?? '';

      if (!binding) {
        return {
          userId: operator.userId,
          lastName,
          firstName,
          initials: this.computeInitials(lastName, firstName),
          isBound: false,
          machineName: null,
          stageName: null,
          operatorNumber: null,
          boundAt: null,
        };
      }

      const stageName =
        binding.machine.machinesStages?.[0]?.stage?.stageName ?? null;

      return {
        userId: binding.userId,
        lastName,
        firstName,
        initials: this.computeInitials(
          binding.user.userDetail?.lastName ?? '',
          binding.user.userDetail?.firstName ?? '',
        ),
        isBound: true,
        machineName: binding.machine.machineName,
        stageName,
        operatorNumber: binding.operatorNumber,
        boundAt: binding.boundAt.toISOString(),
      };
    });
  }

  /**
   * Вычисляет инициалы (первая буква фамилии и имени) для аватара.
   */
  private computeInitials(lastName: string, firstName: string): string {
    const parts = [lastName, firstName].filter((part) => part?.length > 0);
    return parts
      .map((part) => part.trim().charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  /**
   * Возвращает начало текущих суток по времени Moscow (UTC+3) в виде Date (UTC).
   */
  private getStartOfDayMoscowAsUtc(): Date {
    const now = new Date(); // UTC сейчас
    // Переводим в время Moscow
    const moscowTime = new Date(now.getTime() + this.MOSCOW_OFFSET_MS);
    const startOfMoscowDay = new Date(moscowTime);
    startOfMoscowDay.setHours(0, 0, 0, 0);
    // Переводим обратно в UTC
    const utcStart = new Date(
      startOfMoscowDay.getTime() - this.MOSCOW_OFFSET_MS,
    );
    return utcStart;
  }
}
