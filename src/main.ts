import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { corsConfig, helmetConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers with Helmet
  app.use(helmet(helmetConfig));

  // Enable CORS with secure configuration
  app.enableCors(corsConfig);

  // Global validation pipe with security enhancements
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Disable detailed error messages in production
      disableErrorMessages: process.env.NODE_ENV === 'production',
      // Validate nested objects
      validateCustomDecorators: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`🔒 Security features enabled: Helmet, CORS, Rate Limiting, Input Validation`);
}

bootstrap();
