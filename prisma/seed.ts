
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      role: { connect: { id: adminRole.id } },
      details: {
        create: {
          fullName: 'Администратор Системы',
          phone: '1234567890',
          position: 'Системный администратор',
          salary: 100000,
        },
      },
    },
  });

  // ======================================================
  // 2. Модуль производственных процессов: Этапы обработки
  // ======================================================

  // Создаём этапы обработки
  const processStepRaskroy = await prisma.processStep.create({
    data: {
      name: 'Раскрой',
      sequence: 1,
      description: 'Раскрой материалов для мебельных деталей',
    },
  });

  const processStepPokleyka = await prisma.processStep.create({
    data: {
      name: 'Поклейка',
      sequence: 2,
      description: 'Поклейка кромки на мебельные детали',
    },
  });

  const processStepPrisadka = await prisma.processStep.create({
    data: {
      name: 'Присадка',
      sequence: 3,
      description: 'Сверление отверстий в мебельных деталях',
    },
  });

  // ======================================================
  // 3. Создаём буферную систему
  // ======================================================

  // Создаём основной буфер
  const mainBuffer = await prisma.buffer.create({
    data: {
      name: 'Основной буфер',
      description: 'Центральный буфер производства',
      location: 'Центральный цех',
      cells: {
        create: [
          { code: 'A1', capacity: 2, status: 'AVAILABLE' },
          { code: 'A2', capacity: 2, status: 'AVAILABLE' },
          { code: 'B1', capacity: 2, status: 'AVAILABLE' },
          { code: 'B2', capacity: 2, status: 'AVAILABLE' },
          { code: 'C1', capacity: 2, status: 'AVAILABLE' },
          { code: 'C2', capacity: 2, status: 'AVAILABLE' },
        ],
      },
    },
  });

  // Буфер для раскройного участка
  const raskroyBuffer = await prisma.buffer.create({
    data: {
      name: 'Буфер раскройного участка',
      description: 'Буфер для участка раскроя',
      location: 'Раскройный цех',
      cells: {
        create: [
          { code: 'R1', capacity: 2, status: 'AVAILABLE' },
          { code: 'R2', capacity: 2, status: 'AVAILABLE' },
        ],
      },
    },
  });

  // Буфер для участка поклейки
  const pokleykaBuffer = await prisma.buffer.create({
    data: {
      name: 'Буфер участка поклейки',
      description: 'Буфер для участка поклейки',
      location: 'Цех поклейки',
      cells: {
        create: [
          { code: 'P1', capacity: 2, status: 'AVAILABLE' },
          { code: 'P2', capacity: 2, status: 'AVAILABLE' },
        ],
      },
    },
  });

  // Буфер для участка присадки
  const prisadkaBuffer = await prisma.buffer.create({
    data: {
      name: 'Буфер участка присадки',
      description: 'Буфер для участка присадки',
      location: 'Цех присадки',
      cells: {
        create: [
          { code: 'D1', capacity: 2, status: 'AVAILABLE' },
          { code: 'D2', capacity: 2, status: 'AVAILABLE' },
        ],
      },
    },
  });

  // ======================================================
  // 4. Модуль производственных линий и участков
  // ======================================================

  // Создаём производственную линию
  const furnitureLine = await prisma.productionLine.create({
    data: {
      name: 'Линия производства мебели',
      type: 'PRIMARY',
      defaultBuffer: { connect: { id: mainBuffer.id } },
    },
  });

  // Создаём участки и станки
  // 1. Участок раскроя
  const raskroySegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок раскроя',
      line: { connect: { id: furnitureLine.id } },
      buffer: { connect: { id: raskroyBuffer.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepRaskroy.id } },
            isPrimary: true,
          },
        ],
      },
    },
  });

  // 2. Участок поклейки
  const pokleykaSegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок поклейки',
      line: { connect: { id: furnitureLine.id } },
      buffer: { connect: { id: pokleykaBuffer.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPokleyka.id } },
            isPrimary: true,
          },
        ],
      },
    },
  });

  // 3. Участок присадки
  const prisadkaSegment = await prisma.productionSegment.create({
    data: {
      name: 'Участок присадки',
      line: { connect: { id: furnitureLine.id } },
      buffer: { connect: { id: prisadkaBuffer.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPrisadka.id } },
            isPrimary: true,
          },
        ],
      },
    },
  });

  // ======================================================
  // 5. Создаём станки для участков
  // ======================================================

  // Станки для участка раскроя
  const raskroyMachine1 = await prisma.machine.create({
    data: {
      name: 'Форматно-раскроечный станок Altendorf F45',
      status: 'ACTIVE',
      recommendedLoad: 30,
      segment: { connect: { id: raskroySegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepRaskroy.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  const raskroyMachine2 = await prisma.machine.create({
    data: {
      name: 'Форматно-раскроечный станок SCM SI 400',
      status: 'ACTIVE',
      recommendedLoad: 35,
      segment: { connect: { id: raskroySegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepRaskroy.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  // Станки для участка поклейки
  const pokleykaMachine1 = await prisma.machine.create({
    data: {
      name: 'Кромкооблицовочный станок Homag KL 79',
      status: 'ACTIVE',
      recommendedLoad: 40,
      segment: { connect: { id: pokleykaSegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPokleyka.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  const pokleykaMachine2 = await prisma.machine.create({
    data: {
      name: 'Кромкооблицовочный станок Biesse Akron 1430',
      status: 'ACTIVE',
      recommendedLoad: 38,
      segment: { connect: { id: pokleykaSegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPokleyka.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  // Станки для участка присадки
  const prisadkaMachine1 = await prisma.machine.create({
    data: {
      name: 'Сверлильно-присадочный станок Biesse Skipper 130',
      status: 'ACTIVE',
      recommendedLoad: 45,
      segment: { connect: { id: prisadkaSegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPrisadka.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  const prisadkaMachine2 = await prisma.machine.create({
    data: {
      name: 'Сверлильно-присадочный станок SCM Cyflex F900',
      status: 'ACTIVE',
      recommendedLoad: 50,
      segment: { connect: { id: prisadkaSegment.id } },
      processSteps: {
        create: [
          {
            processStep: { connect: { id: processStepPrisadka.id } },
            isDefault: true,
          },
        ],
      },
    },
  });

  // ======================================================
  // 6. Создаём пользователей-операторов и мастеров для станков и участков
  // ======================================================

  // Операторы для участка раскроя
  const raskroyOperator1 = await prisma.user.create({
    data: {
      username: 'raskroy_op1',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Иванов Петр Сергеевич',
          phone: '9051234567',
          position: 'Оператор раскройного участка',
          salary: 60000,
        },
      },
      assignedMachines: {
        connect: [{ id: raskroyMachine1.id }],
      },
    },
  });

  const raskroyOperator2 = await prisma.user.create({
    data: {
      username: 'raskroy_op2',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Петров Алексей Иванович',
          phone: '9057654321',
          position: 'Оператор раскройного участка',
          salary: 58000,
        },
      },
      assignedMachines: {
        connect: [{ id: raskroyMachine2.id }],
      },
    },
  });

  // Операторы для участка поклейки
  const pokleykaOperator1 = await prisma.user.create({
    data: {
      username: 'pokleyka_op1',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Сидоров Михаил Петрович',
          phone: '9059876543',
          position: 'Оператор участка поклейки',
          salary: 62000,
        },
      },
      assignedMachines: {
        connect: [{ id: pokleykaMachine1.id }],
      },
    },
  });

  const pokleykaOperator2 = await prisma.user.create({
    data: {
      username: 'pokleyka_op2',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Козлова Анна Ивановна',
          phone: '9053456789',
          position: 'Оператор участка поклейки',
          salary: 59000,
        },
      },
      assignedMachines: {
        connect: [{ id: pokleykaMachine2.id }],
      },
    },
  });

  // Операторы для участка присадки
  const prisadkaOperator1 = await prisma.user.create({
    data: {
      username: 'prisadka_op1',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Смирнов Владимир Александрович',
          phone: '9052345678',
          position: 'Оператор участка присадки',
          salary: 64000,
        },
      },
      assignedMachines: {
        connect: [{ id: prisadkaMachine1.id }],
      },
    },
  });

  const prisadkaOperator2 = await prisma.user.create({
    data: {
      username: 'prisadka_op2',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: operatorRole.id } },
      details: {
        create: {
          fullName: 'Кузнецова Елена Дмитриевна',
          phone: '9058765432',
          position: 'Оператор участка присадки',
          salary: 61000,
        },
      },
      assignedMachines: {
        connect: [{ id: prisadkaMachine2.id }],
      },
    },
  });

  // Создаём мастеров участков
  const raskroyMaster = await prisma.user.create({
    data: {
      username: 'raskroy_master',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: masterRole.id } },
      details: {
        create: {
          fullName: 'Соколов Игорь Николаевич',
          phone: '9051234567',
          position: 'Мастер раскройного участка',
          salary: 80000,
        },
      },
      supervisedSegments: {
        connect: [{ id: raskroySegment.id }],
      },
    },
  });

  const pokleykaMaster = await prisma.user.create({
    data: {
      username: 'pokleyka_master',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: masterRole.id } },
      details: {
        create: {
          fullName: 'Новиков Дмитрий Сергеевич',
          phone: '9057654321',
          position: 'Мастер участка поклейки',
          salary: 82000,
        },
      },
      supervisedSegments: {
        connect: [{ id: pokleykaSegment.id }],
      },
    },
  });

  const prisadkaMaster = await prisma.user.create({
    data: {
      username: 'prisadka_master',
      password: bcrypt.hashSync('12345', 10),
      role: { connect: { id: masterRole.id } },
      details: {
        create: {
          fullName: 'Морозов Андрей Владимирович',
          phone: '9059876543',
          position: 'Мастер участка присадки',
          salary: 81000,
        },
      },
      supervisedSegments: {
        connect: [{ id: prisadkaSegment.id }],
      },
    },
  });

  // ======================================================
  // 7. Создаём маршруты обработки
  // ======================================================

  // Маршрут: Раскрой -> Поклейка -> Присадка (стандартный)
  const standardRoute = await prisma.productionRoute.create({
    data: {
      name: 'Стандартный маршрут обработки',
      steps: {
        create: [
          {
            processStep: { connect: { id: processStepRaskroy.id } },
            sequence: 1,
          },
          {
            processStep: { connect: { id: processStepPokleyka.id } },
            sequence: 2,
          },
          {
            processStep: { connect: { id: processStepPrisadka.id } },
            sequence: 3,
          },
        ],
      },
    },
  });

  // Маршрут: Раскрой -> Присадка -> Поклейка (нестандартный)
  const alternativeRoute = await prisma.productionRoute.create({
    data: {
      name: 'Альтернативный маршрут обработки',
      steps: {
        create: [
          {
            processStep: { connect: { id: processStepRaskroy.id } },
            sequence: 1,
          },
          {
            processStep: { connect: { id: processStepPrisadka.id } },
            sequence: 2,
          },
          {
            processStep: { connect: { id: processStepPokleyka.id } },
            sequence: 3,
          },
        ],
      },
    },
  });

  // ======================================================
  // 8. Создаём Заказы, УПАКи, Детали и Поддоны
  // ======================================================

  // ----- Заказ 1: Кухонный гарнитур -----
  const order1 = await prisma.productionOrder.create({
    data: {
      runNumber: 'ORD-2023-001',
      name: 'Кухонный гарнитур "Модерн"',
      progress: 40,
      allowedToRun: true,
      completed: false,
    },
  });

  // УПАК 1-1: Корпусы шкафов
  const ypak1_1 = await prisma.productionYpak.create({
    data: {
      name: 'Корпусы шкафов',
      progress: 30,
      order: { connect: { id: order1.id } },
    },
  });

  // УПАК 1-2: Фасады
  const ypak1_2 = await prisma.productionYpak.create({
    data: {
      name: 'Фасады',
      progress: 50,
      order: { connect: { id: order1.id } },
    },
  });

  // Детали для заказа 1
  const detail1 = await prisma.productionDetail.create({
    data: {
      article: 'BOK-600',
      name: 'Боковина шкафа 600 мм',
      material: 'ЛДСП 16 мм белый',
      size: '600x720x16',
      totalNumber: 20,
      route: { connect: { id: standardRoute.id } },
    },
  });

  const detail2 = await prisma.productionDetail.create({
    data: {
      article: 'FASAD-450',
      name: 'Фасад 450 мм',
      material: 'МДФ 18 мм красный',
      size: '446x716x18',
      totalNumber: 10,
      route: { connect: { id: alternativeRoute.id } },
    },
  });

  // Связываем детали с УПАКами
  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak1_1.id } },
      detail: { connect: { id: detail1.id } },
      quantity: 20,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak1_2.id } },
      detail: { connect: { id: detail2.id } },
      quantity: 10,
    },
  });

  // Создаем поддоны для деталей
  const pallet1 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон BOK-600-1',
      quantity: 20,
      detail: { connect: { id: detail1.id } },
      currentStep: { connect: { id: processStepRaskroy.id } },
    },
  });

  const pallet2 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон FASAD-450-1',
      quantity: 10,
      detail: { connect: { id: detail2.id } },
      currentStep: { connect: { id: processStepRaskroy.id } },
    },
  });

  // ----- Заказ 2: Шкаф-купе -----
  const order2 = await prisma.productionOrder.create({
    data: {
      runNumber: 'ORD-2023-002',
      name: 'Шкаф-купе "Престиж"',
      progress: 60,
      allowedToRun: true,
      completed: false,
    },
  });

  // УПАК 2-1: Корпус шкафа-купе
  const ypak2_1 = await prisma.productionYpak.create({
    data: {
      name: 'Корпус шкафа-купе',
      progress: 70,
      order: { connect: { id: order2.id } },
    },
  });

  // УПАК 2-2: Двери шкафа-купе
  const ypak2_2 = await prisma.productionYpak.create({
    data: {
      name: 'Двери шкафа-купе',
      progress: 50,
      order: { connect: { id: order2.id } },
    },
  });

  // Детали для заказа 2
  const detail3 = await prisma.productionDetail.create({
    data: {
      article: 'SHK-BOK-2400',
      name: 'Боковина шкафа-купе 2400 мм',
      material: 'ЛДСП 18 мм венге',
      size: '2400x600x18',
      totalNumber: 4,
      route: { connect: { id: standardRoute.id } },
    },
  });

  const detail4 = await prisma.productionDetail.create({
    data: {
      article: 'SHK-DOOR-1200',
      name: 'Дверь шкафа-купе 1200 мм',
      material: 'ЛДСП 16 мм + зеркало',
      size: '1200x2350x16',
      totalNumber: 3,
      route: { connect: { id: alternativeRoute.id } },
    },
  });

  // Связываем детали с УПАКами
  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak2_1.id } },
      detail: { connect: { id: detail3.id } },
      quantity: 4,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak2_2.id } },
      detail: { connect: { id: detail4.id } },
      quantity: 3,
    },
  });

  // Создаем поддоны для деталей
  const pallet3 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон SHK-BOK-2400-1',
      quantity: 4,
      detail: { connect: { id: detail3.id } },
      currentStep: { connect: { id: processStepPokleyka.id } },
    },
  });

  const pallet4 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон SHK-DOOR-1200-1',
      quantity: 3,
      detail: { connect: { id: detail4.id } },
      currentStep: { connect: { id: processStepRaskroy.id } },
    },
  });

  // ----- Заказ 3: Офисная мебель -----
  const order3 = await prisma.productionOrder.create({
    data: {
      runNumber: 'ORD-2023-003',
      name: 'Офисная мебель "Бизнес"',
      progress: 20,
      allowedToRun: true,
      completed: false,
    },
  });

  // УПАК 3-1: Столы
  const ypak3_1 = await prisma.productionYpak.create({
    data: {
      name: 'Столы',
      progress: 30,
      order: { connect: { id: order3.id } },
    },
  });

  // УПАК 3-2: Тумбы
  const ypak3_2 = await prisma.productionYpak.create({
    data: {
      name: 'Тумбы',
      progress: 10,
      order: { connect: { id: order3.id } },
    },
  });

  // Детали для заказа 3
  const detail5 = await prisma.productionDetail.create({
    data: {
      article: 'STOL-TOP-1400',
      name: 'Столешница 1400 мм',
      material: 'ЛДСП 25 мм дуб сонома',
      size: '1400x700x25',
      totalNumber: 8,
      route: { connect: { id: standardRoute.id } },
    },
  });

  const detail6 = await prisma.productionDetail.create({
    data: {
      article: 'TUMB-BOK-450',
      name: 'Боковина тумбы 450 мм',
      material: 'ЛДСП 18 мм дуб сонома',
      size: '450x550x18',
      totalNumber: 12,
      route: { connect: { id: standardRoute.id } },
    },
  });

  // Связываем детали с УПАКами
  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak3_1.id } },
      detail: { connect: { id: detail5.id } },
      quantity: 8,
    },
  });

  await prisma.productionYpakDetail.create({
    data: {
      ypak: { connect: { id: ypak3_2.id } },
      detail: { connect: { id: detail6.id } },
      quantity: 12,
    },
  });

  // Создаем поддоны для деталей
  const pallet5 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон STOL-TOP-1400-1',
      quantity: 8,
      detail: { connect: { id: detail5.id } },
      currentStep: { connect: { id: processStepRaskroy.id } },
    },
  });

  const pallet6 = await prisma.productionPallets.create({
    data: {
      name: 'Поддон TUMB-BOK-450-1',
      quantity: 12,
      detail: { connect: { id: detail6.id } },
      currentStep: { connect: { id: processStepPrisadka.id } },
    },
  });

  // ======================================================
  // 9. Создаём статусы деталей для участков
  // ======================================================

  // Статусы для участка раскроя
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail1.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail2.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail3.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail4.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail5.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail6.id } },
      segment: { connect: { id: raskroySegment.id } },
      isCompleted: false,
    },
  });

  // Статусы для участка поклейки
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail1.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail2.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail3.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail4.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail5.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail6.id } },
      segment: { connect: { id: pokleykaSegment.id } },
      isCompleted: false,
    },
  });

  // Статусы для участка присадки
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail1.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail2.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail3.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail4.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail5.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });
  await prisma.detailSegmentStatus.create({
    data: {
      detail: { connect: { id: detail6.id } },
      segment: { connect: { id: prisadkaSegment.id } },
      isCompleted: false,
    },
  });

  console.log('Сидирование базы данных завершено успешно.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
