const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTable() {
  try {
    console.log('Создание таблицы packing_task_operators...\n');
    
    // Создаем таблицу одним запросом
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "packing_task_operators" (
        "id" SERIAL NOT NULL,
        "task_id" INTEGER NOT NULL,
        "user_id" INTEGER NOT NULL,
        "operator_number" INTEGER NOT NULL,
        "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "packing_task_operators_pkey" PRIMARY KEY ("id")
      )
    `;
    console.log('✅ Таблица создана');
    
    // Создаем уникальный индекс
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "packing_task_operators_task_id_user_id_key" 
      ON "packing_task_operators"("task_id", "user_id")
    `;
    console.log('✅ Уникальный индекс создан');
    
    // Создаем индекс на task_id
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "packing_task_operators_task_id_idx" 
      ON "packing_task_operators"("task_id")
    `;
    console.log('✅ Индекс task_id создан');
    
    // Создаем индекс на user_id
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "packing_task_operators_user_id_idx" 
      ON "packing_task_operators"("user_id")
    `;
    console.log('✅ Индекс user_id создан');
    
    // Добавляем FK на task_id
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'packing_task_operators_task_id_fkey'
        ) THEN
          ALTER TABLE "packing_task_operators" 
          ADD CONSTRAINT "packing_task_operators_task_id_fkey" 
          FOREIGN KEY ("task_id") REFERENCES "packing_tasks"("task_id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `;
    console.log('✅ Foreign key task_id создан');
    
    // Добавляем FK на user_id
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'packing_task_operators_user_id_fkey'
        ) THEN
          ALTER TABLE "packing_task_operators" 
          ADD CONSTRAINT "packing_task_operators_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "users"("user_id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `;
    console.log('✅ Foreign key user_id создан');
    
    // Проверяем результат
    const check = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'packing_task_operators'
      ) as exists
    `;
    
    console.log(`\n🔍 Проверка: таблица ${check[0].exists ? '✅ СУЩЕСТВУЕТ' : '❌ НЕ СУЩЕСТВУЕТ'}`);
    
    if (check[0].exists) {
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM packing_task_operators`;
      console.log(`📊 Количество записей: ${count[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.code) {
      console.error('Код ошибки:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTable();
