// ===== FILE: src/websockets/constants/events.constants.ts =====
// Константы для названий событий WebSocket (с комментариями на каждой строке)
export const WS_EVENTS = {
  // Экспорт объекта с константами событий
  CONNECT: 'connect', // Событие встроенное socket.io при подключении
  DISCONNECT: 'disconnect', // Событие встроенное socket.io при отключении
  JOIN_ROOM: 'ws.join_room', // Клиент просит присоединиться к комнате
  LEAVE_ROOM: 'ws.leave_room', // Клиент просит покинуть комнату
  ORDER_UPDATED: 'order.updated', // Пример бизнес-события: обновлён заказ
  ORDER_CREATED: 'order.created', // Пример бизнес-события: создан заказ
  USER_UPDATED: 'user.updated', // Пример бизнес-события: обновлён пользователь
} as const; // as const чтобы TypeScript вывел литеральные типы
