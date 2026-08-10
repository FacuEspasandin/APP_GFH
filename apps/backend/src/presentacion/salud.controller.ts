import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { PrismaService } from '../infraestructura/prisma/prisma.service';

/**
 * Chequeo de salud para el host donde corre el backend.
 *
 * Sin autenticar y sin rate limit: lo llama la infraestructura, no la app, y
 * suele hacerlo cada pocos segundos. Un 401 o un 429 acá se leen como "el
 * servicio está caído" y disparan un reinicio en loop.
 *
 * Consulta la base a propósito. Un endpoint que sólo devuelve `{ok:true}`
 * responde igual con la base caída, y entonces el host cree que todo anda
 * mientras ninguna pantalla carga.
 */
@Controller('salud')
@SkipThrottle()
export class SaludController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async estado() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { estado: 'ok', versión: process.env.npm_package_version ?? 'dev' };
  }
}
