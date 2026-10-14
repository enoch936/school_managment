import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces/auth-principal.interface';

/**
 * Assigns a correlation id to every request (honouring an inbound
 * `x-request-id`), exposes it on the response, and stores it on the request
 * for logging and audit correlation.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
