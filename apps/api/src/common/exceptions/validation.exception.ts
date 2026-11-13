import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(details?: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}