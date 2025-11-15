import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getApiInfo() {
    return {
      name: 'Fashion Wallet API',
      version: '1.0.0',
      description: 'Outfit Designer Platform Backend',
      endpoints: {
        health: '/api/v1/health',
        avatars: '/api/v1/avatars',
        catalog: '/api/v1/catalog',
        designs: '/api/v1/designs',
      },
    };
  }
}
