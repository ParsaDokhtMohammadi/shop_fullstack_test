import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { swaggerConfigInit } from './config/swagger.config';
import { env } from './config/env.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { UPLOAD_DIR } from './config/multer.config';
import { assertJwtConfig } from './common/utils/jwt.util';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Before the app is built, so a bad secret stops the boot in a second rather
  // than after the database connection and the schema check have gone through.
  assertJwtConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // First, because everything below it reads req.ip: the throttler buckets per
  // ip, and behind a reverse proxy the socket address is the proxy's for every
  // visitor — so without this every per-ip limit is really a shop-wide one.
  app.set('trust proxy', env.trustProxy);

  // Unset is the safe default, but behind a proxy it is the wrong one, and it
  // goes wrong quietly: the limits still work, they just count the whole shop
  // as one visitor. Worth a line in the log rather than a support ticket.
  if (env.isProduction && !env.trustProxySet)
    logger.warn(
      'TRUST_PROXY is not set. If this app sits behind a reverse proxy, every per-ip rate limit is counting all visitors as one — set it to the number of proxies in front of it (1 for a single nginx). Set it to false to silence this when the app is exposed directly.',
    );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
        },
      },
    }),
  );
  // Uploaded images are served straight off disk, outside the /api prefix:
  // they are files, not endpoints. crossOriginResourcePolicy is relaxed so the
  // storefront on another origin can actually render them — helmet's default
  // 'same-origin' blocks that.
  app.useStaticAssets(UPLOAD_DIR, { prefix: `${env.upload.publicPath}/` });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  swaggerConfigInit(app);


  app.enableShutdownHooks();

  await app.listen(env.port, () => {
    logger.log(`Listening on http://localhost:${env.port}/api`);
  });
}
bootstrap();
