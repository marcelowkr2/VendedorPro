import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
  return data ? req.user?.[data] : req.user;
});