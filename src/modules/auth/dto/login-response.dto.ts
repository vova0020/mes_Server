// DTO для структурированного ответа на запрос авторизации
export class LoginResponseDto {
  // JWT токен для авторизации запросов
  token: string;
  
  // Информация о пользователе
  user: {
    id: number;
    login: string;
    roles: string[]; // Массив ролей пользователя
    primaryRole: string; // Основная роль
    fullName?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
  };
  
  // Привязки пользователя (заполняются в зависимости от ролей)
  assignments: {
    // Технологические этапы (для операторов и мастеров)
    stages?: {
      id: number;
      name: string;
      description?: string;
      substages: {
        id: number;
        name: string;
        description?: string;
        allowance: number;
      }[];
      lines: {
        id: number;
        name: string;
        type: string;
      }[];
    }[];
    
    // Доступные станки (для операторов)
    machines?: {
      id: number;
      name: string;
      status: string;
      recommendedLoad: number;
      loadUnit: string;
      stages: {
        id: number;
        name: string;
      }[];
    }[];

    // Информация о комплектовщике (для ролей комплектовщика)
    picker?: {
      id: number;
      userId: number;
    };
  };
}