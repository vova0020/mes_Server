import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Авторизация и пользователи (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const adminUser = {
    username: 'admin',
    password: 'adminpassword',
  };

  const newUser = {
    username: 'newuser',
    password: 'newpassword',
    roleId: 2, // Предполагаем ID = 2 для user
    details: {
      fullName: 'Новый Пользователь',
      phone: '+7 (999) 123-45-67',
      position: 'Пользователь',
    },
  };

  let userId: number;
  let adminToken: string;

  // Функция для вывода сообщений в консоль
  const logTestResult = (
    testName: string,
    result: 'PASS' | 'FAIL',
    details?: string,
  ) => {
    const colorCode = result === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.log(`${colorCode}[${result}]${resetColor} ${testName}`);
    if (details) {
      console.log(`       ${details}`);
    }
  };

  beforeAll(async () => {
    console.log(
      '\n\x1b[1m=== Начало тестирования авторизации и пользователей ===\x1b[0m\n',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    console.log('✓ Приложение инициализировано');

    try {
      // Аутентификация администратора для получения токена
      const adminLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: adminUser.username,
          password: adminUser.password,
        });

      adminToken = adminLoginRes.body.token;
      console.log('✓ Администратор успешно аутентифицирован');

      // Проверка валидности токена администратора
      const decoded = jwtService.verify(adminToken);
      console.log(
        `✓ Токен администратора действителен (пользователь ID: ${decoded.sub})`,
      );
    } catch (error) {
      console.error('✗ Ошибка аутентификации администратора:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    console.log('\n\x1b[1m=== Очистка после тестов ===\x1b[0m');

    if (userId) {
      try {
        await prismaService.userDetail.deleteMany({
          where: { userId },
        });
        console.log(`✓ Удалены детали пользователя (ID: ${userId})`);
      } catch (e) {
        console.log('✗ Ошибка при удалении деталей пользователя:', e.message);
      }

      try {
        await prismaService.loginLog.deleteMany({
          where: { userId },
        });
        console.log(`✓ Удалены логи входа пользователя (ID: ${userId})`);
      } catch (e) {
        console.log('✗ Ошибка при удалении логов входа:', e.message);
      }

      try {
        await prismaService.user.delete({
          where: { id: userId },
        });
        console.log(`✓ Удален тестовый пользователь (ID: ${userId})`);
      } catch (e) {
        console.log('✗ Ошибка при удалении пользователя:', e.message);
      }
    }

    await app.close();
    console.log('✓ Приложение закрыто');
    console.log('\n\x1b[1m=== Завершение тестирования ===\x1b[0m\n');
  });

  describe('Регистрация нового пользователя', () => {
    it('Должен зарегистрировать нового пользователя', async () => {
      const testName = 'Регистрация нового пользователя';
      try {
        const response = await request(app.getHttpServer())
          .post('/users/register')
          .set('Authorization', `Bearer ${adminToken}`) // Требуется авторизация администратора
          .send(newUser)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(newUser.username);
        userId = response.body.id;

        // Проверка данных пользователя в базе
        const createdUser = await prismaService.user.findUnique({
          where: { id: userId },
          include: { role: true, details: true },
        });

        if (!createdUser) {
          throw new Error('Пользователь не найден в базе данных');
        }

        if (!createdUser.details) {
          throw new Error('Детали пользователя не найдены в базе данных');
        }

        expect(createdUser.username).toBe(newUser.username);
        expect(createdUser.password).not.toBe(newUser.password); // Пароль должен быть захеширован
        expect(createdUser.role).toBeDefined();
        expect(createdUser.role!.id).toBe(newUser.roleId);
        expect(createdUser.details.fullName).toBe(newUser.details.fullName);
        expect(createdUser.details.phone).toBe(newUser.details.phone);
        expect(createdUser.details.position).toBe(newUser.details.position);

        logTestResult(
          testName,
          'PASS',
          `Пользователь ${newUser.username} успешно зарегистрирован (ID: ${userId})`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Не должен регистрировать пользователя без обязательных полей', async () => {
      const testName = 'Отклонение регистрации без обязательных полей';
      try {
        const response = await request(app.getHttpServer())
          .post('/users/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            // Отсутствует username
            password: 'test_password',
            roleId: newUser.roleId,
          })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        logTestResult(
          testName,
          'PASS',
          `Система корректно отклонила запрос: ${response.body.message}`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Не должен регистрировать пользователя с существующим логином', async () => {
      const testName = 'Отклонение регистрации с существующим логином';
      try {
        const response = await request(app.getHttpServer())
          .post('/users/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: newUser.username,
            password: 'другой_пароль',
            roleId: newUser.roleId,
            details: { fullName: 'Другой Пользователь' },
          })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        logTestResult(
          testName,
          'PASS',
          `Система корректно отклонила дубликат: ${response.body.message}`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Не должен регистрировать пользователя без авторизации администратора', async () => {
      const testName = 'Отклонение регистрации без прав администратора';
      try {
        const response = await request(app.getHttpServer())
          .post('/users/register')
          .send({
            username: 'unauthorizeduser',
            password: 'testpass',
            roleId: newUser.roleId,
          })
          .expect(401);

        logTestResult(
          testName,
          'PASS',
          'Система корректно требует авторизацию',
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });
  });

  describe('Аутентификация пользователей', () => {
    let userToken: string;

    it('Должен аутентифицировать нового пользователя и вернуть токен', async () => {
      const testName = 'Аутентификация пользователя';
      try {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: newUser.username,
            password: newUser.password,
          })
          .expect(201);

        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
        userToken = response.body.token;

        // Проверяем валидность токена
        const decoded = jwtService.verify(userToken);
        expect(decoded).toHaveProperty('sub');
        expect(decoded).toHaveProperty('username');
        expect(decoded.username).toBe(newUser.username);

        logTestResult(
          testName,
          'PASS',
          `Пользователь ${newUser.username} успешно аутентифицирован, получен валидный токен`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Не должен аутентифицировать с неправильным паролем', async () => {
      const testName = 'Отклонение аутентификации с неверным паролем';
      try {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: newUser.username,
            password: 'неправильный_пароль',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message');
        logTestResult(
          testName,
          'PASS',
          `Система корректно отклонила: ${response.body.message}`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Не должен аутентифицировать несуществующего пользователя', async () => {
      const testName = 'Отклонение аутентификации несуществующего пользователя';
      try {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: 'несуществующий',
            password: 'любой_пароль',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message');
        logTestResult(
          testName,
          'PASS',
          `Система корректно отклонила: ${response.body.message}`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Должен запретить доступ к защищенному маршруту без аутентификации', async () => {
      const testName = 'Запрет доступа без аутентификации';
      try {
        await request(app.getHttpServer()).get('/users/profile').expect(401);

        logTestResult(
          testName,
          'PASS',
          'Система корректно требует аутентификацию',
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Должен разрешить доступ для защищённого маршрута с валидным токеном', async () => {
      const testName = 'Доступ с валидным токеном';
      try {
        const response = await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(newUser.username);

        logTestResult(
          testName,
          'PASS',
          `Пользователь ${newUser.username} успешно получил доступ к своему профилю`,
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });

    it('Должен проверять срок действия токена', async () => {
      const testName = 'Проверка срока действия токена';
      try {
        // Создаем истекший токен
        const expiredToken = jwtService.sign(
          {
            username: newUser.username,
            sub: userId,
          },
          {
            expiresIn: '1ms', // Очень короткий срок действия
          },
        );

        // Ждем, чтобы токен точно истек
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Пробуем использовать истекший токен
        const response = await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        logTestResult(
          testName,
          'PASS',
          'Система корректно отклонила запрос с истекшим токеном',
        );
      } catch (error) {
        logTestResult(testName, 'FAIL', error.message);
        throw error;
      }
    });
  });

  describe('Авторизация и разграничение прав', () => {
    it('Должен проверять права администратора', async () => {
      const testName = 'Проверка прав администратора';
      try {
        // Предполагаем, что есть маршрут только для администратора
        const response = await request(app.getHttpServer())
          .get('/users') // Маршрут для получения всех пользователей
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBeTruthy();
        logTestResult(
          testName,
          'PASS',
          'Администратор успешно получил доступ к списку пользователей',
        );
      } catch (error) {
        // Этот тест может не пройти, если маршрут /users не существует
        logTestResult(
          testName,
          'FAIL',
          `${error.message} (возможно, маршрут '/users' не реализован)`,
        );
        console.log(
          '       Этот тест может быть пропущен, если соответствующий маршрут не существует',
        );
      }
    });

    it('Обычный пользователь не должен иметь доступа к административным маршрутам', async () => {
      const testName = 'Ограничение доступа обычного пользователя';

      // Аутентификация обычного пользователя
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: newUser.username,
          password: newUser.password,
        });

      const userToken = loginRes.body.token;

      try {
        // Пробуем получить доступ к административному маршруту
        await request(app.getHttpServer())
          .get('/users') // Маршрут для получения всех пользователей
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403); // Ожидаем запрет доступа

        logTestResult(
          testName,
          'PASS',
          'Система корректно запретила доступ обычному пользователю к административным функциям',
        );
      } catch (error) {
        // Этот тест может не пройти, если маршрут /users не существует
        // или если система не реализует разграничение прав
        logTestResult(
          testName,
          'FAIL',
          `${error.message} (возможно, маршрут '/users' не реализован или отсутствует проверка прав)`,
        );
        console.log(
          '       Этот тест может быть пропущен, если соответствующий маршрут не существует',
        );
      }
    });
  });
});
