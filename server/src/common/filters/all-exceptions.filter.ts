import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { COMMON_MESSAGES } from '../messages';

// Postgres error codes we can turn into a sensible answer instead of a 500.
// 23505 is a unique violation: two requests raced past an application-level
// check and the index did its job — that is the client's problem, not a bug.
// 23503 is a foreign key violation: the row being pointed at is gone.
const PG_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  '23505': {
    status: HttpStatus.CONFLICT,
    message: COMMON_MESSAGES.DUPLICATE,
  },
  '23503': {
    status: HttpStatus.BAD_REQUEST,
    message: COMMON_MESSAGES.RELATED_NOT_FOUND,
  },
};

// @Catch() with no argument catches everything, not just HttpException, so a
// stray TypeError becomes a clean 500 instead of a stack trace in the response.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const dbError = !isHttp ? mapDbError(exception) : null;

    const status = isHttp
      ? exception.getStatus()
      : (dbError?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    // Anything we did not throw on purpose is a bug: log it in full, but never
    // send its details to the client. A mapped constraint violation is still
    // logged — it means an application-level check was raced past.
    if (!isHttp) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    let message: string | string[] = COMMON_MESSAGES.SERVER_ERROR;
    if (isHttp) message = extractMessage(exception);
    else if (dbError) message = dbError.message;

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

// HttpException carries either a string or an object; ValidationPipe puts an
// array of messages in there.
function extractMessage(exception: HttpException): string | string[] {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  const message = (body as { message?: string | string[] }).message;
  return message ?? exception.message;
}

// The constraint name is deliberately not passed on: it would tell a client
// about index and column names it has no business knowing.
function mapDbError(exception: unknown) {
  if (!(exception instanceof QueryFailedError)) return null;

  const code = (exception.driverError as { code?: string } | undefined)?.code;
  if (!code) return null;

  return PG_ERRORS[code] ?? null;
}
