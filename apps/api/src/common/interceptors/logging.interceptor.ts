import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, url } = req;
    const ip = (req.ip || req.socket.remoteAddress || '').toString();
    const now = Date.now();

    return next.handle().pipe(
      tap({
        error: (err) => {
          const ms = Date.now() - now;
          console.error(`[HTTP] ${method} ${url} ${err?.status || 500} ${ms}ms ip=${ip}`);
        },
        finalize: () => {
          const ms = Date.now() - now;
          console.log(`[HTTP] ${method} ${url} ${ms}ms ip=${ip}`);
        },
      }),
    );
  }
}