import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix(config.get('API_PREFIX', { infer: true }), {
    exclude: ['health', 'health/ready'],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: config.get('API_VERSION', { infer: true }) });

  app.enableCors({
    origin: config.get('corsOrigins', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-request-id', 'x-csrf-token'],
    exposedHeaders: ['x-request-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('School Management System API')
    .setDescription('Multi-tenant school management REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'x-organization-id',
      in: 'header',
      required: false,
      description: 'Active organization context (validated against memberships)',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  app
    .get(Logger)
    .log(
      `API listening on http://localhost:${port}/${config.get('apiBasePath', { infer: true })}`,
    );
}

void bootstrap();
