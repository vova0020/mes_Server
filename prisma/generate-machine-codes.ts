import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Генерирует уникальный код станка в формате: буква + 3 цифры (например, H431)
 * @param existingCodes - массив уже существующих кодов
 * @returns новый уникальный код
 */
function generateMachineCode(existingCodes: Set<string>): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code: string;
  let attempts = 0;
  const maxAttempts = 10000;

  do {
    // Генерируем случайную букву
    const letter = letters[Math.floor(Math.random() * letters.length)];
    // Генерируем 3 случайные цифры (от 000 до 999)
    const numbers = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    code = `${letter}${numbers}`;
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error(
        'Не удалось сгенерировать уникальный код после максимального количества попыток',
      );
    }
  } while (existingCodes.has(code));

  return code;
}

/**
 * Скрипт для генерации кодов станков
 * Генерирует уникальные коды для всех станков, у которых их еще нет
 */
async function generateMachineCodes() {
  console.log('🚀 Начало генерации кодов станков...');

  try {
    // Получаем все станки
    const machines = await prisma.machine.findMany({
      select: {
        machineId: true,
        machineName: true,
        machineCode: true,
      },
    });

    console.log(`📊 Найдено станков: ${machines.length}`);

    // Собираем существующие коды
    const existingCodes = new Set<string>();
    machines.forEach((machine) => {
      if (machine.machineCode) {
        existingCodes.add(machine.machineCode);
      }
    });

    console.log(`📋 Существующих кодов: ${existingCodes.size}`);

    // Генерируем коды для станков без кодов
    const machinesWithoutCodes = machines.filter((m) => !m.machineCode);
    console.log(`🔧 Станков без кодов: ${machinesWithoutCodes.length}`);

    if (machinesWithoutCodes.length === 0) {
      console.log('✅ Все станки уже имеют коды!');
      return;
    }

    let generatedCount = 0;

    for (const machine of machinesWithoutCodes) {
      const newCode = generateMachineCode(existingCodes);
      existingCodes.add(newCode); // Добавляем в набор, чтобы избежать дубликатов

      await prisma.machine.update({
        where: { machineId: machine.machineId },
        data: { machineCode: newCode },
      });

      generatedCount++;
      console.log(
        `✅ Станок "${machine.machineName}" (ID: ${machine.machineId}) получил код: ${newCode}`,
      );
    }

    console.log(`\n🎉 Успешно сгенерировано кодов: ${generatedCount}`);
    console.log('✅ Генерация кодов завершена!');
  } catch (error) {
    console.error('❌ Ошибка при генерации кодов:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
generateMachineCodes()
  .then(() => {
    console.log('✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });
