/**
 * ===== SOCKET SERVICE =====
 * 
 * Сервис для отправки WebSocket сообщений в MES системе.
 * Основные функции:
 * - Отправка сообщений всем подключенным клиентам
 * - Отправка сообщений в конкретные комнаты
 * - Отправка сообщений конкретным пользователям
 * - Специализированные методы для различных типов уведомлений
 * - Управление экземпляром Socket.IO сервера
 * 
 * Этот сервис является центральным узлом для всех исходящих WebSocket сообщений
 * и используется другими модулями системы для уведомления пользователей о событиях.
 */

// Импорт декоратора Injectable для создания сервиса и Logger для логирования
import { Injectable, Logger } from '@nestjs/common';

// Импорт типа Server из socket.io для работы с WebSocket сервером
import { Server } from 'socket.io';

// Импорт констант с названиями комнат и событий
import { ROOMS } from '../constants/rooms.constants';
import { EVENTS } from '../constants/events.constants';

/**
 * Декоратор @Injectable делает класс доступным для инъекции зависимостей
 * в других частях приложения
 */
@Injectable()
export class SocketService {
  /**
   * Приватное поле для хранения ссылки на Socket.IO сервер.
   * Инициализируется как null и устанавливается через метод setServer().
   * Это необходимо, так как сервер создается в Gateway после инициализации сервиса.
   */
  private server: Server | null = null;
  
  /**
   * Приватный логгер для записи сообщений о работе сервиса.
   * Использует имя класса для идентификации источника логов.
   */
  private readonly logger = new Logger(SocketService.name);

  /**
   * === УПРАВЛЕНИЕ СЕРВЕРОМ ===
   * Методы для установки и получения ссылки на Socket.IO сервер
   */

  /**
   * Устанавливает ссылку на Socket.IO сервер.
   * Вызывается из Gateway после инициализации WebSocket сервера.
   * 
   * @param server - экземпляр Socket.IO сервера
   */
  setServer(server: Server): void {
    this.server = server;
    // Логируем успешную установку сервера
    this.logger.log('Socket server set in SocketService');
  }

  /**
   * Возвращает текущий экземпляр Socket.IO сервера.
   * Может вернуть null, если сервер еще не был установлен.
   * 
   * @returns Server | null - экземпляр сервера или null
   */
  getServer(): Server | null {
    return this.server;
  }

  /**
   * === БАЗОВЫЕ МЕТОДЫ ОТПРАВКИ ===
   * Фундаментальные методы для отправки сообщений различным получателям
   */

  /**
   * Отправляет сообщение всем подключенным клиентам.
   * Используется для системных объявлений и критических уведомлений.
   * 
   * @param event - название события (тип сообщения)
   * @param payload - данные для отправки (любой JSON-сериализуемый объект)
   */
  emitToAll(event: string, payload: any): void {
    // Проверяем, что сервер инициализирован
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot emit to all');
      return;
    }
    
    // server.emit() отправляет сообщение всем подключенным клиентам
    this.server.emit(event, payload);
    
    // Логируем отправку для отладки (используем debug уровень, чтобы не засорять основные логи)
    this.logger.debug(`Emitted ${event} to all clients`);
  }

  /**
   * Отправляет сообщение всем клиентам в определенной комнате.
   * Основной метод для целевой доставки сообщений группам пользователей.
   * 
   * @param room - название комнаты (должно соответствовать константам из ROOMS)
   * @param event - название события
   * @param payload - данные для отправки
   */
  emitToRoom(room: string, event: string, payload: any): void {
    // Проверяем инициализацию сервера
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot emit to room');
      return;
    }
    
    // server.to(room).emit() отправляет сообщение только клиентам в указанной комнате
    this.server.to(room).emit(event, payload);
    
    // Логируем отправку с указанием комнаты
    this.logger.debug(`Emitted ${event} to room ${room}`);
  }

  /**
   * Отправляет сообщение конкретному клиенту по его Socket ID.
   * Используется для персональных уведомлений и ответов на запросы.
   * 
   * @param socketId - уникальный идентификатор WebSocket соединения
   * @param event - название события
   * @param payload - данные для отправки
   */
  emitToSocket(socketId: string, event: string, payload: any): void {
    // Проверяем инициализацию сервера
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot emit to socket');
      return;
    }
    
    // server.to(socketId).emit() отправляет сообщение конкретному соединению
    this.server.to(socketId).emit(event, payload);
    
    // Логируем отправку с указанием получателя
    this.logger.debug(`Emitted ${event} to socket ${socketId}`);
  }

  /**
   * === СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ДЛЯ КОМНАТ ===
   * Удобные методы для отправки сообщений в конкретные комнаты MES системы.
   */

  notifyMasterCeh(event: string, payload: any): void {
    this.emitToRoom(ROOMS.MASTER_CEH, event, payload);
  }

  notifyMasterYpack(event: string, payload: any): void {
    this.emitToRoom(ROOMS.MASTER_YPACK, event, payload);
  }

  notifyMachinesYpack(event: string, payload: any): void {
    this.emitToRoom(ROOMS.MACHINES_YPACK, event, payload);
  }

  notifyMachines(event: string, payload: any): void {
    this.emitToRoom(ROOMS.MACHINES, event, payload);
  }

  notifyMachinesNoSmen(event: string, payload: any): void {
    this.emitToRoom(ROOMS.MACHINES_NO_SMEN, event, payload);
  }

  notifyTechnologist(event: string, payload: any): void {
    this.emitToRoom(ROOMS.TECHNOLOGIST, event, payload);
  }

  notifyDirector(event: string, payload: any): void {
    this.emitToRoom(ROOMS.DIRECTOR, event, payload);
  }

  /**
   * Отправляет сообщение в несколько комнат одновременно
   */
  emitToMultipleRooms(rooms: string[], event: string, payload: any): void {
    rooms.forEach(room => this.emitToRoom(room, event, payload));
  }

  /**
   * === МЕТОДЫ ДЛЯ ТИПИЧНЫХ СЦЕНАРИЕВ ===
   * Бизнес-логика распределения событий по комнатам
   */

  notifyAboutOrderChanges(payload: any): void {
    const rooms = [ROOMS.MASTER_CEH, ROOMS.MASTER_YPACK, ROOMS.DIRECTOR];
    this.emitToMultipleRooms(rooms, EVENTS.ORDER_EVENT, payload);
  }

  notifyAboutPackageChanges(payload: any): void {
    const rooms = [ROOMS.MASTER_YPACK, ROOMS.MACHINES_YPACK];
    this.emitToMultipleRooms(rooms, EVENTS.PACKAGE_EVENT, payload);
  }

  notifyAboutDetailChanges(payload: any): void {
    const rooms = [ROOMS.MASTER_CEH, ROOMS.MACHINES, ROOMS.TECHNOLOGIST];
    this.emitToMultipleRooms(rooms, EVENTS.DETAIL_EVENT, payload);
  }

  notifyAboutMaterialChanges(payload: any): void {
    const rooms = [ROOMS.TECHNOLOGIST, ROOMS.DIRECTOR];
    this.emitToMultipleRooms(rooms, EVENTS.MATERIAL_EVENT, payload);
  }

  notifyAboutMachineSettingChanges(payload: any): void {
    const rooms = [ROOMS.MACHINES, ROOMS.MACHINES_YPACK, ROOMS.MACHINES_NO_SMEN];
    this.emitToMultipleRooms(rooms, EVENTS.MACHINE_SETTING_EVENT, payload);
  }



  /**
   * === УНИВЕРСАЛЬНЫЙ МЕТОД ===
   * Метод для отправки произвольного события в указанную комнату с проверкой безопасности
   */

  /**
   * Отправляет пользовательское событие в указанную комнату.
   * Включает проверку существования комнаты для предотвращения ошибок.
   * 
   * @param roomName - название комнаты (должно существовать в ROOMS)
   * @param eventName - название события
   * @param payload - данные для отправки
   * @returns boolean - true если сообщение отправлено, false если комната не найдена
   */
  sendCustomEvent(roomName: string, eventName: string, payload: any): boolean {
    // Получаем список всех разрешенных комнат
    const allowedRooms = Object.values(ROOMS);
    
    // Проверяем, существует ли запрашиваемая комната
    if (!allowedRooms.includes(roomName)) {
      // Логируем попытку отправки в несуществующую комнату для безопасности
      this.logger.warn(`Attempted to send event to non-existent room: ${roomName}`);
      return false; // Возвращаем false - отправка не удалась
    }

    // Если комната существует, отправляем сообщение
    this.emitToRoom(roomName, eventName, payload);
    return true; // Возвращаем true - отправка успешна
  }
}