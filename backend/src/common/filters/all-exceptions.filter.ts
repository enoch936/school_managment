import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path: string;
  requestId?: string;
  timestamp: string;
}

/**
 * Converts every thrown error into a consistent, non-leaking JSON envelope.
 * Internal details (stack traces, Prisma internals) are logged but never sent.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    // Preserve Terminus health-check error payloads verbatim so orchestrators
    // can interpret them (they use a non-standard {status, info, error} shape).
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (
        typeof res === 'object' &&
        res !== null &&
        'status' in res &&
        'details' in res &&
        (request.url ?? '').includes('/health')
      ) {
        response.status(exception.getStatus()).json(res);
        return;
      }
    }

    const body = this.toErrorBody(exception, request);

    if (body.statusCode >= 500) {
      this.logger.error(
        `[${request.requestId ?? '-'}] ${request.method} ${request.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (body.statusCode !== 404) {
      this.logger.warn(
        `[${request.requestId ?? '-'}] ${request.method} ${request.url} -> ${body.statusCode} ${body.message}`,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, request: Request & { requestId?: string }): ErrorBody {
    const base = {
      path: request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        return {
          statusCode: status,
          code: typeof r.code === 'string' ? r.code : this.defaultCode(status),
          message:
            typeof r.message === 'string'
              ? r.message
              : Array.isArray(r.message)
                ? (r.message as string[]).join(', ')
                : exception.message,
          details: r.details,
          ...base,
        };
      }
      return {
        statusCode: status,
        code: this.defaultCode(status),
        message: exception.message,
        ...base,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.prismaError(exception, base);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      ...base,
    };
  }

  private prismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    base: { path: string; requestId?: string; timestamp: string },
  ): ErrorBody {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'DUPLICATE_RECORD',
          message: 'A record with the same unique value already exists',
          details: exception.meta,
          ...base,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record was not found',
          ...base,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: 'A referenced record does not exist',
          ...base,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
          ...base,
        };
    }
  }

  private defaultCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
