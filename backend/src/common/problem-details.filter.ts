import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Every error leaves as RFC 7807 `application/problem+json`. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const obj =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};

    // ValidationPipe puts a string[] in `message`; expose it as `errors`.
    const message = typeof body === 'string' ? body : obj.message;
    const errors = Array.isArray(message) ? message : undefined;
    const detail =
      status >= 500
        ? 'An unexpected error occurred.'
        : errors
          ? 'Request validation failed.'
          : (message as string | undefined);

    if (status >= 500) this.logger.error(exception);
    if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer');

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: HttpStatus[status] ?? 'Error',
        status,
        detail,
        instance: req.originalUrl,
        ...(typeof obj.code === 'string' && { code: obj.code }),
        ...(errors && { errors }),
      });
  }
}
