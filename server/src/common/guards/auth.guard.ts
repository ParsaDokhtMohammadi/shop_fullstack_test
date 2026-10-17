import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { verifyToken } from '../utils/jwt.util';
import { AUTH_COOKIE } from '../utils/cookie.util';
import { AUTH_MESSAGES } from '../messages';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) throw new UnauthorizedException(AUTH_MESSAGES.UNAUTHORIZED);
    const payload = verifyToken(token);
    if (!payload) throw new UnauthorizedException(AUTH_MESSAGES.UNAUTHORIZED);
    request.user = payload;
    return true;
  }
}
