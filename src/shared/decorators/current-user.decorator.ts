import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User Decorator
 * Extracts the authenticated user from the request
 *
 * Usage:
 * @Get('profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return only that property
    return data ? user?.[data] : user;
  },
);

/**
 * Current User ID Decorator
 * Extracts just the user ID from the authenticated user
 *
 * Usage:
 * @Get('my-designs')
 * async getMyDesigns(@UserId() userId: string) {
 *   return this.designService.listDesigns(userId);
 * }
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || request.user?.userId;
  },
);
