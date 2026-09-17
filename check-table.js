const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    console.log('Проверка таблицы packing_task_operators...');
    
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'packing_task_operators'
    `;
    
    if (result.length > 0) {
      console.log('✅ Таблица packing_task_operators существует');
      
      // Проверяем структуру
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'packing_task_operators'
        ORDER BY ordinal_position
      `;
      
      console.log('\nСтруктура таблицы:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Проверяем количество записей
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM packing_task_operators
      `;
      console.log(`\nКоличество записей: ${count[0].count}`);
      
    } else {
      console.log('❌ Таблица packing_task_operators НЕ существует');
      console.log('\nПопытка создать таблицу заново...');
      
      // Читаем и выполняем миграцию
      const fs = require('fs');
      const migrationSQL = fs.readFileSync('./prisma/migrations/add_packing_task_operators.sql', 'utf8');
      
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        await prisma.$executeRawUnsafe(command);
      }
      
      console.log('✅ Таблица создана успешно!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
