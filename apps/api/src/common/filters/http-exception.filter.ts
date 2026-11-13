import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Injectable } from '@nestjs/common';

interface StandardError {
  statusCode: number;
  timestamp: string;
  path: string;
  code: string;
  message: string | string[];
  details?: any;
}

function getErrorCode(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'object' && response !== null) {
    const res = response as any;
    if (res.code) return res.code;
    if (Array.isArray(res.message)) return 'VALIDATION_ERROR';
  }
  return exception.name
    .replace('Exception', '')
    .toUpperCase()
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '');
}

@Catch(HttpException)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception.getStatus();
    const res = exception.getResponse() as any;
    const message = res?.message ?? exception.message;

    const body: StandardError = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      code: getErrorCode(exception),
      message,
      details: res?.details,
    };

    response.status(status).json(body);
  }
}