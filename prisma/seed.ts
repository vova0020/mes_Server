
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создание ролей
  const roles = ['admin', 'user'];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: {
        name: role,
      },
    });
  }

  // Создание пользователя-администратора
  const hashedPassword = await bcrypt.hash('adminpassword', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: {
        connect: { name: 'admin' },
      },
      details: {
        create: {
          fullName: 'Администратор',
          phone: '+7 (999) 888-88-88',
          position: 'System Administrator',
        },
      },
    },
  });

  console.log('Инициализация базы данных завершена.');
}

// Выполняем скрипт и закрываем соединение
main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
