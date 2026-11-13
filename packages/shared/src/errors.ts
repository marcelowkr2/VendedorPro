export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode: number = 400, code: string = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') { super(message, 404, 'NOT_FOUND'); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') { super(message, 403, 'FORBIDDEN'); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') { super(message, 401, 'UNAUTHORIZED'); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflito') { super(message, 409, 'CONFLICT'); }
}
export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos') { super(message, 400, 'VALIDATION_ERROR'); }
}
export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas requisições') { super(message, 429, 'TOO_MANY_REQUESTS'); }
}
export class InsufficientStockError extends AppError {
  constructor(message = 'Estoque insuficiente') { super(message, 422, 'INSUFFICIENT_STOCK'); }
}
export class TenantIsolationError extends AppError {
  constructor(message = 'Tenant inválido') { super(message, 403, 'TENANT_ISOLATION'); }
}
export class PlanLimitError extends AppError {
  constructor(message = 'Limite do plano atingido') { super(message, 403, 'PLAN_LIMIT'); }
}
export class DuplicateError extends AppError {
  constructor(message = 'Registro duplicado') { super(message, 409, 'DUPLICATE'); }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_ISOLATION: 'TENANT_ISOLATION',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PLAN_LIMIT: 'PLAN_LIMIT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  DUPLICATE: 'DUPLICATE',
};