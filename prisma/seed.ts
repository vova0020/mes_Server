
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Создаем администратора...');

  // Создаем роль администратора
  const adminRole = await prisma.role.create({
    data: {
      roleName: 'Administrator',
    },
  });

  // Хешируем пароль
  const hashedPassword = await bcrypt.hash('12345', 10);

  // Создаем администратора
  const adminUser = await prisma.user.create({
    data: {
      login: 'admin',
      password: hashedPassword,
      userDetail: {
        create: {
          firstName: 'Администратор',
          lastName: 'Системы',
          phone: '+7 (900) 123-45-67',
          position: 'Системный администратор',
          salary: 100000,
        },
      },
    },
  });

  // Назначаем роль администратора
  await prisma.userRole.create({
    data: {
      userId: adminUser.userId,
      roleId: adminRole.roleId,
    },
  });

  console.log('✅ Администратор создан успешно!');
  console.log('');
  console.log('🔑 Данные для входа:');
  console.log('   Логин: admin');
  console.log('   Пароль: 12345');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при создании администратора:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
