/**
 * ===== MAIN WEBSOCKET GATEWAY =====
 *
 * Основной WebSocket Gateway для MES системы.
 * Этот класс является точкой входа для всех WebSocket соединений и обрабатывает:
 *
 * ЖИЗНЕННЫЙ ЦИКЛ СОЕДИНЕНИЙ:
 * - Установку новых WebSocket соединений
 * - Аутентификацию пользователей (базовая)
 * - Отключение пользователей
 * - Автоматическое подключение к глобальным обновлениям
 *
 * УПРАВЛЕНИЕ КОМНАТАМИ:
 * - Присоединение пользователей к комнатам
 * - Выход пользователей из комнат
 * - Предоставление списка доступных комнат
 * - Быстрое подключение к популярным комнатам
 *
 * ОБРАБОТКА СООБЩЕНИЙ:
 * - Обработка входящих сообщений от клиентов
 * - Валидация запросов
 * - Отправка ответов и уведомлений об ошибках
 * - Тестовые сообщения для отладки
 *
 * БЕЗОПАСНОСТЬ:
 * - Проверка существования комнат
 * - Логирование всех действий
 * - Обработка ошибок соединения
 */

// Импорт всех необходимых декораторов и интерфейсов из @nestjs/websockets
import {
  WebSocketGateway, // Декоратор для создания WebSocket Gateway
  WebSocketServer, // Декоратор для инъекции Socket.IO сервера
  OnGatewayInit, // Интерфейс для хука инициализации Gateway
  OnGatewayConnection, // Интерфейс для хука подключения клиента
  OnGatewayDisconnect, // Интерфейс для хука отключения клиента
  SubscribeMessage, // Декоратор для обработки входящих сообщений
  MessageBody, // Декоратор для извлечения тела сообщения
  ConnectedSocket, // Декоратор для получения объекта Socket
} from '@nestjs/websockets';

// Импорт типов из socket.io для работы с WebSocket
import { Server, Socket } from 'socket.io';

// Импорт Logger из NestJS для логирования событий
import { Logger } from '@nestjs/common';

// Импорт наших сервисов для работы с сокетами и комнатами
import { SocketService } from '../services/socket.service';
import { RoomService } from '../services/room.service';

// Импорт констант с событиями и комнатами
import { EVENTS } from '../constants/events.constants';
import { ROOMS } from '../constants/rooms.constants';

/**
 * Декоратор @WebSocketGateway настраивает WebSocket сервер.
 *
 * Параметры конфигурации:
 * - cors: { origin: true } - разрешает CORS запросы от любых доменов
 *   В продакшене следует указать конкретные домены для безопасности
 */
@WebSocketGateway({ cors: { origin: true } })
export class MainGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  /**
   * Приватный логгер для записи событий Gateway.
   * readonly - ссылка не может быть изменена после создания.
   * MainGateway.name - автоматически использует имя класса в логах.
   */
  private readonly logger = new Logger(MainGateway.name);

  /**
   * Декоратор @WebSocketServer автоматически инъектирует экземпляр Socket.IO сервера.
   * Этот объект используется для отправки сообщений клиентам и управления соединениями.
   */
  @WebSocketServer() server: Server;

  /**
   * Конструктор Gateway с инъекцией зависимостей.
   * NestJS автоматически создаст и передаст экземпляры сервисов.
   *
   * @param socketService - сервис для отправки сообщений
   * @param roomService - сервис для управления комнатами
   */
  constructor(
    private readonly socketService: SocketService,
    private readonly roomService: RoomService,
  ) {}

  /**
   * === ХУКИ ЖИЗНЕННОГО ЦИКЛА GATEWAY ===
   * Методы, которые автоматически вызываются NestJS в определенные моменты
   */

  /**
   * Хук инициализации Gateway.
   * Вызывается после создания WebSocket сервера, но до начала приема соединений.
   * Используется для настройки сервера и передачи его ссылки в SocketService.
   *
   * @param server - экземпляр Socket.IO сервера
   */
  afterInit(server: Server) {
    // Логируем успешную инициализацию
    this.logger.log('WebSocket gateway initialized with fixed rooms');

    // Передаем ссылку на сервер в SocketService для возможности отправки сообщений
    this.socketService.setServer(server);
  }

  /**
   * Хук подключения нового клиента.
   * Вызывается каждый раз, когда клиент устанавливает WebSocket соединение.
   * Выполняет начальную настройку соединения и аутентификацию.
   *
   * @param client - объект Socket представляющий соединение с клиентом
   */
  async handleConnection(client: Socket) {
    try {
      /**
       * БАЗОВАЯ НАСТРОЙКА ПОЛЬЗОВАТЕЛЯ
       * В реальном приложении здесь должна быть полноценная аутентификация
       * через JWT токен или другой механизм
       */

      // Создаем временный ID для анонимного пользователя
      const anonUserId = `anon:${client.id}`;

      // Сохраняем информацию о пользователе в объекте Socket
      // (client as any) - приведение типа, так как TypeScript не знает о нашем расширении
      (client as any).user = {
        userId: anonUserId, // Уникальный идентификатор
        email: undefined, // Email отсутствует у анонимных пользователей
      };

      // Логируем успешное подключение
      this.logger.log(
        `Client ${client.id} connected as anonymous (${anonUserId})`,
      );

      /**
       * АВТОМАТИЧЕСКОЕ ПОДКЛЮЧЕНИЕ ПО ПАРАМЕТРУ ROOM
       */
      const roomParam = client.handshake.query.room as string;
      if (roomParam && Object.values(ROOMS).includes(roomParam)) {
        await this.roomService.joinRoom(client, roomParam);
      }

      /**
       * ОТПРАВКА ИНФОРМАЦИИ О ДОСТУПНЫХ КОМНАТАХ
       * Клиент получает список комнат, к которым может подключиться
       */
      client.emit('available_rooms', {
        rooms: this.roomService.getAllAvailableRooms(),
        message: 'Available rooms for joining',
      });
    } catch (err) {
      /**
       * ОБРАБОТКА ОШИБОК ПОДКЛЮЧЕНИЯ
       * Если что-то пошло не так, логируем ошибку и отключаем клиента
       */
      this.logger.error('Connection handling error', err as Error);

      // Принудительно отключаем клиента с ошибкой
      client.disconnect(true);
    }
  }

  /**
   * Хук отключения клиента.
   * Вызывается когда клиент закрывает соединение или теряет связь.
   * Используется для логирования и очистки ресурсов.
   *
   * @param client - объект Socket отключившегося клиента
   */
  handleDisconnect(client: Socket) {
    // Получаем информацию о пользователе из объекта Socket
    const user = (client as any).user;

    // Логируем отключение с информацией о пользователе (если есть)
    this.logger.log(
      `Client disconnected: ${client.id}${user ? ` (user ${user.userId})` : ''}`,
    );

    // Примечание: Socket.IO автоматически удаляет отключившихся клиентов из всех комнат,
    // поэтому дополнительная очистка не требуется
  }

  /**
   * === ОБРАБОТЧИКИ СООБЩЕНИЙ ===
   * Методы для обработки входящих сообщений от клиентов.
   * Каждый метод помечен декоратором @SubscribeMessage с названием события.
   */

  /**
   * Обработчик присоединения к комнате.
   * Клиент отправляет запрос на подключение к определенной комнате.
   *
   * @param data - данные от клиента, должны содержать поле 'room'
   * @param client - объект Socket клиента, отправившего запрос
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    /**
     * ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
     * Проверяем, что клиент передал название комнаты
     */
    if (!data?.room) {
      // Отправляем ошибку клиенту
      client.emit('error', { message: 'room is required' });
      return; // Прерываем выполнение
    }

    /**
     * ПОПЫТКА ПОДКЛЮЧЕНИЯ К КОМНАТЕ
     * Используем RoomService для безопасного подключения
     */
    const success = await this.roomService.joinRoom(client, data.room);

    if (success) {
      /**
       * УСПЕШНОЕ ПОДКЛЮЧЕНИЕ
       * Отправляем подтверждение клиенту
       */
      client.emit('joined', {
        room: data.room,
        message: `Successfully joined room: ${data.room}`,
      });
    } else {
      /**
       * ОШИБКА ПОДКЛЮЧЕНИЯ
       * Комната не существует или доступ запрещен
       */
      client.emit('error', {
        message: `Room "${data.room}" does not exist or access denied`,
        availableRooms: this.roomService.getAllAvailableRooms(), // Помогаем клиенту
      });
    }
  }

  /**
   * Обработчик выхода из комнаты.
   * Клиент запрашивает отключение от определенной комнаты.
   *
   * @param data - данные от клиента с названием комнаты
   * @param client - объект Socket клиента
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Валидация аналогична handleJoinRoom
    if (!data?.room) {
      client.emit('error', { message: 'room is required' });
      return;
    }

    // Попытка выхода из комнаты
    const success = await this.roomService.leaveRoom(client, data.room);

    if (success) {
      // Подтверждение успешного выхода
      client.emit('left', {
        room: data.room,
        message: `Successfully left room: ${data.room}`,
      });
    } else {
      // Ошибка - комната не существует
      client.emit('error', {
        message: `Room "${data.room}" does not exist`,
      });
    }
  }

  /**
   * Обработчик запроса списка доступных комнат.
   * Клиент может запросить актуальный список комнат в любое время.
   *
   * @param client - объект Socket клиента
   */
  @SubscribeMessage('get_available_rooms')
  async handleGetAvailableRooms(@ConnectedSocket() client: Socket) {
    // Получаем список всех доступных комнат
    const rooms = this.roomService.getAllAvailableRooms();

    // Отправляем список клиенту
    client.emit('available_rooms', { rooms });
  }

  /**
   * === СПЕЦИАЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ БЫСТРОГО ПОДКЛЮЧЕНИЯ ===
   */

  @SubscribeMessage('join_master_ceh')
  async handleJoinMasterCeh(@ConnectedSocket() client: Socket) {
    await this.roomService.joinMasterCeh(client);
    client.emit('joined', { room: ROOMS.MASTER_CEH });
  }

  @SubscribeMessage('join_technologist')
  async handleJoinTechnologist(@ConnectedSocket() client: Socket) {
    await this.roomService.joinTechnologist(client);
    client.emit('joined', { room: ROOMS.TECHNOLOGIST });
  }

  @SubscribeMessage('join_director')
  async handleJoinDirector(@ConnectedSocket() client: Socket) {
    await this.roomService.joinDirector(client);
    client.emit('joined', { room: ROOMS.DIRECTOR });
  }

  /**
   * === ТЕСТОВЫЕ И ОТЛАДОЧНЫЕ МЕТОДЫ ===
   * Методы для тестирования функциональности WebSocket в процессе разработки
   */

  /**
   * Обработчик тестовых сообщений.
   * Позволяет разработчикам и администраторам тестировать отправку сообщений
   * в различные комнаты или всем пользователям.
   *
   * @param data - данные тестового сообщения
   * @param client - объект Socket отправителя
   */
  @SubscribeMessage('test_message')
  async handleTestMessage(
    @MessageBody() data: { room?: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    /**
     * ОПРЕДЕЛЕНИЕ ПОЛУЧАТЕЛЕЙ ТЕСТОВОГО СООБЩЕНИЯ
     */
    if (data.room) {
      /**
       * ОТПРАВКА В КОНКРЕТНУЮ КОМНАТУ
       * Если указана комната, отправляем только туда
       */
      this.socketService.sendCustomEvent(data.room, 'test_response', {
        message: data.message, // Исходное сообщение
        from: client.id, // ID отправителя
        timestamp: new Date(), // Время отправки
      });
    } else {
      /**
       * ОТПРАВКА ВСЕМ ПОЛЬЗОВАТЕЛЯМ
       * Если комната не указана, отправляем глобально
       */
      this.socketService.emitToAll('test_response', {
        message: data.message,
        from: client.id,
        timestamp: new Date(),
      });
    }

    /**
     * Примечание: В продакшене этот метод следует удалить или ограничить
     * доступ к нему только для администраторов
     */
  }
}
