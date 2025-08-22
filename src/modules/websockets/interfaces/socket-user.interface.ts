// ===== FILE: src/websockets/interfaces/socket-user.interface.ts =====
// Интерфейс, описывающий структуру данных пользователя, привязанного к сокету
export interface SocketUser {
  // Экспорт интерфейса SocketUser
  userId: string; // Уникальный идентификатор пользователя (обязательно)
  email?: string; // Электронная почта (опционально)
  roles?: string[]; // Роли/права пользователя (опционально)
}
