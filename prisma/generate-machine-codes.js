"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function generateMachineCode(existingCodes) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code;
    let attempts = 0;
    const maxAttempts = 10000;
    do {
        const letter = letters[Math.floor(Math.random() * letters.length)];
        const numbers = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        code = `${letter}${numbers}`;
        attempts++;
        if (attempts >= maxAttempts) {
            throw new Error('Не удалось сгенерировать уникальный код после максимального количества попыток');
        }
    } while (existingCodes.has(code));
    return code;
}
async function generateMachineCodes() {
    console.log('🚀 Начало генерации кодов станков...');
    try {
        const machines = await prisma.machine.findMany({
            select: {
                machineId: true,
                machineName: true,
                machineCode: true,
            },
        });
        console.log(`📊 Найдено станков: ${machines.length}`);
        const existingCodes = new Set();
        machines.forEach((machine) => {
            if (machine.machineCode) {
                existingCodes.add(machine.machineCode);
            }
        });
        console.log(`📋 Существующих кодов: ${existingCodes.size}`);
        const machinesWithoutCodes = machines.filter((m) => !m.machineCode);
        console.log(`🔧 Станков без кодов: ${machinesWithoutCodes.length}`);
        if (machinesWithoutCodes.length === 0) {
            console.log('✅ Все станки уже имеют коды!');
            return;
        }
        let generatedCount = 0;
        for (const machine of machinesWithoutCodes) {
            const newCode = generateMachineCode(existingCodes);
            existingCodes.add(newCode);
            await prisma.machine.update({
                where: { machineId: machine.machineId },
                data: { machineCode: newCode },
            });
            generatedCount++;
            console.log(`✅ Станок "${machine.machineName}" (ID: ${machine.machineId}) получил код: ${newCode}`);
        }
        console.log(`\n🎉 Успешно сгенерировано кодов: ${generatedCount}`);
        console.log('✅ Генерация кодов завершена!');
    }
    catch (error) {
        console.error('❌ Ошибка при генерации кодов:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
generateMachineCodes()
    .then(() => {
    console.log('✅ Скрипт выполнен успешно');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
});
//# sourceMappingURL=generate-machine-codes.js.map