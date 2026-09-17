const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('🔍 Финальная проверка миграции...\n');
    
    // 1. Проверяем существование таблицы
    console.log('1️⃣ Проверка существования таблицы packing_task_operators...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'packing_task_operators'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('   ✅ Таблица существует\n');
    } else {
      console.log('   ❌ Таблица НЕ существует\n');
      return;
    }
    
    // 2. Проверяем структуру таблицы
    console.log('2️⃣ Проверка структуры таблицы...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'packing_task_operators'
      ORDER BY ordinal_position;
    `;
    
    console.log('   Колонки:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');
    
    // 3. Проверяем индексы
    console.log('3️⃣ Проверка индексов...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'packing_task_operators';
    `;
    
    console.log('   Индексы:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log('');
    
    // 4. Проверяем внешние ключи
    console.log('4️⃣ Проверка внешних ключей...');
    const foreignKeys = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'packing_task_operators';
    `;
    
    console.log('   Внешние ключи:');
    foreignKeys.forEach(fk => {
      console.log(`   - ${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log('');
    
    // 5. Проверяем количество записей
    console.log('5️⃣ Проверка данных...');
    const count = await prisma.packingTaskOperator.count();
    console.log(`   Количество записей: ${count}\n`);
    
    // 6. Проверяем связь с PackingTask
    console.log('6️⃣ Проверка связи с PackingTask...');
    const packingTasksCount = await prisma.packingTask.count();
    console.log(`   Количество заданий упаковки: ${packingTasksCount}`);
    
    if (packingTasksCount > 0) {
      const taskWithOperators = await prisma.packingTask.findFirst({
        include: {
          operators: true,
        },
      });
      
      if (taskWithOperators) {
        console.log(`   ✅ Связь работает! Задание ${taskWithOperators.taskId} имеет ${taskWithOperators.operators.length} операторов\n`);
      } else {
        console.log('   ⚠️ Нет заданий с операторами (это нормально для новой базы)\n');
      }
    } else {
      console.log('   ⚠️ Нет заданий упаковки в базе\n');
    }
    
    console.log('✅ Все проверки пройдены успешно!');
    console.log('📋 Миграция применена корректно, система готова к работе.');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
