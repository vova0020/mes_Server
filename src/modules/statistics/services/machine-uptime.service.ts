import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { GetMachineUptimeStatsDto, DateRangeType } from '../dto';
import { MachineStatus } from '@prisma/client';

export interface MachineUptimeStats {
  machineId: number;
  machineName: string;
  currentStatus: MachineStatus;
  statusBreakdown: StatusBreakdown[];
}

export interface MachineUptimeResponse {
  startDate: Date;
  endDate: Date;
  machines: MachineUptimeStats[];
}

export interface StatusBreakdown {
  status: MachineStatus;
  hours: number;
  percentage: number;
}

export interface StageInfo {
  stageId: number;
  stageName: string;
}

@Injectable()
export class MachineUptimeService {
  constructor(private prisma: PrismaService) {}

  async getStages(): Promise<StageInfo[]> {
    const stages = await this.prisma.productionStageLevel1.findMany({
      select: {
        stageId: true,
        stageName: true,
      },
      orderBy: {
        stageName: 'asc',
      },
    });

    return stages;
  }

  async getMachineUptimeStats(
    dto: GetMachineUptimeStatsDto,
  ): Promise<MachineUptimeResponse> {
    const { startDate, endDate } = this.calculateDateRange(dto);

    let machines;
    if (dto.stageId) {
      machines = await this.prisma.machine.findMany({
        where: {
          machinesStages: {
            some: {
              stageId: dto.stageId,
            },
          },
        },
        select: {
          machineId: true,
          machineName: true,
          status: true,
        },
        orderBy: {
          machineName: 'asc',
        },
      });
    } else {
      machines = await this.prisma.machine.findMany({
        select: {
          machineId: true,
          machineName: true,
          status: true,
        },
        orderBy: {
          machineName: 'asc',
        },
      });
    }

    const stats: MachineUptimeStats[] = [];

    for (const machine of machines) {
      // Получаем последний статус ПЕРЕД началом периода
      const statusBeforePeriod = await this.prisma.machineStatusHistory.findFirst({
        where: {
          machineId: machine.machineId,
          createdAt: {
            lt: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          newStatus: true,
        },
      });

      // Получаем историю изменений В ТЕЧЕНИЕ периода
      const statusHistory = await this.prisma.machineStatusHistory.findMany({
        where: {
          machineId: machine.machineId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Начальный статус - либо последний перед периодом, либо текущий
      const initialStatus = statusBeforePeriod?.newStatus || machine.status;

      const statusBreakdown = this.calculateStatusBreakdown(
        statusHistory,
        initialStatus,
        startDate,
        endDate,
      );

      stats.push({
        machineId: machine.machineId,
        machineName: machine.machineName,
        currentStatus: machine.status,
        statusBreakdown,
      });
    }

    return {
      startDate,
      endDate,
      machines: stats,
    };
  }

  private calculateStatusBreakdown(
    history: Array<{ newStatus: MachineStatus; createdAt: Date }>,
    initialStatus: MachineStatus,
    startDate: Date,
    endDate: Date,
  ): StatusBreakdown[] {
    const statusDurations = new Map<MachineStatus, number>();
    const now = new Date();
    const actualEndDate = endDate > now ? now : endDate;

    // Инициализируем все статусы
    Object.values(MachineStatus).forEach((status) => {
      statusDurations.set(status, 0);
    });

    if (history.length === 0) {
      // Если нет истории изменений в периоде, используем начальный статус весь период
      const duration =
        (actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      statusDurations.set(initialStatus, duration);
    } else {
      // Начинаем с начального статуса (который был до периода или текущий)
      let activeStatus = initialStatus;
      let currentTime = startDate;

      for (const record of history) {
        const changeTime = record.createdAt;
        const duration =
          (changeTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

        if (duration > 0) {
          statusDurations.set(
            activeStatus,
            (statusDurations.get(activeStatus) || 0) + duration,
          );
        }

        activeStatus = record.newStatus;
        currentTime = changeTime;
      }

      // Добавляем время от последнего изменения до конца периода
      const finalDuration =
        (actualEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      if (finalDuration > 0) {
        statusDurations.set(
          activeStatus,
          (statusDurations.get(activeStatus) || 0) + finalDuration,
        );
      }
    }

    const totalHours =
      (actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const breakdown: StatusBreakdown[] = [];

    for (const [status, hours] of statusDurations.entries()) {
      breakdown.push({
        status,
        hours: Math.round(hours * 100) / 100,
        percentage:
          totalHours > 0 ? Math.round((hours / totalHours) * 10000) / 100 : 0,
      });
    }

    return breakdown.sort((a, b) => b.hours - a.hours);
  }

  private calculateDateRange(dto: GetMachineUptimeStatsDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dto.dateRangeType === DateRangeType.CUSTOM) {
      // Парсим дату и устанавливаем время на 00:00:00 в локальной временной зоне
      startDate = new Date(dto.startDate!);
      startDate.setHours(0, 0, 0, 0);
      
      // Для endDate устанавливаем 23:59:59.999
      endDate = new Date(dto.endDate!);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (dto.dateRangeType) {
        case DateRangeType.DAY:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          break;
        case DateRangeType.WEEK:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          break;
        case DateRangeType.MONTH:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          break;
        default:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
      }
    }

    return { startDate, endDate };
  }
}
