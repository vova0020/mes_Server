"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../node_modules/@prisma/client");
const prisma = new client_1.PrismaClient();
async function updatePartFields() {
    console.log('Начинаем обновление полей в таблице Part...');
    const partsToUpdate = await prisma.part.findMany({
        where: {
            OR: [
                { thickness: null },
                { thicknessWithEdging: null },
                { finishedLength: null },
                { finishedWidth: null },
                { groove: null },
                { edgingNameL1: null },
                { edgingNameL2: null },
                { edgingNameW1: null },
                { edgingNameW2: null }
            ]
        },
        select: {
            partId: true,
            partCode: true
        }
    });
    console.log(`Найдено ${partsToUpdate.length} деталей для обновления`);
    let updatedCount = 0;
    for (const part of partsToUpdate) {
        const detailInfo = await prisma.detailDirectory.findUnique({
            where: { partSku: part.partCode }
        });
        if (detailInfo) {
            await prisma.part.update({
                where: { partId: part.partId },
                data: {
                    thickness: detailInfo.thickness,
                    thicknessWithEdging: detailInfo.thicknessWithEdging,
                    finishedLength: detailInfo.finishedLength,
                    finishedWidth: detailInfo.finishedWidth,
                    groove: detailInfo.groove,
                    edgingNameL1: detailInfo.edgingNameL1,
                    edgingNameL2: detailInfo.edgingNameL2,
                    edgingNameW1: detailInfo.edgingNameW1,
                    edgingNameW2: detailInfo.edgingNameW2
                }
            });
            updatedCount++;
        }
    }
    console.log(`Обновлено ${updatedCount} записей в таблице Part`);
}
async function updatePackageCompositionFields() {
    console.log('Начинаем обновление полей в таблице PackageComposition...');
    const compositionsToUpdate = await prisma.packageComposition.findMany({
        where: {
            OR: [
                { thickness: null },
                { thicknessWithEdging: null },
                { finishedLength: null },
                { finishedWidth: null },
                { groove: null },
                { edgingNameL1: null },
                { edgingNameL2: null },
                { edgingNameW1: null },
                { edgingNameW2: null }
            ]
        },
        select: {
            compositionId: true,
            partCode: true
        }
    });
    console.log(`Найдено ${compositionsToUpdate.length} записей состава для обновления`);
    let updatedCount = 0;
    for (const composition of compositionsToUpdate) {
        const detailInfo = await prisma.detailDirectory.findUnique({
            where: { partSku: composition.partCode }
        });
        if (detailInfo) {
            await prisma.packageComposition.update({
                where: { compositionId: composition.compositionId },
                data: {
                    thickness: detailInfo.thickness,
                    thicknessWithEdging: detailInfo.thicknessWithEdging,
                    finishedLength: detailInfo.finishedLength,
                    finishedWidth: detailInfo.finishedWidth,
                    groove: detailInfo.groove,
                    edgingNameL1: detailInfo.edgingNameL1,
                    edgingNameL2: detailInfo.edgingNameL2,
                    edgingNameW1: detailInfo.edgingNameW1,
                    edgingNameW2: detailInfo.edgingNameW2
                }
            });
            updatedCount++;
        }
    }
    console.log(`Обновлено ${updatedCount} записей в таблице PackageComposition`);
}
async function main() {
    try {
        await updatePartFields();
        await updatePackageCompositionFields();
        console.log('Обновление завершено успешно!');
    }
    catch (error) {
        console.error('Ошибка при обновлении:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=update-part-fields.js.map