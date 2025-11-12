import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { StreamDto, StageProgressDto, MachineWorkplaceDto } from '../dto/work-monitor.dto';

@Injectable()
export class WorkMonitorService {
  constructor(private prisma: PrismaService) {}

  async getAllStreams(): Promise<StreamDto[]> {
    const routes = await this.prisma.route.findMany({
      select: {
        routeId: true,
        routeName: true,
      },
    });

    return routes.map(route => ({
      streamId: route.routeId,
      streamName: route.routeName,
    }));
  }

  async getStreamStages(streamId: number): Promise<StageProgressDto[]> {
    const routeStages = await this.prisma.routeStage.findMany({
      where: { routeId: streamId },
      include: {
        stage: {
          include: {
            machinesStages: {
              include: {
                machine: true,
              },
            },
          },
        },
      },
      orderBy: { sequenceNumber: 'asc' },
    });

    const stageProgress: StageProgressDto[] = [];

    for (const routeStage of routeStages) {
      const machines = routeStage.stage.machinesStages.map(ms => ms.machine);
      
      // Норма смены - сумма норм всех станков этапа
      const shiftNorm = machines.reduce((sum, machine) => 
        sum + Number(machine.recommendedLoad), 0
      );

      // Выполнено - сумма выполненного на всех станках с учетом сброса
      let completed = 0;
      for (const machine of machines) {
        const assignments = await this.prisma.machineAssignment.findMany({
          where: {
            machineId: machine.machineId,
            completedAt: { not: null },
            ...(machine.counterResetAt && {
              completedAt: { gte: machine.counterResetAt },
            }),
          },
          include: {
            pallet: {
              select: {
                quantity: true,
                part: true,
              },
            },
          },
        });

        const machineCompleted = this.calculateCompletedQuantity(machine, assignments);
        completed += machineCompleted;
      }

      stageProgress.push({
        stageId: routeStage.stage.stageId,
        stageName: routeStage.stage.stageName,
        shiftNorm: Math.round(shiftNorm),
        completed: Math.round(completed),
        workplaceCount: machines.length,
      });
    }

    return stageProgress;
  }

  async getStageWorkplaces(streamId: number, stageId: number): Promise<MachineWorkplaceDto[]> {
    const machines = await this.prisma.machine.findMany({
      where: {
        machinesStages: {
          some: { stageId },
        },
      },
      include: {
        machinesStages: {
          where: { stageId },
        },
      },
    });

    const workplaces: MachineWorkplaceDto[] = [];

    for (const machine of machines) {
      const assignments = await this.prisma.machineAssignment.findMany({
        where: {
          machineId: machine.machineId,
          completedAt: { not: null },
          ...(machine.counterResetAt && {
            completedAt: { gte: machine.counterResetAt },
          }),
        },
        include: {
          pallet: {
            select: {
              quantity: true,
              part: true,
            },
          },
        },
      });

      const completed = this.calculateCompletedQuantity(machine, assignments);

      workplaces.push({
        machineId: machine.machineId,
        machineName: machine.machineName,
        norm: Number(machine.recommendedLoad),
        completed: Math.round(completed),
        planned: Number(machine.recommendedLoad),
      });
    }

    return workplaces;
  }

  private calculateCompletedQuantity(machine: any, assignments: any[]): number {
    const filteredAssignments = assignments.filter(assignment => {
      return machine.counterResetAt && assignment.completedAt
        ? assignment.completedAt > machine.counterResetAt
        : true;
    });

    if (machine.loadUnit === 'м²') {
      return filteredAssignments.reduce((total, assignment) => {
        const part = assignment.pallet.part;
        const quantity = Number(assignment.pallet.quantity);
        return total + this.calculateSquareMeters(part, quantity);
      }, 0);
    } else if (machine.loadUnit === 'м³') {
      return filteredAssignments.reduce((total, assignment) => {
        const part = assignment.pallet.part;
        const quantity = Number(assignment.pallet.quantity);
        return total + this.calculateCubicMeters(part, quantity);
      }, 0);
    } else if (machine.loadUnit === 'м') {
      return filteredAssignments.reduce((total, assignment) => {
        const part = assignment.pallet.part;
        const quantity = Number(assignment.pallet.quantity);
        if (part.finishedLength != null) {
          return total + (part.finishedLength * quantity) / 1000;
        }
        return total;
      }, 0);
    } else if (machine.loadUnit === 'м обработки торца') {
      return filteredAssignments.reduce((total, assignment) => {
        const part = assignment.pallet.part;
        const quantity = Number(assignment.pallet.quantity);
        return total + this.calculateEdgeProcessingMeters(part, quantity);
      }, 0);
    } else {
      return filteredAssignments.reduce(
        (total, assignment) => total + Number(assignment.pallet.quantity),
        0,
      );
    }
  }

  private calculateSquareMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;
    if (!length || !width || length <= 0 || width <= 0) return 0;
    return (length * width * quantity) / 1000000;
  }

  private calculateCubicMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;
    const thickness = part.thickness;
    if (!length || !width || !thickness || length <= 0 || width <= 0 || thickness <= 0) return 0;
    return (length * width * thickness * quantity) / 1000000000;
  }

  private calculateEdgeProcessingMeters(part: any, quantity: number): number {
    const length = part.finishedLength;
    const width = part.finishedWidth;
    if (!length || !width || length <= 0 || width <= 0) return 0;

    let perimeter = 0;
    if (part.edgingNameL1) perimeter += length;
    if (part.edgingNameL2) perimeter += length;
    if (part.edgingNameW1) perimeter += width;
    if (part.edgingNameW2) perimeter += width;

    return (perimeter * quantity) / 1000;
  }
}