import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export enum SexoDto {
  M = 'M',
  F = 'F',
  OTRO = 'OTRO',
}

/**
 * Los rangos replican los del motor §4.1. Validar acá evita que un dato
 * imposible llegue a la fórmula, pero NO reemplaza la validación del dominio:
 * `calcularClcr` vuelve a chequear, porque también lo llaman las herramientas
 * standalone y el importador.
 */
export class CrearPacienteDto {
  @IsString() @Length(1, 80) nombre!: string;
  @IsString() @Length(1, 80) apellido!: string;
  @IsOptional() @IsString() @Length(1, 40) documento?: string;
  @IsDateString() fechaNacimiento!: string;
  @IsEnum(SexoDto) sexo!: SexoDto;

  @IsOptional() @IsUUID() grupoId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(260) alturaCm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) pesoKg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(30) creatininaMgDl?: number;

  /** Si viene, pisa al calculado: el médico siempre puede sobreescribir. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(300) clcrMlMin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(45) semanaGestacion?: number;
  @IsOptional() @IsBoolean() estaLactando?: boolean;
}

/**
 * Un PATCH manda sólo lo que cambia.
 *
 * Heredaba de `CrearPacienteDto` tal cual, así que exigía nombre, apellido,
 * fecha y sexo en cada actualización: mandar sólo la semana de gestación daba
 * 400. La pantalla de editar los mandaba todos para esquivarlo, y eso —sumado
 * a que el servicio traducía cada campo ausente a `null`— borraba peso,
 * creatinina, Clcr y embarazo al cambiar un apellido.
 *
 * No se hereda con `PartialType`: `@nestjs/mapped-types` no está instalado y
 * la lista es corta. Los rangos se repiten a propósito — son la misma regla de
 * negocio y tienen que fallar igual por los dos caminos.
 */
export class ActualizarPacienteDto {
  @IsOptional() @IsString() @Length(1, 80) nombre?: string;
  @IsOptional() @IsString() @Length(1, 80) apellido?: string;
  @IsOptional() @IsString() @Length(1, 40) documento?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsEnum(SexoDto) sexo?: SexoDto;

  @IsOptional() @IsUUID() grupoId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(260) alturaCm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) pesoKg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(30) creatininaMgDl?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(300) clcrMlMin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(45) semanaGestacion?: number;
  @IsOptional() @IsBoolean() estaLactando?: boolean;
}

export class CrearGrupoDto {
  @IsString() @Length(1, 60) nombre!: string;
}
