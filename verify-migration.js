const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('=== ПРОВЕРКА МИГРАЦИИ ===\n');
    
    // 1. Проверяем подключение и базу данных
    const dbInfo = await prisma.$queryRaw`SELECT current_database() as db`;
    console.log(`📊 Подключено к базе: ${dbInfo[0].db}`);
    console.log(`📝 DATABASE_URL из .env: ${process.env.DATABASE_URL}\n`);
    
    // 2. Проверяем существование таблицы
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'packing_task_operators'
      ) as exists
    `;
    
    const tableExists = tableCheck[0].exists;
    console.log(`🔍 Таблица packing_task_operators: ${tableExists ? '✅ СУЩЕСТВУЕТ' : '❌ НЕ СУЩЕСТВУЕТ'}\n`);
    
    if (tableExists) {
      // 3. Проверяем структуру таблицы
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'packing_task_operators'
        ORDER BY ordinal_position
      `;
      
      console.log('📋 Структура таблицы:');
      columns.forEach(col => {
        console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // 4. Проверяем индексы
      const indexes = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'packing_task_operators'
      `;
      
      console.log('\n🔑 Индексы:');
      indexes.forEach(idx => {
        console.log(`   ${idx.indexname}`);
      });
      
      // 5. Проверяем foreign keys
      const fkeys = await prisma.$queryRaw`
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
          AND tc.table_name = 'packing_task_operators'
      `;
      
      console.log('\n🔗 Foreign Keys:');
      fkeys.forEach(fk => {
        console.log(`   ${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
      
      // 6. Проверяем количество записей
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM packing_task_operators`;
      console.log(`\n📊 Количество записей: ${count[0].count}`);
      
      // 7. Проверяем связь с PackingTask
      const packingTaskCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'packing_tasks'
        ) as exists
      `;
      console.log(`\n✅ Таблица packing_tasks: ${packingTaskCheck[0].exists ? 'существует' : 'НЕ существует'}`);
      
    } else {
      console.log('⚠️  Таблица не найдена. Создаю...\n');
      
      const fs = require('fs');
      const migrationSQL = fs.readFileSync('./prisma/migrations/add_packing_task_operators.sql', 'utf8');
      
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        console.log(`Выполняю: ${command.substring(0, 60)}...`);
        await prisma.$executeRawUnsafe(command);
      }
      
      console.log('\n✅ Миграция применена успешно!');
      console.log('🔄 Запустите скрипт еще раз для проверки.');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
