// Используем Prisma Client из корневой директории проекта
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

async function migrateEdgingData() {
  console.log('Начало миграции данных облицовки кромок...');

  try {
    // Получаем все детали с их связями
    const parts = await prisma.part.findMany({
      include: {
        productionPackageParts: {
          include: {
            package: {
              include: {
                composition: true,
              },
            },
          },
        },
      },
    });

    let updatedCount = 0;

    for (const part of parts) {
      // Ищем соответствующую запись в composition
      const composition = part.productionPackageParts[0]?.package.composition.find(
        (comp) =>
          comp.partCode === part.partCode && comp.routeId === part.routeId,
      );

      if (composition) {
        // Обновляем только если есть данные для обновления
        const needsUpdate =
          !part.edgingNameL1 ||
          !part.edgingNameL2 ||
          !part.edgingNameW1 ||
          !part.edgingNameW2;

        if (needsUpdate) {
          await prisma.part.update({
            where: { partId: part.partId },
            data: {
              edgingNameL1: composition.edgingNameL1 || part.edgingNameL1,
              edgingNameL2: composition.edgingNameL2 || part.edgingNameL2,
              edgingNameW1: composition.edgingNameW1 || part.edgingNameW1,
              edgingNameW2: composition.edgingNameW2 || part.edgingNameW2,
            },
          });
          updatedCount++;
          console.log(`Обновлена деталь ${part.partCode} (ID: ${part.partId})`);
        }
      }
    }

    console.log(`\nМиграция завершена успешно!`);
    console.log(`Обновлено деталей: ${updatedCount} из ${parts.length}`);
  } catch (error) {
    console.error('Ошибка при миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateEdgingData();
