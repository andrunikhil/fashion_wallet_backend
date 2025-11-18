import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Global serialization interceptor for transforming responses
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Fashion Wallet API')
    .setDescription('API documentation for Fashion Wallet Backend - Avatars, Catalog, and Design Services')
    .setVersion('1.0')
    .addTag('Avatars', 'Avatar management endpoints')
    .addTag('Measurements', 'Body measurement endpoints')
    .addTag('Models', '3D model export endpoints')
    .addTag('Catalog', 'Catalog item management')
    .addTag('Collections', 'Curated collections')
    .addTag('Brand Partners', 'Brand partnership management')
    .addTag('Search', 'Search and filtering')
    .addTag('Recommendations', 'Personalized recommendations')
    .addTag('Design', 'Design workspace')
    .addTag('Health', 'Health and monitoring endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // API prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
  console.log(`🔒 Security features enabled: Helmet, CORS, Rate Limiting, Input Validation`);
}

bootstrap();
