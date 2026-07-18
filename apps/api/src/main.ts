import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('gwos-api-bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS matching the frontend host url
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });

  // Set Global URL Prefix
  app.setGlobalPrefix('api');

  // Bind centralized Global Error Exception Handler
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Listen on environment port
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 GlobalWorkforce OS API is running on: http://localhost:${port}/api`);
}
bootstrap();
