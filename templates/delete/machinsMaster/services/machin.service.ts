// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../../shared/prisma.service';
// import { OperationStatus } from '@prisma/client';

// @Injectable()
// export class MachinService {
//   private readonly logger = new Logger(MachinService.name);

//   constructor(private readonly prisma: PrismaService) {}

//   // Получение списка станков с включением связанных данных
//   async getMachines(segmentId?: number) {
//     this.logger.log(
//       `Запрос на получение списка станков${segmentId ? ` для участка: ${segmentId}` : ''}`,
//     );

//     try {
//       // Проверяем, есть ли записи в таблице
//       const count = await this.prisma.machine.count();
//       this.logger.log(`Найдено ${count} станков в базе данных`);

//       // Строим параметры запроса в зависимости от наличия segmentId
//       const where: any = {};

//       if (segmentId) {
//         // Если передан ID участка, фильтруем станки по участку
//         where.segmentId = segmentId;
//       } else {
//         // Если ID участка не передан, возвращаем только активные станки
//         where.status = 'ACTIVE';
//       }

//       // Получаем станки с учетом фильтров
//       const machineAll = await this.prisma.machine.findMany({
//         where,
//         include: {
//           // Включаем информацию об участке для отображения
//           segment: {
//             select: {
//               id: true,
//               name: true,
//             },
//           },
//         },
//       });

//       this.logger.log(`Получено ${machineAll.length} станков с данными`);

//       return machineAll;
//     } catch (error) {
//       this.logger.error(`Ошибка при получении станков: ${error.message}`);
//       throw error;
//     }
//   }

//   // Получение списка станков с информацией о поддонах, которые сейчас на них обрабатываются
//   async getMachinesWithActivePallets() {
//     this.logger.log('Запрос на получение списка станков с активными поддонами');

//     try {
//       const machinesWithPallets = await this.prisma.machine.findMany({
//         include: {
//           detailOperations: {
//             where: {
//               status: OperationStatus.IN_PROGRESS, // Только операции в процессе
//             },
//             include: {
//               productionPallet: true, // Включаем информацию о поддоне
//             },
//           },
//         },
//       });

//       // Преобразуем данные для более удобного использования на клиенте
//       const formattedMachines = machinesWithPallets.map((machine) => ({
//         id: machine.id,
//         name: machine.name,
//         status: machine.status,
//         activePallets: machine.detailOperations.map((operation) => ({
//           palletId: operation.productionPallet.id,
//           palletName: operation.productionPallet.name,
//           quantity: operation.productionPallet.quantity,
//           operationId: operation.id,
//           startedAt: operation.startedAt,
//         })),
//       }));

//       this.logger.log(
//         `Получено ${formattedMachines.length} станков с информацией об активных поддонах`,
//       );
//       return formattedMachines;
//     } catch (error) {
//       this.logger.error(
//         `Ошибка при получении станков с активными поддонами: ${error.message}`,
//       );
//       throw error;
//     }
//   }

//   // Получение информации о конкретном станке с активными поддонами
//   async getMachineWithActivePalletsById(id: number) {
//     this.logger.log(
//       `Запрос на получение станка с ID ${id} и активными поддонами`,
//     );

//     try {
//       const machine = await this.prisma.machine.findUnique({
//         where: { id },
//         include: {
//           detailOperations: {
//             where: {
//               status: OperationStatus.IN_PROGRESS, // Только операции в процессе
//             },
//             include: {
//               productionPallet: {
//                 include: {
//                   detail: true, // Включаем информацию о деталях на поддоне
//                 },
//               },
//               processStep: true, // Включаем информацию об этапе обработки
//             },
//           },
//         },
//       });

//       if (!machine) {
//         this.logger.warn(`Станок с ID ${id} не найден`);
//         return null;
//       }

//       // Преобразуем данные для более удобного использования
//       const formattedMachine = {
//         id: machine.id,
//         name: machine.name,
//         status: machine.status,
//         activePallets: machine.detailOperations.map((operation) => ({
//           palletId: operation.productionPallet.id,
//           palletName: operation.productionPallet.name,
//           quantity: operation.productionPallet.quantity,
//           detailId: operation.productionPallet.detail.id,
//           detailName: operation.productionPallet.detail.name,
//           processStep: operation.processStep.name,
//           operationId: operation.id,
//           startedAt: operation.startedAt,
//         })),
//       };

//       this.logger.log(
//         `Получен станок с ID ${id} и ${formattedMachine.activePallets.length} активными поддонами`,
//       );
//       return formattedMachine;
//     } catch (error) {
//       this.logger.error(
//         `Ошибка при получении станка с ID ${id} и активными поддонами: ${error.message}`,
//       );
//       throw error;
//     }
//   }
// }
