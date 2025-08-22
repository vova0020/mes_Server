// ===== FILE: src/websockets/services/room.service.ts =====
// Сервис для управления "комнатами" socket.io (join/leave и т.п.)
import { Injectable } from '@nestjs/common'; // Импорт декоратора Injectable из NestJS
import { Socket } from 'socket.io'; // Импорт типа Socket из socket.io
import { ROOMS } from '../constants/rooms.constants'; // Импорт шаблонов комнат

@Injectable() // Декоратор, делающий сервис доступным для DI (внедрения зависимостей)
export class RoomService {
  // Экспорт класса RoomService
  async joinOrderRoom(socket: Socket, orderId: string) {
    // Метод: присоединить сокет к комнате заказа
    const room = ROOMS.ORDER(orderId); // Собираем название комнаты по шаблону
    await socket.join(room); // Вызов socket.join для присоединения
    return room; // Возвращаем имя присоединённой комнаты
  }

  async leaveOrderRoom(socket: Socket, orderId: string) {
    // Метод: покинуть комнату заказа
    const room = ROOMS.ORDER(orderId); // Формируем имя комнаты
    await socket.leave(room); // Вызов socket.leave
    return room; // Возвращаем имя
  }

  async join(socket: Socket, room: string) {
    // Общий метод для join на любую комнату
    await socket.join(room); // Присоединяем
    return room; // Возвращаем имя
  }

  async leave(socket: Socket, room: string) {
    // Общий метод для leave
    await socket.leave(room); // Покидаем комнату
    return room; // Возвращаем имя
  }
}
