"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function migrateHistoricalData() {
    console.log('Начинаем миграцию исторических данных...');
    const assignments = await prisma.machineAssignment.findMany({
        where: {
            completedAt: { not: null },
        },
        include: {
            pallet: {
                include: {
                    part: {
                        select: {
                            partId: true,
                            routeId: true,
                        },
                    },
                },
            },
        },
    });
    console.log(`Найдено ${assignments.length} завершённых назначений`);
    let created = 0;
    let skipped = 0;
    let processed = 0;
    for (const assignment of assignments) {
        processed++;
        if (processed % 100 === 0) {
            console.log(`Обработано: ${processed}/${assignments.length} (${Math.round(processed / assignments.length * 100)}%)`);
        }
        if (!assignment.pallet?.part) {
            skipped++;
            continue;
        }
        const activeProgress = await prisma.palletStageProgress.findFirst({
            where: {
                palletId: assignment.palletId,
                completedAt: { not: null },
            },
            orderBy: {
                completedAt: 'desc',
            },
        });
        if (!activeProgress) {
            skipped++;
            continue;
        }
        const existing = await prisma.machineOperationHistory.findFirst({
            where: {
                machineId: assignment.machineId,
                palletId: assignment.palletId,
                routeStageId: activeProgress.routeStageId,
                completedAt: assignment.completedAt,
            },
        });
        if (existing) {
            skipped++;
            continue;
        }
        const startedAt = assignment.assignedAt;
        const completedAt = assignment.completedAt;
        const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
        await prisma.machineOperationHistory.create({
            data: {
                machineId: assignment.machineId,
                palletId: assignment.palletId,
                partId: assignment.pallet.part.partId,
                routeStageId: activeProgress.routeStageId,
                quantityProcessed: assignment.processedQuantity?.toNumber() || assignment.pallet.quantity.toNumber(),
                startedAt,
                completedAt,
                duration,
                operatorId: null,
            },
        });
        created++;
    }
    console.log(`Миграция завершена. Создано записей: ${created}, пропущено: ${skipped}`);
    await prisma.$disconnect();
}
migrateHistoricalData()
    .catch((e) => {
    console.error('Ошибка при миграции:', e);
    process.exit(1);
});
//# sourceMappingURL=migrate-machine-operations.js.map