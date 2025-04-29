
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ======================================================
  // 1. Модуль авторизации: Роли, Пользователи, Дополнительные данные
  // ======================================================

  // Создаём роли
  const adminRole = await prisma.role.create({ data: { name: 'admin' } });
  const operatorRole = await prisma.role.create({ data: { name: 'operator' } });
  const masterRole = await prisma.role.create({ data: { name: 'master' } });

  // Создаём пользователей с дополнительными данными
  const adminUser = await prisma.user.create({
    data: {
      username: 'adminUser',
      password: '123456789',
      role: { connect: { id: adminRole.id } },
      details: {
        create: {
          fullName: 'Администратор Системы',
          phone: '1234567890',
          position: 'Системный администратор',
          salary: 1500,
        },
      },
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      username: 'operatorUser',
      password: '123456789',
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Оператор Завода',
          phone: '9876543210',
          position: 'Оператор',
          salary: 1000,
        },
      },
    },
  });

  const masterUser = await prisma.user.create({
    data: {
      username: 'masterUser',
      password: '123456789',
      role: { connect: { id: masterRole.id } },
      details: {
        create: {
          fullName: 'Мастер Производства',
          phone: '1112223333',
          position: 'Мастер',
          salary: 2000,
        },
      },
    },
  });

  // ======================================================
  // 2. Модуль производственных процессов: Этапы обработки и Станки
  // ======================================================

  // Создаём этапы обработки
  const processStepRaskroy = await prisma.processStep.create({
    data: {
      name: 'Раскрой',
      sequence: 1,
      description: 'Первый этап обработки: раскрой деталей из исходного материала',
    },
  });
  const processStepPrisadka = await prisma.processStep.create({
    data: {
      name: 'Присадка',
      sequence: 2,
      description: 'Второй этап: присадка деталей',
    },
  });
  const processStepPokleyka = await prisma.processStep.create({
    data: {
      name: 'Поклейка',
      sequence: 3,
      description: 'Третий этап: поклейка деталей',
    },
  });

  // Создаём несколько станков с различными статусами
  const machine1 = await prisma.machine.create({
    data: { name: 'Станок №1', status: 'ACTIVE' },
  });
  const machine2 = await prisma.machine.create({
    data: { name: 'Станок №2', status: 'MAINTENANCE' },
  });
  const machine3 = await prisma.machine.create({
    data: { name: 'Станок №3', status: 'INACTIVE' },
  });

  // ======================================================
  // 3. Модуль заказов и производства: Заказы, УПАК, Детали
  // ======================================================

  // Заказ 1 – с двумя УПАКами и несколькими деталями
  const order1 = await prisma.productionOrder.create({
    data: {
      runNumber: 'RUN-001',
      name: 'Заказ 1',
      progress: 70,
      allowedToRun: true,
      completed: false,
      ypaks: {
        create: [
          {
            name: 'УПАК-1',
            progress: 80,
            details: {
              create: [
                {
                  // Деталь A1
                  detail: {
                    create: {
                      article: 'A1',
                      name: 'Деталь A1',
                      material: 'Сталь',
                      size: 'Маленькая',
                      totalNumber: 100,
                    },
                  },
                  quantity: 40,
                },
                {
                  // Деталь A2
                  detail: {
                    create: {
                      article: 'A2',
                      name: 'Деталь A2',
                      material: 'Алюминий',
                      size: 'Средняя',
                      totalNumber: 200,
                    },
                  },
                  quantity: 60,
                },
              ],
            },
          },
          {
            name: 'УПАК-2',
            progress: 50,
            details: {
              create: [
                {
                  // Деталь B1
                  detail: {
                    create: {
                      article: 'B1',
                      name: 'Деталь B1',
                      material: 'Пластик',
                      size: 'Большая',
                      totalNumber: 150,
                    },
                  },
                  quantity: 70,
                },
              ],
            },
          },
        ],
      },
    },
    include: { ypaks: { include: { details: true } } },
  });

  // Заказ 2 – с одним УПАКом и одной деталью
  const order2 = await prisma.productionOrder.create({
    data: {
      runNumber: 'RUN-002',
      name: 'Заказ 2',
      progress: 30,
      allowedToRun: true,
      completed: false,
      ypaks: {
        create: [
          {
            name: 'УПАК-3',
            progress: 40,
            details: {
              create: [
                {
                  // Деталь C1
                  detail: {
                    create: {
                      article: 'C1',
                      name: 'Деталь C1',
                      material: 'Медь',
                      size: 'Стандартная',
                      totalNumber: 80,
                    },
                  },
                  quantity: 30,
                },
              ],
            },
          },
        ],
      },
    },
    include: { ypaks: { include: { details: true } } },
  });

  // Заказ 3 – завершённый заказ с одним УПАКом и деталью D1
  const order3 = await prisma.productionOrder.create({
    data: {
      runNumber: 'RUN-003',
      name: 'Заказ 3',
      progress: 90,
      allowedToRun: false,
      completed: true,
      finishedAt: new Date(),
      ypaks: {
        create: [
          {
            name: 'УПАК-4',
            progress: 100,
            details: {
              create: [
                {
                  // Деталь D1
                  detail: {
                    create: {
                      article: 'D1',
                      name: 'Деталь D1',
                      material: 'Ламинированная фанера',
                      size: 'Стандартная',
                      totalNumber: 120,
                    },
                  },
                  quantity: 50,
                },
              ],
            },
          },
        ],
      },
    },
    include: { ypaks: { include: { details: true } } },
  });

  // ======================================================
  // 4. Создаём поддоны для деталей (ProductionPallets)
  // ======================================================

  // Получаем ранее созданные детали по артикулу
  const detailA1 = await prisma.productionDetail.findFirst({ where: { article: 'A1' } });
  const detailA2 = await prisma.productionDetail.findFirst({ where: { article: 'A2' } });
  const detailB1 = await prisma.productionDetail.findFirst({ where: { article: 'B1' } });
  const detailC1 = await prisma.productionDetail.findFirst({ where: { article: 'C1' } });
  const detailD1 = await prisma.productionDetail.findFirst({ where: { article: 'D1' } });

  if (!detailA1 || !detailA2 || !detailB1 || !detailC1 || !detailD1) {
    throw new Error('Одна из деталей не была создана');
  }

  // Создаём поддоны
  const palletA1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон A1',
      quantity: 20,
      detail: { connect: { id: detailA1.id } },
    },
  });
  const palletA2 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон A2',
      quantity: 25,
      detail: { connect: { id: detailA2.id } },
    },
  });
  const palletB1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон B1',
      quantity: 30,
      detail: { connect: { id: detailB1.id } },
    },
  });
  const palletC1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон C1',
      quantity: 15,
      detail: { connect: { id: detailC1.id } },
    },
  });
  const palletD1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон D1',
      quantity: 40,
      detail: { connect: { id: detailD1.id } },
    },
  });

  // ======================================================
  // 5. Модуль буферной системы: Буферы и ячейки (Buffer, BufferCell)
  // ======================================================

  // Создаём основной буфер с несколькими ячейками
  const bufferMain = await prisma.buffer.create({
    data: {
      name: 'Основной буфер',
      description: 'Основной буфер для поддонов',
      location: 'Цех 1',
      cells: {
        create: [
          { code: 'A1', capacity: 2, status: 'AVAILABLE' },
          { code: 'B1', capacity: 1, status: 'OCCUPIED' },
          { code: 'C1', capacity: 3, status: 'RESERVED' },
        ],
      },
    },
    include: { cells: true },
  });

  // Назначаем некоторые поддоны в ячейки буфера
  await prisma.productionPallets.update({
    where: { id: palletA2.id },
    data: { bufferCell: { connect: { id: bufferMain.cells[0].id } } },
  });
  await prisma.productionPallets.update({
    where: { id: palletC1.id },
    data: { bufferCell: { connect: { id: bufferMain.cells[2].id } } },
  });

  // ======================================================
  // 6. Модуль маршрутов обработки: Маршруты и этапы маршрута (ProductionRoute, RouteStep)
  // ======================================================

  const productionRoute = await prisma.productionRoute.create({
    data: {
      name: 'Маршрут обработки стандартной детали',
      details: {
        create: {
          article: 'E1',
          name: 'Деталь E1',
          material: 'Пластик',
          size: 'Маленькая',
          totalNumber: 60,
        },
      },
      steps: {
        create: [
          { processStep: { connect: { id: processStepRaskroy.id } }, sequence: 1 },
          { processStep: { connect: { id: processStepPrisadka.id } }, sequence: 2 },
          { processStep: { connect: { id: processStepPokleyka.id } }, sequence: 3 },
        ],
      },
    },
  });

  // ======================================================
  // 7. Модуль производственных линий и участков: Линии, Участки, Станки, Буферы для участков
  // ======================================================

  const productionLine = await prisma.productionLine.create({
    data: {
      name: 'Линия №1',
      type: 'PRIMARY',
      segments: {
        create: [
          {
            name: 'Участок №1',
            machines: {
              create: [
                { name: 'Станок №4', status: 'ACTIVE' },
                { name: 'Станок №5', status: 'INACTIVE' },
              ],
            },
          },
          {
            name: 'Участок №2',
            machines: {
              create: [{ name: 'Станок №6', status: 'MAINTENANCE' }],
            },
            buffer: {
              create: {
                name: 'Буфер для Участка №2',
                description: 'Буфер участка №2',
                location: 'Участок 2',
                cells: {
                  create: [
                    { code: 'S1', capacity: 2, status: 'AVAILABLE' },
                    { code: 'S2', capacity: 1, status: 'OCCUPIED' },
                  ],
                },
              },
            },
          },
        ],
      },
      defaultBuffer: { connect: { id: bufferMain.id } },
    },
    include: { segments: true },
  });

  // ======================================================
  // 8. Модуль производственных процессов: Операции над поддонами (DetailOperation)
  // ======================================================

  // Для поддона с Деталью A1 (palletA1) – прохождение всех этапов
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletA1.id } },
      processStep: { connect: { id: processStepRaskroy.id } },
      machine: { connect: { id: machine1.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      quantity: 10,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletA1.id } },
      processStep: { connect: { id: processStepPrisadka.id } },
      machine: { connect: { id: machine1.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      quantity: 15,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletA1.id } },
      processStep: { connect: { id: processStepPokleyka.id } },
      // На этом этапе машина и операторы могут не использоваться, т.к. поддон переведён в буфер
      status: 'BUFFERED',
      startedAt: new Date(),
      quantity: 0,
    },
  });

  // Для поддона с Деталью A2 (palletA2)
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletA2.id } },
      processStep: { connect: { id: processStepRaskroy.id } },
      machine: { connect: { id: machine2.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      quantity: 5,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletA2.id } },
      processStep: { connect: { id: processStepPrisadka.id } },
      machine: { connect: { id: machine2.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      quantity: 8,
    },
  });

  // Для поддона с Деталью B1 (palletB1)
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletB1.id } },
      processStep: { connect: { id: processStepRaskroy.id } },
      machine: { connect: { id: machine3.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      quantity: 12,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletB1.id } },
      processStep: { connect: { id: processStepPrisadka.id } },
      machine: { connect: { id: machine3.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      quantity: 15,
    },
  });

  // Для поддона с Деталью C1 (palletC1)
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletC1.id } },
      processStep: { connect: { id: processStepRaskroy.id } },
      machine: { connect: { id: machine1.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'BUFFERED',
      startedAt: new Date(),
      quantity: 0,
    },
  });

  // Для поддона с Деталью D1 (palletD1)
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletD1.id } },
      processStep: { connect: { id: processStepRaskroy.id } },
      machine: { connect: { id: machine2.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      quantity: 20,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletD1.id } },
      processStep: { connect: { id: processStepPrisadka.id } },
      machine: { connect: { id: machine2.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      quantity: 15,
    },
  });
  await prisma.detailOperation.create({
    data: {
      productionPallet: { connect: { id: palletD1.id } },
      processStep: { connect: { id: processStepPokleyka.id } },
      machine: { connect: { id: machine2.id } },
      operator: { connect: { id: operatorUser.id } },
      master: { connect: { id: masterUser.id } },
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      quantity: 5,
    },
  });

  console.log('Сидирование базы данных завершено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
