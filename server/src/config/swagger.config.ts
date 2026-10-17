import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AUTH_COOKIE } from '../common/utils/cookie.util';
import { env } from './env.config';

export const SWAGGER_PATH = 'swagger';

export const swaggerConfigInit = (app: INestApplication) => {
  const logger = new Logger('Swagger');

  // In production the route is never registered at all — not password
  // protected, not guarded, simply absent. This document is a complete map of
  // the admin surface, and AdminGuard answers 404 rather than 403 precisely so
  // those routes cannot be discovered; publishing the map at a fixed path
  // would hand back everything that buys. Returning early also means the
  // document is never generated, so it costs no boot time or memory either.
  //
  // The check lives here rather than at the call site so there is one place
  // that decides, and no way to mount it by accident from somewhere else.
  if (env.isProduction) {
    logger.log(`Disabled in production — /${SWAGGER_PATH} is not registered.`);
    return;
  }

  const document = new DocumentBuilder()
    .setTitle('Shop API')
    .setDescription('Shop API')
    .setVersion('1.0')
    .addTag('Shop')
    // This API authenticates with an httpOnly cookie, not an Authorization
    // header. The name must match the cookie set in cookie.util.ts.
    .addCookieAuth(AUTH_COOKIE, {
      type: 'apiKey',
      in: 'cookie',
      name: AUTH_COOKIE,
      description:
        'JWT session cookie. Set automatically by POST /auth/otp/verify — the browser then sends it on every request, so there is nothing to paste here.',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, document);
  SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument, {
    swaggerOptions: {
      // Without this, "Try it out" fires the request without cookies and
      // every protected route comes back 401.
      withCredentials: true,
    },
  });

  logger.log(`UI at /${SWAGGER_PATH}`);
};
