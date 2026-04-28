import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const headerValue = request.headers['x-user-id'];
    return Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue ?? process.env.DEMO_USER_ID ?? 'demo-user';
  },
);
