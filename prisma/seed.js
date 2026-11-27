"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Создаем администратора...');
    const adminRole = await prisma.role.create({
        data: {
            roleName: 'admin',
        },
    });
    const masterRole = await prisma.role.create({
        data: {
            roleName: 'master',
        },
    });
    const managementRole = await prisma.role.create({
        data: {
            roleName: 'management',
        },
    });
    const technologistRole = await prisma.role.create({
        data: {
            roleName: 'technologist',
        },
    });
    const orderPickerRole = await prisma.role.create({
        data: {
            roleName: 'orderPicker',
        },
    });
    const workplaceRole = await prisma.role.create({
        data: {
            roleName: 'workplace',
        },
    });
    const operatorRole = await prisma.role.create({
        data: {
            roleName: 'operator',
        },
    });
    const hashedPassword = await bcrypt.hash('12345', 10);
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
//# sourceMappingURL=seed.js.map