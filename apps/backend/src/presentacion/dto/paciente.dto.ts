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

export class ActualizarPacienteDto extends CrearPacienteDto {}

export class CrearGrupoDto {
  @IsString() @Length(1, 60) nombre!: string;
}
