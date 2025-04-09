
// import { PrismaClient } from '@prisma/client';
// import * as bcrypt from 'bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   // Создание ролей
//   const roles = ['admin', 'user'];
//   for (const role of roles) {
//     await prisma.role.upsert({
//       where: { name: role },
//       update: {},
//       create: {
//         name: role,
//       },
//     });
//   }

//   // Создание пользователя-администратора
//   const hashedPassword = await bcrypt.hash('adminpassword', 10);
//   const adminUser = await prisma.user.upsert({
//     where: { username: 'admin' },
//     update: {},
//     create: {
//       username: 'admin',
//       password: hashedPassword,
//       role: {
//         connect: { name: 'admin' },
//       },
//       details: {
//         create: {
//           fullName: 'Администратор',
//           phone: '+7 (999) 888-88-88',
//           position: 'System Administrator',
//         },
//       },
//     },
//   });

//   console.log('Инициализация базы данных завершена.');
// }

// // Выполняем скрипт и закрываем соединение
// main()
//   .catch((e) => console.error(e))
//   .finally(async () => {
//     await prisma.$disconnect();
//   });



import {
  PrismaClient,
  BufferCellStatus,
  MachineStatus,
  OperationStatus,
  ProductionLineType,
  BufferCell
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создание ролей
  const roles = ['admin', 'user', 'operator', 'master'];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: {
        name: role,
      },
    });
  }

  // Создание оператора
  const operatorUser = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      password: await bcrypt.hash('operator123', 10),
      role: {
        connect: { name: 'operator' },
      },
      details: {
        create: {
          fullName: 'Иванов Иван Иванович',
          phone: '+7 (999) 777-77-77',
          position: 'Оператор станка',
          salary: 50000,
        },
      },
    },
  });

  // Создание мастера
  const masterUser = await prisma.user.upsert({
    where: { username: 'master' },
    update: {},
    create: {
      username: 'master',
      password: await bcrypt.hash('master123', 10),
      role: {
        connect: { name: 'master' },
      },
      details: {
        create: {
          fullName: 'Петров Петр Петрович',
          phone: '+7 (999) 666-66-66',
          position: 'Мастер участка',
          salary: 70000,
        },
      },
    },
  });

  // Создание производственных линий
  const primaryLine = await prisma.productionLine.create({
    data: {
      name: 'Основная линия',
      type: ProductionLineType.PRIMARY,
    },
  });

  const secondaryLine = await prisma.productionLine.create({
    data: {
      name: 'Вторичная линия',
      type: ProductionLineType.SECONDARY,
    },
  });

  // Создание буферов
  const mainBuffer = await prisma.buffer.create({
    data: {
      name: 'Основной буфер',
      description: 'Буфер для основной линии производства',
      location: 'Цех №1',
    },
  });

  const secondaryBuffer = await prisma.buffer.create({
    data: {
      name: 'Вторичный буфер',
      description: 'Буфер для вторичной линии производства',
      location: 'Цех №2',
    },
  });

  // Обновление линий с буферами по умолчанию
  await prisma.productionLine.update({
    where: { id: primaryLine.id },
    data: {
      defaultBuffer: {
        connect: { id: mainBuffer.id },
      },
    },
  });

  await prisma.productionLine.update({
    where: { id: secondaryLine.id },
    data: {
      defaultBuffer: {
        connect: { id: secondaryBuffer.id },
      },
    },
  });

  // Создание ячеек буфера
  const bufferCells: BufferCell[] = [];
  for (let i = 1; i <= 5; i++) {
    const cell = await prisma.bufferCell.create({
      data: {
        code: `A${i}`,
        buffer: {
          connect: { id: mainBuffer.id },
        },
        status: BufferCellStatus.AVAILABLE,
        capacity: 2,
      },
    });
    bufferCells.push(cell);
  }

  for (let i = 1; i <= 5; i++) {
    await prisma.bufferCell.create({
      data: {
        code: `B${i}`,
        buffer: {
          connect: { id: secondaryBuffer.id },
        },
        status: BufferCellStatus.AVAILABLE,
        capacity: 1,
      },
    });
  }

  // Создание участков производства
  const cuttingSegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок раскроя',
      line: {
        connect: { id: primaryLine.id },
      },
      buffer: {
        connect: { id: mainBuffer.id },
      },
    },
  });

  const drillingSegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок присадки',
      line: {
        connect: { id: primaryLine.id },
      },
    },
  });

  const edgingSegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок кромления',
      line: {
        connect: { id: secondaryLine.id },
      },
      buffer: {
        connect: { id: secondaryBuffer.id },
      },
    },
  });

  // Создание станков
  const cuttingMachine = await prisma.machine.create({
    data: {
      name: 'Раскроечный станок №1',
      status: MachineStatus.ACTIVE,
      segment: {
        connect: { id: cuttingSegment.id },
      },
    },
  });

  const drillingMachine = await prisma.machine.create({
    data: {
      name: 'Присадочный станок №1',
      status: MachineStatus.ACTIVE,
      segment: {
        connect: { id: drillingSegment.id },
      },
    },
  });

  const edgingMachine = await prisma.machine.create({
    data: {
      name: 'Кромочный станок №1',
      status: MachineStatus.ACTIVE,
      segment: {
        connect: { id: edgingSegment.id },
      },
    },
  });

  await prisma.machine.create({
    data: {
      name: 'Раскроечный станок №2',
      status: MachineStatus.MAINTENANCE,
      segment: {
        connect: { id: cuttingSegment.id },
      },
    },
  });

  // Создание этапов процесса
  const cuttingStep = await prisma.processStep.create({
    data: {
      name: 'Раскрой',
      sequence: 1,
      description: 'Раскрой листового материала на заготовки',
    },
  });

  const drillingStep = await prisma.processStep.create({
    data: {
      name: 'Присадка',
      sequence: 2,
      description: 'Сверление отверстий в заготовках',
    },
  });

  const edgingStep = await prisma.processStep.create({
    data: {
      name: 'Кромление',
      sequence: 3,
      description: 'Нанесение кромки на торцы деталей',
    },
  });

  // Создание маршрутов обработки
  const standardRoute = await prisma.productionRoute.create({
    data: {
      name: 'Стандартный маршрут',
      steps: {
        create: [
          {
            processStep: {
              connect: { id: cuttingStep.id },
            },
            sequence: 1,
          },
          {
            processStep: {
              connect: { id: drillingStep.id },
            },
            sequence: 2,
          },
          {
            processStep: {
              connect: { id: edgingStep.id },
            },
            sequence: 3,
          },
        ],
      },
    },
  });

  const alternativeRoute = await prisma.productionRoute.create({
    data: {
      name: 'Альтернативный маршрут',
      steps: {
        create: [
          {
            processStep: {
              connect: { id: cuttingStep.id },
            },
            sequence: 1,
          },
          {
            processStep: {
              connect: { id: edgingStep.id },
            },
            sequence: 2,
          },
          {
            processStep: {
              connect: { id: drillingStep.id },
            },
            sequence: 3,
          },
        ],
      },
    },
  });

  // Создание производственного заказа
  const order = await prisma.productionOrder.create({
    data: {
      runNumber: 'RUN-2023-001',
      name: 'Заказ на кухонные фасады',
      progress: 25.5,
      allowedToRun: true,
      completed: false,
    },
  });

  // Создание УПАКов
  const ypak1 = await prisma.productionYpak.create({
    data: {
      name: 'УПАК-001',
      progress: 30.0,
      order: {
        connect: { id: order.id },
      },
    },
  });

  const ypak2 = await prisma.productionYpak.create({
    data: {
      name: 'УПАК-002',
      progress: 15.0,
      order: {
        connect: { id: order.id },
      },
    },
  });

  // Создание деталей
  const detail1 = await prisma.productionDetail.create({
    data: {
      article: 'DET-001',
      name: 'Фасад кухонный верхний',
      material: 'ЛДСП 16мм',
      size: '600x400',
      totalNumber: 50,
      route: {
        connect: { id: standardRoute.id },
      },
    },
  });

  const detail2 = await prisma.productionDetail.create({
    data: {
      article: 'DET-002',
      name: 'Фасад кухонный нижний',
      material: 'ЛДСП 16мм',
      size: '600x800',
      totalNumber: 30,
      route: {
        connect: { id: alternativeRoute.id },
      },
    },
  });

  // Связывание УПАКов с деталями
  await prisma.productionYpakDetail.create({
    data: {
      ypak: {
        connect: { id: ypak1.id },
      },
      detail: {
        connect: { id: detail1.id },
      },
      quantity: 30,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: {
        connect: { id: ypak1.id },
      },
      detail: {
        connect: { id: detail2.id },
      },
      quantity: 15,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: {
        connect: { id: ypak2.id },
      },
      detail: {
        connect: { id: detail1.id },
      },
      quantity: 20,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: {
        connect: { id: ypak2.id },
      },
      detail: {
        connect: { id: detail2.id },
      },
      quantity: 15,
    },
  });

  // Создание поддонов
  const pallet1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон-001',
      quantity: 10,
      detail: {
        connect: { id: detail1.id },
      },
      bufferCell: {
        connect: { id: bufferCells[0].id },
      },
    },
  });

  const pallet2 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон-002',
      quantity: 8,
      detail: {
        connect: { id: detail2.id },
      },
    },
  });

  // Обновление статуса ячейки буфера
  await prisma.bufferCell.update({
    where: { id: bufferCells[0].id },
    data: {
      status: BufferCellStatus.OCCUPIED,
    },
  });

  // Создание операций над поддонами
  await prisma.detailOperation.create({
    data: {
      productionPallet: {
        connect: { id: pallet1.id },
      },
      processStep: {
        connect: { id: cuttingStep.id },
      },
      machine: {
        connect: { id: cuttingMachine.id },
      },
      operator: {
        connect: { id: operatorUser.id },
      },
      master: {
        connect: { id: masterUser.id },
      },
      status: OperationStatus.COMPLETED,
      completedAt: new Date(),
      quantity: 10,
    },
  });

  await prisma.detailOperation.create({
    data: {
      productionPallet: {
        connect: { id: pallet1.id },
      },
      processStep: {
        connect: { id: drillingStep.id },
      },
      status: OperationStatus.BUFFERED,
      quantity: 10,
    },
  });

  await prisma.detailOperation.create({
    data: {
      productionPallet: {
        connect: { id: pallet2.id },
      },
      processStep: {
        connect: { id: cuttingStep.id },
      },
      machine: {
        connect: { id: cuttingMachine.id },
      },
      operator: {
        connect: { id: operatorUser.id },
      },
      status: OperationStatus.IN_PROGRESS,
      quantity: 8,
    },
  });

  console.log('Инициализация базы данных завершена.');
}

// Выполняем скрипт и закрываем соединение
main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });