import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { Machine, MachineStatus } from '@prisma/client';
import {
  StagesWithSubstagesResponse,
  SubstageOptionResponse,
} from '../../dto/machines/machines.dto';
import { SocketService } from '../../../websocket/services/socket.service';


export interface CreateMachineData {
  machineName: string;
  status: MachineStatus;
  recommendedLoad: number;
  loadUnit: string;
  noSmenTask: boolean;
}

export interface UpdateMachineData {
  machineName?: string;
  status?: MachineStatus;
  recommendedLoad?: number;
  loadUnit?: string;
  noSmenTask?: boolean;
}

@Injectable()
export class MachinesService {
  private readonly logger = new Logger(MachinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) {
    this.logger.log('🔧 MachinesService: Сервис инициализирован');
  }

  // Получить все станки с их связями
  async findAll() {
    const startTime = Date.now();
    this.logger.log('📋 Запрос всех станков');

    try {
      const result = await this.prisma.machine.findMany({
        include: {
          machinesStages: {
            include: {
              stage: true,
            },
          },
          machineSubstages: {
            include: {
              substage: {
                include: {
                  stage: true,
                },
              },
            },
          },
        },
        orderBy: {
          machineName: 'asc',
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Найдено ${result.length} станков за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ Ошибка при получении станков за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // Получить станок по ID
  async findOne(id: number) {
    const startTime = Date.now();
    this.logger.log(`🔍 Поиск станка с ID ${id}`);

    try {
      const result = await this.prisma.machine.findUnique({
        where: { machineId: id },
        include: {
          machinesStages: {
            include: {
              stage: true,
            },
          },
          machineSubstages: {
            include: {
              substage: {
                include: {
                  stage: true,
                },
              },
            },
          },
        },
      });

      const executionTime = Date.now() - startTime;
      if (result) {
        this.logger.log(
          `✅ Найден станок "${result.machineName}" (ID: ${id}) за ${executionTime}ms`,
        );
      } else {
        this.logger.warn(
          `⚠️ Станок с ID ${id} не найден за ${executionTime}ms`,
        );
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ Ошибка при пои��ке станка ID ${id} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // Создать новый станок
  async create(data: CreateMachineData) {
    const startTime = Date.now();
    this.logger.log('➕ Создание нового станка');
    this.logger.debug('📝 Данные для создания:', JSON.stringify(data, null, 2));

    try {
      const result = await this.prisma.machine.create({
        data: {
          machineName: data.machineName,
          status: data.status,
          recommendedLoad: data.recommendedLoad,
          loadUnit: data.loadUnit,
          noSmenTask: data.noSmenTask,
        },
        include: {
          machinesStages: {
            include: {
              stage: true,
            },
          },
          machineSubstages: {
            include: {
              substage: {
                include: {
                  stage: true,
                },
              },
            },
          },
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          // 'room:machines',
          // 'room:machinesnosmen',
          // 'room:technologist',
          // 'room:masterypack',
          // 'room:director',
        ],
        'machine:event',
        { status: 'updated' },
      );


      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Успешно создан станок "${result.machineName}" (ID: ${result.machineId}) за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ Ошибка при создании станка за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // Обновить станок
  async update(id: number, data: UpdateMachineData) {
    const startTime = Date.now();
    this.logger.log(`🔄 Обновление станка ID ${id}`);
    this.logger.debug(
      '📝 Данные для обновления:',
      JSON.stringify(data, null, 2),
    );

    try {
      const result = await this.prisma.machine.update({
        where: { machineId: id },
        data,
        include: {
          machinesStages: {
            include: {
              stage: true,
            },
          },
          machineSubstages: {
            include: {
              substage: {
                include: {
                  stage: true,
                },
              },
            },
          },
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

       // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          // 'room:machines',
          // 'room:machinesnosmen',
          // 'room:technologist',
          // 'room:masterypack',
          // 'room:director',
        ],
        'machine:event',
        { status: 'updated' },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Успешно обновлен станок "${result.machineName}" (ID: ${id}) за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error.code === 'P2025') {
        this.logger.warn(
          `⚠️ Станок с ID ${id} не найден (P2025) за ${executionTime}ms`,
        );
        return null;
      }
      this.logger.error(
        `❌ Ошибка при обновлении станка ID ${id} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // Удалить станок
  async remove(id: number) {
    const startTime = Date.now();
    this.logger.log(`🗑️ Удаление станка ID ${id}`);

    try {
      // Сначала получаем да��ные станка для возврата
      const machine = await this.prisma.machine.findUnique({
        where: { machineId: id },
      });

      if (!machine) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `⚠️ Станок с ID ${id} не найден за ${executionTime}ms`,
        );
        return null;
      }

      this.logger.log(`🔍 Найден станок "${machine.machineName}" для удаления`);

      // Удаляем станок (связи удалятся автоматически благодаря CASCADE)
      await this.prisma.machine.delete({
        where: { machineId: id },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

       // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          // 'room:machines',
          // 'room:machinesnosmen',
          // 'room:technologist',
          // 'room:masterypack',
          // 'room:director',
        ],
        'machine:event',
        { status: 'updated' },
      );


      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Успешно удален станок "${machine.machineName}" (ID: ${id}) за ${executionTime}ms`,
      );
      return machine;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error.code === 'P2025') {
        this.logger.warn(
          `⚠️ Станок с ID ${id} не найден (P2025) за ${executionTime}ms`,
        );
        return null;
      }
      this.logger.error(
        `❌ Ошибка при удалении станка ID ${id} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // Добавить связь с этапом 1-го уровня
  async addStage(machineId: number, stageId: number) {
    console.log(
      `🔗 MachinesService.addStage: Добавление связи станка ${machineId} с этапом ${stageId}`,
    );

    try {
      // Проверяем существование станка
      console.log(`🔍 Проверка существования станка ID ${machineId}`);
      const machine = await this.prisma.machine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        console.log(`❌ Станок с ID ${machineId} не найден`);
        throw new Error('Станок не найден');
      }
      console.log(`✅ Станок "${machine.machineName}" найден`);

      // Проверяем существование этапа
      console.log(`🔍 Проверка существования этапа ID ${stageId}`);
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId },
      });

      if (!stage) {
        console.log(`❌ Этап с ID ${stageId} не найден`);
        throw new Error('Этап не найден');
      }
      console.log(`✅ Этап "${stage.stageName}" найден`);

      // Проверяем, не существует ли уже такая связь
      console.log(
        `🔍 Проверка существующих связей между станком ${machineId} и этапом ${stageId}`,
      );
      const existingRelation = await this.prisma.machineStage.findFirst({
        where: {
          machineId,
          stageId,
        },
      });

      if (existingRelation) {
        console.log(
          `⚠️ Связь между станком ${machineId} и этапом ${stageId} уже существует`,
        );
        throw new Error('Связь между станком и этапом уже существует');
      }

      console.log(
        `➕ Создание новой связи между станком "${machine.machineName}" и этапом "${stage.stageName}"`,
      );
      const result = await this.prisma.machineStage.create({
        data: {
          machineId,
          stageId,
        },
        include: {
          machine: true,
          stage: true,
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

       // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          // 'room:machines',
          // 'room:machinesnosmen',
          // 'room:technologist',
          // 'room:masterypack',
          // 'room:director',
        ],
        'machine:event',
        { status: 'updated' },
      );

      console.log(
        `✅ MachinesService.addStage: Успешно создана связь (ID: ${result.machineStageId})`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ MachinesService.addStage: Ошибка при добавлении связи станка ${machineId} с этапом ${stageId}:`,
        error,
      );
      throw error;
    }
  }

  // Удалить связь с этапом 1-го уровня
  async removeStage(machineId: number, stageId: number) {
    console.log(
      `🔗❌ MachinesService.removeStage: Удаление связи станка ${machineId} с этапом ${stageId}`,
    );

    try {
      const relation = await this.prisma.machineStage.findFirst({
        where: {
          machineId,
          stageId,
        },
      });

      if (!relation) {
        console.log(
          `⚠️ Связь между станком ${machineId} и этапом ${stageId} не найдена`,
        );
        throw new Error('Связь между станком и этапом не найдена');
      }

      console.log(
        `🔍 Найдена связь ID ${relation.machineStageId}, начинаем удаление`,
      );

      // При удалении связи с этапом 1-го уровня, также удаляем все связи с подэтапами этого этапа
      console.log(
        `🔗❌ Удаление всех связей с подэтапами этапа ${stageId} для станка ${machineId}`,
      );
      const deletedSubstages = await this.prisma.machineSubstage.deleteMany({
        where: {
          machineId,
          substage: {
            stageId,
          },
        },
      });

      console.log(`✅ Удалено ${deletedSubstages.count} связей с подэтапами`);

      await this.prisma.machineStage.delete({
        where: {
          machineStageId: relation.machineStageId,
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

       // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          // 'room:machines',
          // 'room:machinesnosmen',
          // 'room:technologist',
          // 'room:masterypack',
          // 'room:director',
        ],
        'machine:event',
        { status: 'updated' },
      );

      console.log(
        `✅ MachinesService.removeStage: Успешно удалена связь станка ${machineId} с этапом ${stageId}`,
      );
    } catch (error) {
      console.error(
        `❌ MachinesService.removeStage: Ошибка при удалении связи станка ${machineId} с этапом ${stageId}:`,
        error,
      );
      throw error;
    }
  }

  // Добавить связь с подэтапом 2-го уровня (с валидацией)
  async addSubstage(machineId: number, substageId: number) {
    console.log(
      `🔗 MachinesService.addSubstage: Добавление связи станка ${machineId} с подэтапом ${substageId}`,
    );

    try {
      // Проверяем существование станка
      console.log(`🔍 Проверка существования станка ID ${machineId}`);
      const machine = await this.prisma.machine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        console.log(`❌ Станок с ID ${machineId} не найден`);
        throw new Error('Станок не найден');
      }
      console.log(`✅ Станок "${machine.machineName}" найден`);

      // Получаем подэтап с информацией о родительском этапе
      console.log(`🔍 Получение информации о подэтапе ID ${substageId}`);
      const substage = await this.prisma.productionStageLevel2.findUnique({
        where: { substageId },
        include: {
          stage: true,
        },
      });

      if (!substage) {
        console.log(`❌ Подэтап с ID ${substageId} не найден`);
        throw new Error('Подэтап не найден');
      }
      console.log(
        `✅ Подэтап "${substage.substageName}" на��ден, родительский этап: "${substage.stage.stageName}"`,
      );

      // КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверяем, что станок связан с родительским этапом 1-го уровня
      console.log(
        `🔍 Проверка связи станка ${machineId} с родительским этапом ${substage.stageId}`,
      );
      const machineStageRelation = await this.prisma.machineStage.findFirst({
        where: {
          machineId,
          stageId: substage.stageId,
        },
      });

      if (!machineStageRelation) {
        console.log(
          `❌ Станок ${machineId} не связан с родительским этапом ${substage.stageId}`,
        );
        throw new Error(
          `Нельзя привязать подэтап "${substage.substageName}" к станку. ` +
          `Станок должен быть сначала связан с этапом "${substage.stage.stageName}"`,
        );
      }
      console.log(
        `✅ Найдена связь станка с родительским этапом (ID: ${machineStageRelation.machineStageId})`,
      );

      // Проверяем, не существует ли уже такая связь
      console.log(
        `🔍 Проверка существующих связей между станком ${machineId} и подэтапом ${substageId}`,
      );
      const existingRelation = await this.prisma.machineSubstage.findFirst({
        where: {
          machineId,
          substageId,
        },
      });

      if (existingRelation) {
        console.log(
          `⚠️ Связь между станком ${machineId} и подэтапом ${substageId} уже существует`,
        );
        throw new Error('Связь между станком и подэтапом уже существует');
      }

      console.log(
        `➕ Создание новой связи между станком "${machine.machineName}" и подэтапом "${substage.substageName}"`,
      );
      const result = await this.prisma.machineSubstage.create({
        data: {
          machineId,
          substageId,
        },
        include: {
          machine: true,
          substage: {
            include: {
              stage: true,
            },
          },
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

      console.log(
        `✅ MachinesService.addSubstage: Успешно создана связь (ID: ${result.machineSubstageId})`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ MachinesService.addSubstage: Ошибка при добавлении связи станка ${machineId} с подэтапом ${substageId}:`,
        error,
      );
      throw error;
    }
  }

  // Удалить связь с подэтапом 2-го уровня
  async removeSubstage(machineId: number, substageId: number) {
    console.log(
      `🔗❌ MachinesService.removeSubstage: Удаление связи станка ${machineId} с подэтапом ${substageId}`,
    );

    try {
      const relation = await this.prisma.machineSubstage.findFirst({
        where: {
          machineId,
          substageId,
        },
      });

      if (!relation) {
        console.log(
          `⚠️ Связь между станком ${machineId} и подэтапом ${substageId} не найдена`,
        );
        throw new Error('Связь между станком и подэтапом не найдена');
      }

      console.log(
        `🔍 Найдена связь ID ${relation.machineSubstageId}, начинаем удаление`,
      );

      await this.prisma.machineSubstage.delete({
        where: {
          machineSubstageId: relation.machineSubstageId,
        },
      });

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
        'machine_setting:event',
        { status: 'updated' },
      );

      console.log(
        `✅ MachinesService.removeSubstage: Успешно удалена связь станка ${machineId} с подэтапом ${substageId}`,
      );
    } catch (error) {
      console.error(
        `❌ MachinesService.removeSubstage: Ошибка при уд��лении связи станка ${machineId} с подэтапом ${substageId}:`,
        error,
      );
      throw error;
    }
  }

  // Получить все этапы и подэтапы для станка
  async getMachineStages(machineId: number) {
    console.log(
      `📋 MachinesService.getMachineStages: Получение этапов для станка ${machineId}`,
    );

    try {
      const machine = await this.prisma.machine.findUnique({
        where: { machineId },
        include: {
          machinesStages: {
            include: {
              stage: {
                include: {
                  productionStagesLevel2: true,
                },
              },
            },
          },
          machineSubstages: {
            include: {
              substage: {
                include: {
                  stage: true,
                },
              },
            },
          },
        },
      });

      if (!machine) {
        console.log(`❌ Станок с ID ${machineId} не найден`);
        throw new Error('Станок не найден');
      }

      console.log(`✅ Найден станок "${machine.machineName}"`);
      console.log(`📊 Связано этапов: ${machine.machinesStages.length}`);
      console.log(`📊 Связано подэтапов: ${machine.machineSubstages.length}`);

      const result = {
        machine: {
          machineId: machine.machineId,
          machineName: machine.machineName,
        },
        stages: machine.machinesStages.map((ms) => ({
          stageId: ms.stage.stageId,
          stageName: ms.stage.stageName,
          availableSubstages: ms.stage.productionStagesLevel2,
          connectedSubstages: machine.machineSubstages
            .filter((mss) => mss.substage.stageId === ms.stage.stageId)
            .map((mss) => mss.substage),
        })),
      };

      console.log(
        `✅ MachinesService.getMachineStages: Данные подготовлены для станка ${machineId}`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ MachinesService.getMachineStages: Ошибка при получении этапов станка ${machineId}:`,
        error,
      );
      throw error;
    }
  }

  // Получить доступные этапы для привязки к станку
  async getAvailableStages() {
    console.log(
      '📋 MachinesService.getAvailableStages: Получение доступных этапов',
    );

    try {
      const result = await this.prisma.productionStageLevel1.findMany({
        include: {
          productionStagesLevel2: true,
        },
        orderBy: {
          stageName: 'asc',
        },
      });

      console.log(
        `✅ MachinesService.getAvailableStages: Найдено ${result.length} доступных этапов`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ MachinesService.getAvailableStages: Ошибка при получении доступных этапов:',
        error,
      );
      throw error;
    }
  }

  // Получить доступные подэтапы для конкретного этапа
  async getAvailableSubstages(stageId: number) {
    console.log(
      `📋 MachinesService.getAvailableSubstages: Получение подэтапов для этапа ${stageId}`,
    );

    try {
      const result = await this.prisma.productionStageLevel2.findMany({
        where: { stageId },
        include: {
          stage: true,
        },
        orderBy: {
          substageName: 'asc',
        },
      });

      console.log(
        `✅ MachinesService.getAvailableSubstages: Найдено ${result.length} подэтапов для этапа ${stageId}`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ MachinesService.getAvailableSubstages: Ошибка при получении подэтапов для этапа ${stageId}:`,
        error,
      );
      throw error;
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД: Получить все этапы с подэтапами для выпадающих списков
  async getAllStagesWithSubstages(): Promise<StagesWithSubstagesResponse[]> {
    console.log(
      '📋 MachinesService.getAllStagesWithSubstages: Получение всех этапов с подэтапами',
    );

    try {
      const stages = await this.prisma.productionStageLevel1.findMany({
        include: {
          productionStagesLevel2: {
            orderBy: {
              substageName: 'asc',
            },
          },
        },
        orderBy: {
          stageName: 'asc',
        },
      });

      console.log(`✅ Найдено ${stages.length} этапов`);

      const result = stages.map((stage) => {
        const substagesCount = stage.productionStagesLevel2.length;
        console.log(
          `📝 Этап "${stage.stageName}" содержит ${substagesCount} подэтапов`,
        );

        return {
          stageId: stage.stageId,
          stageName: stage.stageName,
          description: stage.description,
          createdAt: stage.createdAt,
          updatedAt: stage.updatedAt,
          substages: stage.productionStagesLevel2.map((substage) => ({
            substageId: substage.substageId,
            substageName: substage.substageName,
            description: substage.description,
            allowance: Number(substage.allowance),
          })),
        };
      });

      console.log(
        `✅ MachinesService.getAllStagesWithSubstages: Данные подготовлены`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ MachinesService.getAllStagesWithSubstages: Ошибка при получении этапов с подэтапами:',
        error,
      );
      throw error;
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД: Получить все подэтапы сгруппированные по этапам (альтернативный формат)
  async getAllSubstagesGrouped(): Promise<SubstageOptionResponse[]> {
    console.log(
      '📋 MachinesService.getAllSubstagesGrouped: Получение всех подэтапов сгруппированных по этапам',
    );

    try {
      const substages = await this.prisma.productionStageLevel2.findMany({
        include: {
          stage: true,
        },
        orderBy: [
          {
            stage: {
              stageName: 'asc',
            },
          },
          {
            substageName: 'asc',
          },
        ],
      });

      console.log(`✅ Найдено ${substages.length} подэтапов`);

      const result = substages.map((substage) => ({
        substageId: substage.substageId,
        substageName: substage.substageName,
        description: substage.description,
        allowance: Number(substage.allowance),
        parentStage: {
          stageId: substage.stage.stageId,
          stageName: substage.stage.stageName,
        },
      }));

      console.log(
        `✅ MachinesService.getAllSubstagesGrouped: Данные подготовлены`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ MachinesService.getAllSubstagesGrouped: Ошибка при получении сгруппированных подэтапов:',
        error,
      );
      throw error;
    }
  }

  // НОВЫЙ МЕТОД: Получить количество этапов и подэтапов (для статистики)
  async getStagesStatistics() {
    console.log('📊 MachinesService.getStagesStatistics: Получение статистики');

    try {
      console.log('🔢 Подсчет этапов...');
      const stagesCount = await this.prisma.productionStageLevel1.count();

      console.log('🔢 Подсчет подэтапов...');
      const substagesCount = await this.prisma.productionStageLevel2.count();

      console.log('🔢 Подсчет станков...');
      const machinesCount = await this.prisma.machine.count();

      console.log('🔢 Подсчет связей станков с этапами...');
      const machineStagesCount = await this.prisma.machineStage.count();

      console.log('🔢 Подсчет связей станков с подэтапами...');
      const machineSubstagesCount = await this.prisma.machineSubstage.count();

      const result = {
        stages: stagesCount,
        substages: substagesCount,
        machines: machinesCount,
        machineStageConnections: machineStagesCount,
        machineSubstageConnections: machineSubstagesCount,
      };

      console.log('📊 Статистика:', JSON.stringify(result, null, 2));
      console.log(
        `✅ MachinesService.getStagesStatistics: Статистика подготовлена`,
      );

      return result;
    } catch (error) {
      console.error(
        '❌ MachinesService.getStagesStatistics: Ошибка при получении статистики:',
        error,
      );
      throw error;
    }
  }
}
