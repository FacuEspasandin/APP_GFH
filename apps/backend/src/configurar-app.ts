import { ValidationPipe } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import { FiltroPrisma } from './presentacion/comun/filtro-prisma';
import { fabricaDeErroresDeValidacion } from './presentacion/comun/mensajes-validacion';
import { EnvolturaRespuestaInterceptor, FiltroExcepciones } from './presentacion/comun/respuesta';

/**
 * Configuración global de la app.
 *
 * Vive acá y no en `main.ts` porque los tests de integración tienen que
 * levantar EXACTAMENTE la misma app que producción. Si los pipes, filtros e
 * interceptores se configuraran sólo en el arranque, los tests correrían contra
 * una app distinta y no verían nada de lo que pasa en esa capa — que es
 * justamente donde aparecieron los últimos tres errores: un filtro que
 * aplastaba los códigos propios, un `content-type` que rompía los DELETE, y una
 * validación que no plegaba tildes.
 */
export function configurarApp(app: NestFastifyApplication): void {
  // Cubre query y params. Los cuerpos NO pasan por acá: van por `@Cuerpo(Dto)`,
  // que declara el tipo explícitamente porque este pipe no puede deducirlo sin
  // la metadata de decoradores que nuestro runtime no emite — ver `comun/cuerpo.ts`.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que el DTO no declara
      forbidNonWhitelisted: true, // y avisa en vez de ignorarlos en silencio
      transform: true,
      exceptionFactory: fabricaDeErroresDeValidacion,
    }),
  );

  app.useGlobalInterceptors(new EnvolturaRespuestaInterceptor());

  // El orden importa: Nest prueba los filtros globales del último al primero,
  // así que el de Prisma —que sólo atrapa sus propios errores— tiene que ir
  // después del genérico para verlos antes que él.
  app.useGlobalFilters(new FiltroExcepciones(), new FiltroPrisma());
}
