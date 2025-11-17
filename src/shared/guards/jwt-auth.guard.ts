import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * Validates JWT tokens in HTTP requests
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * async protectedRoute(@CurrentUser() user: User) {
 *   return user;
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add custom authentication logic here if needed
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      this.logger.warn(`Authentication failed: ${info?.message || err?.message}`);
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    return user;
  }
}
