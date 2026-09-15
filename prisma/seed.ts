// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function seed() {
//   console.log('Создание заказов с полной структурой...');

//   // Создание нескольких заказов
//   for (let orderNum = 1; orderNum <= 3; orderNum++) {
//     const order = await prisma.order.create({
//       data: {
//         batchNumber: `BATCH00${orderNum}`,
//         orderName: `Заказ производства №${orderNum}`,
//         completionPercentage: 0,
//         launchPermission: true,
//         isCompleted: false,
//       },
//     });

//     console.log(`Создан заказ: ${order.orderName}`);

//     // Создание 3 упаковок для каждого заказа
//     for (let pkgNum = 1; pkgNum <= 3; pkgNum++) {
//       const packageItem = await prisma.package.create({
//         data: {
//           orderId: order.orderId,
//           packageCode: `PKG${orderNum}${pkgNum.toString().padStart(2, '0')}`,
//           packageName: `Упаковка ${pkgNum} заказа ${orderNum}`,
//           completionPercentage: 0,
//           quantity: 10,
//         },
//       });

//       console.log(`  Создана упаковка: ${packageItem.packageName}`);

//       // Создание 3 деталей для каждой упаковки
//       for (let partNum = 1; partNum <= 3; partNum++) {
//         const partCode = `PART${orderNum}${pkgNum}${partNum}`;
//         const totalQuantity = 20; // Общее количество деталей

//         const part = await prisma.part.create({
//           data: {
//             partCode: partCode,
//             partName: `Деталь ${partNum} упаковки ${pkgNum} заказа ${orderNum}`,
//             size: `${400 + partNum * 50}x${200 + partNum * 30}x${15 + partNum * 2}`,
//             totalQuantity: totalQuantity,
//             status: 'PENDING',
//             isSubassembly: false,
//             route: { connect: { routeId: 1 } },
//             material: { connect: { materialId: 1 } },
//             readyForMainFlow: false,
//           },
//         });

//         console.log(`    Создана деталь: ${part.partName} (количество: ${totalQuantity})`);

//         // Связывание детали с упаковкой
//         await prisma.productionPackagePart.create({
//           data: {
//             packageId: packageItem.packageId,
//             partId: part.partId,
//             quantity: totalQuantity,
//           },
//         });

//         // Создание 4 поддонов для каждой детали с равномерным распределением количества
//         const quantityPerPallet = totalQuantity / 4; // 5 штук на поддон

//         for (let palletNum = 1; palletNum <= 4; palletNum++) {
//           await prisma.pallet.create({
//             data: {
//               partId: part.partId,
//               palletName: `Поддон ${palletNum} для ${part.partName}`,
//               quantity: quantityPerPallet,
//             },
//           });

//           console.log(`      Создан поддон ${palletNum} (количество: ${quantityPerPallet})`);
//         }
//       }
//     }

//     console.log(`Заказ ${orderNum} полностью создан\n`);
//   }

//   console.log('✅ Все данные успешно добавлены в базу!');
//   console.log('📊 Создано:');
//   console.log('   - 3 заказа');
//   console.log('   - 9 упаковок (3 на заказ)');
//   console.log('   - 27 деталей (3 на упаковку)');
//   console.log('   - 108 поддонов (4 на деталь)');
// }

// seed()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });





  
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Создаем администратора...');

  // Создаем роль администратора
  const adminRole = await prisma.role.create({
    data: {
      roleName: 'admin',
    },
  });
  const masterRole = await prisma.role.create({
    data: {
      roleName: 'master',
    },
  });
  const managementRole = await prisma.role.create({
    data: {
      roleName: 'management',
    },
  });
  const technologistRole = await prisma.role.create({
    data: {
      roleName: 'technologist',
    },
  });
  const orderPickerRole = await prisma.role.create({
    data: {
      roleName: 'orderPicker',
    },
  });
  const workplaceRole = await prisma.role.create({
    data: {
      roleName: 'workplace',
    },
  });
  const operatorRole = await prisma.role.create({
    data: {
      roleName: 'operator',
    },
  });

  // Хешируем пароль
  const hashedPassword = await bcrypt.hash('12345', 10);

  // Создаем администратора
  const adminUser = await prisma.user.create({
    data: {
      login: 'admin',
      password: hashedPassword,
      userDetail: {
        create: {
          firstName: 'Администратор',
          lastName: 'Системы',
          phone: '+7 (900) 123-45-67',
          position: 'Системный администратор',
          salary: 100000,
        },
      },
    },
  });

  // Назначаем роль администратора
  await prisma.userRole.create({
    data: {
      userId: adminUser.userId,
      roleId: adminRole.roleId,
    },
  });

  console.log('✅ Администратор создан успешно!');
  console.log('');
  console.log('🔑 Данные для входа:');
  console.log('   Логин: admin');
  console.log('   Пароль: 12345');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при создании администратора:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
