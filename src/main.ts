import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Serve static files from public directory
  const publicPath = join(__dirname, '../../public');
  app.use('/oauth', express.static(publicPath));

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('MCP Client API')
    .setDescription('REST API for connecting to MCP (Model Context Protocol) servers and managing tools')
    .setVersion('1.0')
    .addTag('mcp', 'MCP Server Operations')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'MCP Client API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 MCP Client Server is running on: http://localhost:${port}`);
  logger.log(`📡 API Endpoint: http://localhost:${port}/mcp/tools`);
  logger.log(`📖 Swagger Documentation: http://localhost:${port}/api`);
  logger.log(`🔐 OAuth Helper: http://localhost:${port}/oauth/oauth-asana.html`);
}

bootstrap();
