import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST, code?: string) {
    super(
      {
        statusCode: status,
        code: code || 'APP_ERROR',
        message,
      },
      status,
    );
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', details?: any) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas requisições') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Estoque insuficiente') {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'INSUFFICIENT_STOCK');
  }
}

export class TenantIsolationError extends AppError {
  constructor(message = 'Tenant inválido') {
    super(message, HttpStatus.FORBIDDEN, 'TENANT_ISOLATION');
  }
}

export class PlanLimitError extends AppError {
  constructor(message = 'Limite do plano atingido') {
    super(message, HttpStatus.FORBIDDEN, 'PLAN_LIMIT');
  }
}

export class DuplicateError extends AppError {
  constructor(message = 'Registro duplicado') {
    super(message, HttpStatus.CONFLICT, 'DUPLICATE');
  }
}