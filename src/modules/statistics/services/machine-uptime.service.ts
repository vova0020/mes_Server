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

  async getMachineUptimeStats(dto: GetMachineUptimeStatsDto): Promise<MachineUptimeResponse> {
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

      const statusBreakdown = this.calculateStatusBreakdown(
        statusHistory,
        machine.status,
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
    currentStatus: MachineStatus,
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

    // Получаем последнюю запись перед startDate для определения начального статуса
    const previousHistory = history.length > 0 ? history[0].newStatus : currentStatus;

    if (history.length === 0) {
      // Если нет истории изменений в периоде, используем текущий статус
      const duration = (actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      statusDurations.set(currentStatus, duration);
    } else {
      let activeStatus = previousHistory;
      let currentTime = startDate;

      for (const record of history) {
        const changeTime = record.createdAt;
        const duration = (changeTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

        if (duration > 0) {
          statusDurations.set(activeStatus, (statusDurations.get(activeStatus) || 0) + duration);
        }

        activeStatus = record.newStatus;
        currentTime = changeTime;
      }

      // Добавляем время от последнего изменения до текущего момента (или конца периода)
      const finalDuration = (actualEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      if (finalDuration > 0) {
        statusDurations.set(activeStatus, (statusDurations.get(activeStatus) || 0) + finalDuration);
      }
    }

    const totalHours = (actualEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const breakdown: StatusBreakdown[] = [];

    for (const [status, hours] of statusDurations.entries()) {
      breakdown.push({
        status,
        hours: Math.round(hours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((hours / totalHours) * 10000) / 100 : 0,
      });
    }

    return breakdown.sort((a, b) => b.hours - a.hours);
  }

  private calculateDateRange(dto: GetMachineUptimeStatsDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dto.dateRangeType === DateRangeType.CUSTOM) {
      startDate = new Date(dto.startDate!);
      endDate = new Date(dto.endDate!);
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
