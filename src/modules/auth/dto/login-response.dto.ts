// DTO для структурированного ответа на запрос авторизации
export class LoginResponseDto {
  token: string;
  
  user: {
    id: number;
    login: string;
    roles: string[];
    primaryRole: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
  };
  
  assignments: {
    stages?: {
      id: number;
      name: string;
      finalStage: boolean;
    }[];
    
    machines?: {
      id: number;
      name: string;
      noSmenTask?: boolean;
    }[];

    pickers?: {
      id: number;
      userId: number;
    }[];
  };
}