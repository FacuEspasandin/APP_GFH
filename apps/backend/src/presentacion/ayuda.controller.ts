import { Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';

import { AyudaService } from '../aplicacion/ayuda/ayuda.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual } from './comun/medico-actual';

export class ReportarProblemaDto {
  @IsString() @Length(1, 80) nombre!: string;
  @IsString() @Length(1, 80) apellido!: string;
  @IsString() @Length(1, 30) telefono!: string;
  @IsEmail() correo!: string;
  @IsEnum(['ERROR', 'SUGERENCIA']) tipo!: 'ERROR' | 'SUGERENCIA';
  @IsString() @Length(1, 2000) descripcion!: string;
}

/** Preguntas frecuentes, problemas comunes y reporte de errores/sugerencias.
 *  Ver `AyudaService` para por qué el contenido vive en `docs/data/` y no en
 *  el bundle del móvil. */
@Controller('ayuda')
@UseGuards(JwtGuard)
export class AyudaController {
  constructor(@Inject(AyudaService) private readonly ayuda: AyudaService) {}

  @Get('faq')
  faq() {
    return this.ayuda.obtenerFaq();
  }

  @Get('problemas')
  problemas() {
    return this.ayuda.obtenerProblemas();
  }

  /** Mismo límite que `eliminar-cuenta` en `PerfilController`: una acción que
   *  no debería repetirse muchas veces por minuto desde la misma cuenta. */
  @Post('reportes')
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  reportar(@MedicoActual() medicoId: string, @Cuerpo(ReportarProblemaDto) dto: ReportarProblemaDto) {
    return this.ayuda.enviarReporte(medicoId, dto);
  }
}
