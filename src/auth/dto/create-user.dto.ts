// DTO для регистрации нового пользователя
export class CreateUserDto {
  username: string; // Логин пользователя
  password: string; // Пароль пользователя (будет хэширован)
  roleName: string; // Роль пользователя (например, operator, admin)
  fullName: string; // Полное имя пользователя
  phone?: string; // Телефон (опционально)
  position?: string; // Должность (опционально)
}
