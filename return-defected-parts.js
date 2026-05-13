const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function returnDefectedParts() {
  const partId = 2148;
  const quantity = 144;
  const returnToStageId = 3; // Присадка
  const userId = 5; // Brigadir3

  console.log('=== ВОЗВРАТ ОТБРАКОВАННЫХ ДЕТАЛЕЙ ===\n');
  console.log(`Деталь: ${partId}`);
  console.log(`Количество: ${quantity}`);
  console.log(`Этап возврата: ${returnToStageId} (Присадка)`);
  console.log(`Пользователь: ${userId}\n`);

  // 1. Создаем новый поддон для возвращенных деталей
  const newPallet = await prisma.pallet.create({
    data: {
      partId,
      palletName: `Поддон-возврат-${Date.now()}`,
      quantity,
      isActive: true,
    },
  });

  console.log(`✓ Создан новый поддон: ${newPallet.palletId} (${newPallet.palletName})`);

  // 2. Находим routeStageId для этапа Присадка
  const part = await prisma.part.findUnique({
    where: { partId },
    include: { route: true },
  });

  const routeStage = await prisma.routeStage.findFirst({
    where: {
      routeId: part.routeId,
      stageId: returnToStageId,
    },
  });

  if (!routeStage) {
    throw new Error(`Этап ${returnToStageId} не найден в маршруте детали`);
  }

  console.log(`✓ Найден этап маршрута: ${routeStage.routeStageId}`);

  // 3. Создаем запись о возврате в inventory_movement
  const inventoryMovement = await prisma.inventoryMovement.create({
    data: {
      partId,
      palletId: newPallet.palletId,
      deltaQuantity: quantity,
      reason: 'RETURN_FROM_RECLAMATION',
      returnToStageId: routeStage.routeStageId,
      userId,
    },
  });

  console.log(`✓ Создана запись о возврате: ${inventoryMovement.movementId}`);

  // 4. Проверяем результат
  const defects = await prisma.reclamation.aggregate({
    where: { partId },
    _sum: { quantity: true },
  });

  const returned = await prisma.inventoryMovement.aggregate({
    where: {
      partId,
      reason: 'RETURN_FROM_RECLAMATION',
      deltaQuantity: { gt: 0 },
    },
    _sum: { deltaQuantity: true },
  });

  const pallets = await prisma.pallet.findMany({
    where: { partId, isActive: true },
  });

  const allocated = pallets.reduce((sum, p) => sum + Number(p.quantity), 0);
  const activeDefects = Number(defects._sum.quantity || 0) - Number(returned._sum.deltaQuantity || 0);
  const unallocated = Number(part.totalQuantity) - allocated - activeDefects;

  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(`Всего отбраковано: ${defects._sum.quantity || 0}`);
  console.log(`Возвращено: ${returned._sum.deltaQuantity || 0}`);
  console.log(`Активных отбраковок: ${activeDefects}`);
  console.log(`На поддонах: ${allocated}`);
  console.log(`Нераспределено: ${unallocated}`);
  console.log('\n✓ Детали успешно возвращены на производство!');
  console.log(`Новый поддон ${newPallet.palletId} готов к обработке на этапе Присадка`);

  await prisma.$disconnect();
}

returnDefectedParts().catch((error) => {
  console.error('Ошибка:', error.message);
  process.exit(1);
});
