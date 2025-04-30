// DTO для структурированного ответа на запрос авторизации
export class LoginResponseDto {
  // JWT токен для авторизации запросов
  token: string;
  
  // Информация о пользователе
  user: {
    id: number;
    username: string;
    role: string;
    fullName?: string;
  };
  
  // Привязки пользователя (заполняются в зависимости от роли)
  assignments: {
    // Для операторов - привязанные станки
    machines?: {
      id: number;
      name: string;
      status: string;
      segmentId?: number;
      segmentName?: string;
    }[];
    
    // Для мастеров - контролируемые участки
    segments?: {
      id: number;
      name: string;
      lineId: number;
      lineName: string;
    }[];
  };
}