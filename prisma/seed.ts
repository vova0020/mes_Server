import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Создание заказа
  const order = await prisma.order.create({
    data: {
      batchNumber: 'BATCH001',
      orderName: 'Набор мебели A',
      completionPercentage: 0,
      launchPermission: true,
      isCompleted: false,
    },
  });

  // Создание упаковок для заказа
  const package1 = await prisma.package.create({
    data: {
      orderId: order.orderId,
      packageCode: 'PKG001',
      packageName: 'Блок ящиков',
      completionPercentage: 0,
    },
  });

  const package2 = await prisma.package.create({
    data: {
      orderId: order.orderId,
      packageCode: 'PKG002',
      packageName: 'Блок шкафа',
      completionPercentage: 0,
    },
  });

  // Создание деталей с привязкой к маршруту ID 8
  const part1 = await prisma.part.create({
    data: {
      partCode: 'PART001',
      partName: 'Фронт ящика',
      size: '500x300x18',
      totalQuantity: 10,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  const part2 = await prisma.part.create({
    data: {
      partCode: 'PART002',
      partName: 'Боковина ящика',
      size: '400x100x18',
      totalQuantity: 20,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  const part3 = await prisma.part.create({
    data: {
      partCode: 'PART003',
      partName: 'Дно ящика',

      size: '480x280x5',
      totalQuantity: 10,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  const part4 = await prisma.part.create({
    data: {
      partCode: 'PART004',
      partName: 'Дверь шкафа',

      size: '600x400x18',
      totalQuantity: 5,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  const part5 = await prisma.part.create({
    data: {
      partCode: 'PART005',
      partName: 'Полка шкафа',

      size: '580x380x18',
      totalQuantity: 10,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  const part6 = await prisma.part.create({
    data: {
      partCode: 'PART006',
      partName: 'Задняя стенка шкафа',
      size: '600x400x5',
      totalQuantity: 5,
      status: 'PENDING',
      isSubassembly: false,
      route: { connect: { routeId: 8 } },
      material: { connect: { materialId: 2 } },
      readyForMainFlow: false,
    },
  });

  // Связывание деталей с упаковками
  await prisma.productionPackagePart.createMany({
    data: [
      { packageId: package1.packageId, partId: part1.partId, quantity: 10 },
      { packageId: package1.packageId, partId: part2.partId, quantity: 20 },
      { packageId: package1.packageId, partId: part3.partId, quantity: 10 },
      { packageId: package2.packageId, partId: part4.partId, quantity: 5 },
      { packageId: package2.packageId, partId: part5.partId, quantity: 10 },
      { packageId: package2.packageId, partId: part6.partId, quantity: 5 },
    ],
  });

  // Создание поддонов для деталей
  await prisma.pallet.createMany({
    data: [
      { partId: part1.partId, palletName: 'Поддон для фронта ящика' },
      { partId: part2.partId, palletName: 'Поддон для боковины ящика' },
      { partId: part3.partId, palletName: 'Поддон для дна ящика' },
      { partId: part4.partId, palletName: 'Поддон для двери шкафа' },
      { partId: part5.partId, palletName: 'Поддон для полки шкафа' },
      { partId: part6.partId, palletName: 'Поддон для задней стенки шкафа' },
    ],
  });

  console.log('Данные успешно добавлены в базу');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





  
// import { PrismaClient } from '@prisma/client';
// import * as bcrypt from 'bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('Создаем администратора...');

//   // Создаем роль администратора
//   const adminRole = await prisma.role.create({
//     data: {
//       roleName: 'Administrator',
//     },
//   });

//   // Хешируем пароль
//   const hashedPassword = await bcrypt.hash('12345', 10);

//   // Создаем администратора
//   const adminUser = await prisma.user.create({
//     data: {
//       login: 'admin',
//       password: hashedPassword,
//       userDetail: {
//         create: {
//           firstName: 'Администратор',
//           lastName: 'Системы',
//           phone: '+7 (900) 123-45-67',
//           position: 'Системный администратор',
//           salary: 100000,
//         },
//       },
//     },
//   });

//   // Назначаем роль администратора
//   await prisma.userRole.create({
//     data: {
//       userId: adminUser.userId,
//       roleId: adminRole.roleId,
//     },
//   });

//   console.log('✅ Администратор создан успешно!');
//   console.log('');
//   console.log('🔑 Данные для входа:');
//   console.log('   Логин: admin');
//   console.log('   Пароль: 12345');
// }

// main()
//   .catch((e) => {
//     console.error('❌ Ошибка при создании администратора:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
