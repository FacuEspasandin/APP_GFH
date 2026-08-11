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
  //
  // Los métodos van explícitos porque el adaptador de Fastify no incluye PATCH
  // por defecto, y la app usa PATCH para todo lo que edita: paciente, datos
  // renales, embarazo, prescripción, configuración. El teléfono no hace
  // preflight así que nunca se notó desde ahí — pero significaba que ninguna
  // edición se podía verificar desde un navegador.
  app.enableCors({
    origin: process.env.CORS_ORIGENES?.split(',') ?? false,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const puerto = Number(process.env.PORT ?? 3000);
  await app.listen(puerto, '0.0.0.0');
  new Logger('bootstrap').log(`Backend escuchando en http://localhost:${puerto}`);
}

void bootstrap();
