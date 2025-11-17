import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket JWT Authentication Guard
 * Validates JWT tokens in WebSocket connections
 *
 * The JWT token should be provided in one of these ways:
 * 1. Query parameter: ?token=<jwt_token>
 * 2. Auth header in handshake: { auth: { token: '<jwt_token>' } }
 *
 * Usage:
 * @WebSocketGateway()
 * @UseGuards(WsJwtAuthGuard)
 * export class MyGateway {
 *   @SubscribeMessage('message')
 *   handleMessage(@ConnectedSocket() client: Socket) {
 *     const user = client.data.user;
 *   }
 * }
 */
@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      // Extract token from query params or auth
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      // TODO: Validate JWT token
      // For now, we'll decode the token and extract user info
      // In production, use a proper JWT library like jsonwebtoken
      const user = await this.validateToken(token);

      // Attach user to socket for later use
      client.data.user = user;
      client.data.userId = user.id || user.userId;

      return true;
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`);
      throw new WsException('Authentication failed');
    }
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try query parameter first
    const queryToken = client.handshake.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try auth object
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Validate JWT token
   * TODO: Implement actual JWT validation using jsonwebtoken or @nestjs/jwt
   */
  private async validateToken(token: string): Promise<any> {
    // Placeholder implementation
    // In production, verify the token signature and decode claims

    try {
      // For development, we'll just decode without verification
      // SECURITY WARNING: This is NOT secure for production!
      const payload = this.decodeTokenPayload(token);

      if (!payload || !payload.sub) {
        throw new Error('Invalid token payload');
      }

      return {
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        // Add other user properties as needed
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Decode JWT payload (without verification)
   * WARNING: This is for development only!
   */
  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }
}
