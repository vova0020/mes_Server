const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Параметры из командной строки
const args = process.argv.slice(2);
const partId = parseInt(args[0]);
const quantity = parseInt(args[1]);
const returnToStageId = parseInt(args[2]);
const userId = parseInt(args[3]);

if (!partId || !quantity || !returnToStageId || !userId) {
  console.error('Использование: node return-parts.js <partId> <quantity> <returnToStageId> <userId>');
  console.error('Пример: node return-parts.js 2148 144 3 5');
  process.exit(1);
}

async function returnDefectedParts() {
  console.log('=== ВОЗВРАТ ОТБРАКОВАННЫХ ДЕТАЛЕЙ ===\n');
  console.log(`Деталь: ${partId}`);
  console.log(`Количество: ${quantity}`);
  console.log(`Этап возврата: ${returnToStageId}`);
  console.log(`Пользователь: ${userId}\n`);

  // 1. Проверяем деталь
  const part = await prisma.part.findUnique({
    where: { partId },
    include: { route: true },
  });

  if (!part) {
    throw new Error(`Деталь с ID ${partId} не найдена`);
  }

  // 2. Подсчитываем отбракованные детали
  const defects = await prisma.reclamation.aggregate({
    where: { partId },
    _sum: { quantity: true },
  });

  const totalDefected = Number(defects._sum.quantity || 0);

  // 3. Подсчитываем уже возвращенные детали
  const returned = await prisma.inventoryMovement.aggregate({
    where: {
      partId,
      reason: 'RETURN_FROM_RECLAMATION',
      deltaQuantity: { gt: 0 },
    },
    _sum: { deltaQuantity: true },
  });

  const totalReturned = Number(returned._sum.deltaQuantity || 0);
  const availableToReturn = totalDefected - totalReturned;

  console.log('=== ПРОВЕРКА ===');
  console.log(`Всего отбраковано: ${totalDefected}`);
  console.log(`Уже возвращено: ${totalReturned}`);
  console.log(`Доступно для возврата: ${availableToReturn}\n`);

  // 4. Проверяем, можно ли вернуть запрошенное количество
  if (availableToReturn === 0) {
    console.log('❌ Нет отбракованных деталей для возврата!');
    await prisma.$disconnect();
    return;
  }

  if (quantity > availableToReturn) {
    throw new Error(
      `Нельзя вернуть ${quantity} деталей. Доступно только ${availableToReturn} ` +
      `(отбраковано: ${totalDefected}, уже возвращено: ${totalReturned})`
    );
  }

  // 5. Создаем новый поддон
  const newPallet = await prisma.pallet.create({
    data: {
      partId,
      palletName: `Поддон-возврат-${Date.now()}`,
      quantity,
      isActive: true,
    },
  });

  console.log(`✓ Создан поддон: ${newPallet.palletId} (${newPallet.palletName})`);

  // 6. Находим routeStageId
  const routeStage = await prisma.routeStage.findFirst({
    where: {
      routeId: part.routeId,
      stageId: returnToStageId,
    },
    include: { stage: true },
  });

  if (!routeStage) {
    throw new Error(`Этап ${returnToStageId} не найден в маршруте детали`);
  }

  console.log(`✓ Этап: ${routeStage.stage.stageName} (routeStageId: ${routeStage.routeStageId})`);

  // 7. Создаем запись о возврате
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

  console.log(`✓ Запись о возврате: ${inventoryMovement.movementId}`);

  // 8. Итоговая статистика
  const pallets = await prisma.pallet.findMany({
    where: { partId, isActive: true },
  });

  const allocated = pallets.reduce((sum, p) => sum + Number(p.quantity), 0);
  const newTotalReturned = totalReturned + quantity;
  const remainingDefects = totalDefected - newTotalReturned;
  const unallocated = Number(part.totalQuantity) - allocated - remainingDefects;

  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(`Всего отбраковано: ${totalDefected}`);
  console.log(`Возвращено: ${newTotalReturned}`);
  console.log(`Осталось отбраковано: ${remainingDefects}`);
  console.log(`На поддонах: ${allocated}`);
  console.log(`Нераспределено: ${unallocated}`);
  console.log(`\n✓ Поддон ${newPallet.palletId} готов к обработке!`);

  await prisma.$disconnect();
}

returnDefectedParts().catch((error) => {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
});
