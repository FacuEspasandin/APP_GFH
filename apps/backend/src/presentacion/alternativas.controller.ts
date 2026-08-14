import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

import { AlternativasService } from '../aplicacion/alternativas/alternativas.service';
import { FotoService } from '../aplicacion/foto/foto.service';
import { Cuerpo } from './comun/cuerpo';
import { DePago } from './comun/requiere-suscripcion';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { SuscripcionGuard } from './comun/suscripcion.guard';

export class ReemplazoDto {
  /** La dosis la decide el médico: el catálogo no la tiene y el sistema no la
   *  puede inventar. */
  @IsString() @Length(1, 60) dosis!: string;
  @IsString() @Length(1, 60) frecuencia!: string;
  @IsString() @Length(1, 20) via!: string;
}

export class AceptarAlternativaDto {
  @IsUUID() paOrigenId!: string;
  @IsUUID() paAlternativaId!: string;
  @IsOptional() @IsUUID() prescripcionOrigenId?: string;
  @IsString() @Length(1, 20) disclaimerVersion!: string;
  @IsOptional() @IsString() @Length(1, 300) nota?: string;
  /** Sin esto sólo se documenta la decisión y la medicación no cambia. */
  @IsOptional() @ValidateNested() @Type(() => ReemplazoDto) reemplazo?: ReemplazoDto;
}

export class MatchearLineasDto {
  @IsArray() @IsString({ each: true }) textos!: string[];
}

export class FotoDto {
  @IsString() imagenBase64!: string;
}

/** Las alternativas terapéuticas y la carga por foto son de paciente: el
 *  controlador entero va del otro lado del muro. */
@DePago('Las alternativas terapéuticas')
@Controller('pacientes/:pacienteId')
@UseGuards(JwtGuard, SuscripcionGuard)
export class AlternativasController {
  constructor(
    @Inject(AlternativasService) private readonly alternativas: AlternativasService,
    @Inject(FotoService) private readonly foto: FotoService,
  ) {}

  /**
   * Alternativas para una prescripción. Excluye de la comparación el propio
   * fármaco que se reemplaza: no tiene sentido avisar que la alternativa
   * interactúa con lo que viene a reemplazar.
   */
  @Get('prescripciones/:prescripcionId/alternativas')
  paraPrescripcion(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', new ParseUUIDPipe()) pacienteId: string,
    @Param('prescripcionId', new ParseUUIDPipe()) prescripcionId: string,
  ) {
    return this.alternativas.paraPrescripcion(medicoId, pacienteId, prescripcionId);
  }

  /** Alternativas para un candidato que todavía no es prescripción. */
  @Get('alternativas')
  paraCandidato(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', new ParseUUIDPipe()) pacienteId: string,
    @Query('principioActivoId', new ParseUUIDPipe()) principioActivoId: string,
  ) {
    return this.alternativas.paraCandidato(medicoId, pacienteId, principioActivoId);
  }

  @Post('alternativas-aceptadas')
  aceptar(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(AceptarAlternativaDto) dto: AceptarAlternativaDto,
  ) {
    return this.alternativas.aceptar(medicoId, pacienteId, dto);
  }

  @Get('alternativas-aceptadas')
  listarAceptadas(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', new ParseUUIDPipe()) pacienteId: string,
  ) {
    return this.alternativas.aceptadas(medicoId, pacienteId);
  }

  /**
   * Matcheo de líneas de texto contra el catálogo. Es el paso 2 del flujo de
   * carga por foto, y funciona sin proveedor de visión: sirve para que el
   * médico pegue un listado escrito y lo revise línea por línea.
   */
  @Post('lineas/matchear')
  matchear(@Cuerpo(MatchearLineasDto) dto: MatchearLineasDto) {
    return this.foto.matchearLineas(dto.textos);
  }

  /**
   * Reconocimiento de la foto. La imagen se procesa en memoria y se descarta;
   * no se persiste nunca. Sin proveedor configurado responde 501 con el motivo
   * — nunca una lista vacía, que se leería como "la foto no tenía nada".
   */
  @Post('foto')
  procesarFoto(@Cuerpo(FotoDto) dto: FotoDto) {
    return this.foto.extraer(dto.imagenBase64);
  }
}
