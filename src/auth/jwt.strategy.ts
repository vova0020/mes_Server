import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// JWT стратегия для валидации токенов, используется Passport
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Извлекаем токен из заголовка Authorization в формате Bearer
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,  // Не игнорируем время жизни токена
      // Секрет для подписи токена, рекомендуется хранить в переменной окружения
      secretOrKey: process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
    });
  }

  // Метод validate вызывается автоматически, если токен валиден.
  // Результат возвращается и записывается в request.user
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}
