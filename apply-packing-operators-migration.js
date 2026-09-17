const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Применение миграции add_packing_task_operators...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'prisma/migrations/add_packing_task_operators.sql'),
      'utf8'
    );

    // Разбиваем SQL на отдельные команды
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    // Выполняем каждую команду отдельно
    for (const command of commands) {
      console.log(`Выполнение: ${command.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(command);
    }
    
    console.log('✅ Миграция успешно применена!');
    console.log('Создана таблица packing_task_operators');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
