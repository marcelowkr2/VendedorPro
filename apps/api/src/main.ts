import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { getConfig } from '@vendedorpro/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    bufferLogs: true,
  });

  const config = getConfig();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          constraints: Object.values(e.constraints || {}),
        }));
        return { statusCode: 400, code: 'VALIDATION_ERROR', details };
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  app.enableCors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-tenant-id'],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const swaggerConfig = new DocumentBuilder()
    .setBasePath('api')
    .setTitle('VendedorPro API')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('auth', 'Autenticação')
    .addTag('tenants', 'Empresas')
    .addTag('users', 'Usuários')
    .addTag('products', 'Produtos')
    .addTag('customers', ' Clientes')
    .addTag('quotes', 'Orçamentos')
    .addTag('orders', 'Pedidos')
    .addTag('stock', 'Estoque')
    .addTag('finance', 'Financeiro')
    .addTag('goals', 'Metas')
    .addTag('reports', 'Relatórios')
    .addTag('admin', 'Admin')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.PORT_API || 4000;
  await app.listen(port);
  console.log(`VendedorPro API rodando em http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});