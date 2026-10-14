import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export class NotFoundException extends DomainException {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      id ? `${resource} with id ${id} was not found` : `${resource} was not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConflictException extends DomainException {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, HttpStatus.CONFLICT, details);
  }
}

export class ForbiddenError extends DomainException {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class ValidationError extends DomainException {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
