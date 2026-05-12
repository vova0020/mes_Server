import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma.service';
import { SocketService } from '../../websocket/services/socket.service';
import { AuditService } from '../../audit/services/audit.service';
import { MachineStatus, EventType } from '@prisma/client';

@Injectable()
export class MachineSchedulerService {
  private readonly logger = new Logger(MachineSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Возвращает cron-выражение для времени окончания смены из .env.
   * Переменная SHIFT_END_TIME задаётся в формате HH:MM по московскому времени (UTC+3).
   * Для cron нужно перевести в UTC: вычесть 3 часа.
   * Например, 17:30 МСК → 14:30 UTC → cron: "30 14 * * *"
   */
  private getShiftEndCron(): string {
    const raw = process.env.SHIFT_END_TIME ?? '17:30';
    const [hourStr, minuteStr] = raw.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Переводим из МСК (UTC+3) в UTC
    hour = ((hour - 3) + 24) % 24;

    return `${minute} ${hour} * * *`;
  }

  /**
   * Задача выполняется каждую минуту и проверяет, наступило ли время окончания смены.
   * Используем подход с проверкой каждую минуту, чтобы корректно читать SHIFT_END_TIME
   * из .env без перезапуска приложения.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkShiftEnd(): Promise<void> {
    const raw = process.env.SHIFT_END_TIME ?? '17:30';
    const [hourStr, minuteStr] = raw.split(':');
    const targetHour = parseInt(hourStr, 10);
    const targetMinute = parseInt(minuteStr, 10);

    // Текущее время по Москве (UTC+3)
    const nowUtc = new Date();
    const moscowOffset = 3 * 60; // минуты
    const moscowTime = new Date(nowUtc.getTime() + moscowOffset * 60 * 1000);
    const currentHour = moscowTime.getUTCHours();
    const currentMinute = moscowTime.getUTCMinutes();

    if (currentHour === targetHour && currentMinute === targetMinute) {
      this.logger.log(
        `Наступило время окончания смены (${raw} МСК). Запускаем сброс счётчиков и перевод станков в INACTIVE.`,
      );
      await this.performShiftEndReset();
    }
  }

  /**
   * Выполняет сброс счётчиков и перевод всех станков в статус INACTIVE.
   */
  async performShiftEndReset(): Promise<void> {
    try {
      // Получаем все станки
      const machines = await this.prisma.machine.findMany();

      this.logger.log(`Найдено ${machines.length} станков для обработки.`);

      for (const machine of machines) {
        const oldStatus = machine.status;

        // Обновляем статус на INACTIVE и сбрасываем счётчик
        await this.prisma.machine.update({
          where: { machineId: machine.machineId },
          data: {
            status: MachineStatus.INACTIVE,
            counterResetAt: new Date(),
            partiallyCompleted: 0,
          },
        });

        // Логируем изменение статуса
        if (oldStatus !== MachineStatus.INACTIVE) {
          await this.auditService.logMachineStatusChange(
            machine.machineId,
            oldStatus,
            MachineStatus.INACTIVE,
            undefined,
          );
        }

        // Логируем сброс счётчика
        await this.auditService.logEvent(
          EventType.MACHINE_COUNTER_RESET,
          'machine',
          machine.machineId,
          undefined,
          { counterResetAt: machine.counterResetAt },
          { counterResetAt: new Date() },
        );
      }

      // Отправляем WebSocket уведомление во все комнаты
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
      this.socketService.emitToMultipleRooms(
        ['room:statisticks'],
        'statisticks:event',
        { status: 'updated' },
      );

      this.logger.log(
        `Сброс смены завершён: ${machines.length} станков переведены в INACTIVE, счётчики сброшены.`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при выполнении сброса смены: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
