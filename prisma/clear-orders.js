const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearOrders() {
  try {
    console.log('Начинаю очистку данных заказов...');

    // Удаляем в правильном порядке из-за внешних ключей
    await prisma.palletPackageAssignment.deleteMany({});
    console.log('✓ Удалены назначения поддонов на упаковки');

    await prisma.packingTask.deleteMany({});
    console.log('✓ Удалены задачи упаковки');

    await prisma.packageComposition.deleteMany({});
    console.log('✓ Удален состав упаковок');

    await prisma.productionPackagePart.deleteMany({});
    console.log('✓ Удалены связи упаковок с деталями');

    await prisma.package.deleteMany({});
    console.log('✓ Удалены упаковки');

    await prisma.order.deleteMany({});
    console.log('✓ Удалены заказы');

    console.log('Очистка завершена успешно!');
  } catch (error) {
    console.error('Ошибка при очистке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearOrders();