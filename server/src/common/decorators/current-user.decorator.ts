import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtPayload, verifyToken } from '../utils/jwt.util';
import { AUTH_COOKIE } from '../utils/cookie.util';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user) return request.user;
    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) return undefined;
    request.user = verifyToken(token) ?? undefined;
    return request.user;
  },
);
