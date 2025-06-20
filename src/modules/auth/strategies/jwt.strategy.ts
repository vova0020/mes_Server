import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    console.log('🔐 JWT Strategy validate - payload:', payload);
    
    return {
      userId: payload.sub,
      login: payload.login,
      roles: payload.roles || [],
      primaryRole: payload.primaryRole,
      roleBindings: payload.roleBindings || [],
    };
  }
}