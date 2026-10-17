import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { verifyToken } from '../utils/jwt.util';
import { AUTH_COOKIE } from '../utils/cookie.util';
import { Role } from '../enums/role.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const notFound = new NotFoundException(
      `Cannot ${request.method} ${request.url}`,
    );

    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) throw notFound;

    const payload = verifyToken(token);
    if (!payload) throw notFound;
    if (payload.role !== Role.Admin) throw notFound;
    request.user = payload;
    return true;
  }
}
