import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Наследуем стандартный AuthGuard и используем стратегию 'jwt'
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
