/**
 * ===== ROOM SERVICE =====
 *
 * Сервис для управления WebSocket комнатами в MES системе.
 * Отвечает за:
 * - Подключение пользователей к комнатам
 * - Отключение пользователей от комнат
 * - Проверку доступности комнат
 * - Логирование действий с комнатами
 *
 * Комнаты используются для группировки пользователей по ролям,
 * отделам или производственным линиям для целевой доставки сообщений.
 */

// Импорт декоратора Injectable для создания сервиса и Logger для логирования
import { Injectable, Logger } from '@nestjs/common';

// Импорт типа Socket из socket.io для работы с WebSocket соединениями
import { Socket } from 'socket.io';

// Импорт констант с названиями всех доступных комнат
import { ROOMS } from '../constants/rooms.constants';

/**
 * Декоратор @Injectable делает класс доступным для инъекции зависимостей
 * в других классах NestJS приложения
 */
@Injectable()
export class RoomService {
  /**
   * Приватный логгер для записи сообщений о работе сервиса.
   * readonly - означает, что ссылка на логгер не может быть изменена после создания.
   * RoomService.name - автоматически использует имя класса в логах.
   */
  private readonly logger = new Logger(RoomService.name);

  /**
   * === МЕТОДЫ ДЛЯ ПРИСОЕДИНЕНИЯ К КОНКРЕТНЫМ КОМНАТАМ ===
   * Каждый метод отвечает за подключение пользователя к определенной комнате MES системы.
   */

  async joinMasterCeh(socket: Socket): Promise<void> {
    await socket.join(ROOMS.MASTER_CEH);
    this.logger.log(`Socket ${socket.id} joined master ceh`);
  }

  async joinMasterYpack(socket: Socket): Promise<void> {
    await socket.join(ROOMS.MASTER_YPACK);
    this.logger.log(`Socket ${socket.id} joined master ypack`);
  }

  async joinMachinesYpack(socket: Socket): Promise<void> {
    await socket.join(ROOMS.MACHINES_YPACK);
    this.logger.log(`Socket ${socket.id} joined machines ypack`);
  }

  async joinMachines(socket: Socket): Promise<void> {
    await socket.join(ROOMS.MACHINES);
    this.logger.log(`Socket ${socket.id} joined machines`);
  }

  async joinMachinesNoSmen(socket: Socket): Promise<void> {
    await socket.join(ROOMS.MACHINES_NO_SMEN);
    this.logger.log(`Socket ${socket.id} joined machines no smen`);
  }

  async joinTechnologist(socket: Socket): Promise<void> {
    await socket.join(ROOMS.TECHNOLOGIST);
    this.logger.log(`Socket ${socket.id} joined technologist`);
  }

  async joinDirector(socket: Socket): Promise<void> {
    await socket.join(ROOMS.DIRECTOR);
    this.logger.log(`Socket ${socket.id} joined director`);
  }

  /**
   * === МЕТОДЫ ДЛЯ ВЫХОДА ИЗ КОМНАТ ===
   * Каждый метод отвечает за отключение пользователя от определенной комнаты MES системы.
   */

  async leaveMasterCeh(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.MASTER_CEH);
    this.logger.log(`Socket ${socket.id} left master ceh`);
  }

  async leaveMasterYpack(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.MASTER_YPACK);
    this.logger.log(`Socket ${socket.id} left master ypack`);
  }

  async leaveMachinesYpack(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.MACHINES_YPACK);
    this.logger.log(`Socket ${socket.id} left machines ypack`);
  }

  async leaveMachines(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.MACHINES);
    this.logger.log(`Socket ${socket.id} left machines`);
  }

  async leaveMachinesNoSmen(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.MACHINES_NO_SMEN);
    this.logger.log(`Socket ${socket.id} left machines no smen`);
  }

  async leaveTechnologist(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.TECHNOLOGIST);
    this.logger.log(`Socket ${socket.id} left technologist`);
  }

  async leaveDirector(socket: Socket): Promise<void> {
    await socket.leave(ROOMS.DIRECTOR);
    this.logger.log(`Socket ${socket.id} left director`);
  }

  /**
   * === УНИВЕРСАЛЬНЫЕ МЕТОДЫ ===
   * Методы для работы с комнатами по их названиям, а не через конкретные функции.
   * Используются в Gateway для обработки динамических запросов от клиентов.
   */

  /**
   * Универсальный метод для присоединения к любой разрешенной комнате.
   * Проверяет, существует ли комната в списке разрешенных, и только тогда
   * подключает пользователя.
   *
   * @param socket - WebSocket соединение пользователя
   * @param roomName - название комнаты для подключения
   * @returns Promise<boolean> - true если подключение успешно, false если комната не найдена
   */
  async joinRoom(socket: Socket, roomName: string): Promise<boolean> {
    // Получаем массив всех разрешенных названий комнат из константы ROOMS
    const allowedRooms = Object.values(ROOMS);

    // Проверяем, есть ли запрашиваемая комната в списке разрешенных
    if (!allowedRooms.includes(roomName)) {
      // Логируем попытку подключения к несуществующей комнате для безопасности
      this.logger.warn(
        `Socket ${socket.id} tried to join non-existent room: ${roomName}`,
      );
      return false; // Возвращаем false - подключение не удалось
    }

    // Если комната разрешена, подключаем пользователя
    await socket.join(roomName);
    // Логируем успешное подключение
    this.logger.log(`Socket ${socket.id} joined room: ${roomName}`);
    return true; // Возвращаем true - подключение успешно
  }

  /**
   * Универсальный метод для выхода из любой комнаты.
   * Аналогично joinRoom, но для отключения от комнат.
   *
   * @param socket - WebSocket соединение пользователя
   * @param roomName - название комнаты для отключения
   * @returns Promise<boolean> - true если отключение успешно, false если комната не найдена
   */
  async leaveRoom(socket: Socket, roomName: string): Promise<boolean> {
    // Проверяем существование комнаты аналогично joinRoom
    const allowedRooms = Object.values(ROOMS);
    if (!allowedRooms.includes(roomName)) {
      // Логируем попытку выхода из несуществующей комнаты
      this.logger.warn(
        `Socket ${socket.id} tried to leave non-existent room: ${roomName}`,
      );
      return false;
    }

    // Отключаем пользователя от комнаты
    await socket.leave(roomName);
    // Логируем успешное отключение
    this.logger.log(`Socket ${socket.id} left room: ${roomName}`);
    return true;
  }

  /**
   * Возвращает список всех доступных комнат.
   * Используется для отправки клиенту информации о том, к каким комнатам
   * он может подключиться.
   *
   * @returns string[] - массив названий всех доступных комнат
   */
  getAllAvailableRooms(): string[] {
    // Object.values() извлекает все значения из объекта ROOMS
    // Возвращает массив строк с названиями комнат
    return Object.values(ROOMS);
  }
}
