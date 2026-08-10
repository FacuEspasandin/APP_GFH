import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // La misma configuración que usan los tests de integración: si divergen, los
  // tests dejan de probar lo que corre en producción.
  configurarApp(app);

  // CORS restringido: sin esto queda abierto a cualquier origen.
  app.enableCors({
    origin: process.env.CORS_ORIGENES?.split(',') ?? false,
    credentials: true,
  });

  const puerto = Number(process.env.PORT ?? 3000);
  await app.listen(puerto, '0.0.0.0');
  new Logger('bootstrap').log(`Backend escuchando en http://localhost:${puerto}`);
}

void bootstrap();
