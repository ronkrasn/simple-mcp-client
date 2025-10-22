import 'reflect-metadata';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // SSL Configuration
  const sslEnabled = process.env.SSL_ENABLED === 'true';
  const certPath = process.env.SSL_CERT_PATH || join(__dirname, '../../certs/cert.pem');
  const keyPath = process.env.SSL_KEY_PATH || join(__dirname, '../../certs/key.pem');

  let httpsOptions = undefined;

  if (sslEnabled && existsSync(certPath) && existsSync(keyPath)) {
    httpsOptions = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    };
    logger.log('🔒 SSL/HTTPS is enabled');
  } else if (sslEnabled) {
    logger.warn('⚠️  SSL_ENABLED is true but certificate files not found. Falling back to HTTP.');
    logger.warn(`   Expected cert at: ${certPath}`);
    logger.warn(`   Expected key at: ${keyPath}`);
  } else {
    logger.log('🔓 Running in HTTP mode (SSL disabled)');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    httpsOptions,
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

  const protocol = sslEnabled && httpsOptions ? 'https' : 'http';
  logger.log(`🚀 MCP Client Server is running on: ${protocol}://localhost:${port}`);
  logger.log(`📡 API Endpoint: ${protocol}://localhost:${port}/mcp/tools`);
  logger.log(`📖 Swagger Documentation: ${protocol}://localhost:${port}/api`);
  logger.log(`🔐 OAuth Helper: ${protocol}://localhost:${port}/oauth/oauth-asana.html`);
}

bootstrap();
