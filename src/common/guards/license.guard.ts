import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const LICENSE_CHECK_KEY = 'licenseCheck';
export const LicenseCheck = (entityType: string) =>
  Reflector.createDecorator<string>({ key: LICENSE_CHECK_KEY });

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const entityType = this.reflector.get<string>(
      LICENSE_CHECK_KEY,
      context.getHandler(),
    );

    if (!entityType) {
      return true;
    }

    try {
      const goServiceUrl = process.env.GO_SERVICE_URL || 'http://localhost:8080';
      const response = await fetch(`${goServiceUrl}/api/license/limits/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ForbiddenException(
          error.message || 'Превышен лимит лицензии',
        );
      }

      const result = await response.json();
      
      if (!result.allowed) {
        throw new ForbiddenException(
          result.message || `Превышен лимит для ${entityType}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new HttpException(
        'Сервис лицензирования недоступен',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
