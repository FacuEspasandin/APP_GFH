import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum ViaDto {
  NO_ESPECIFICADA = 'NO_ESPECIFICADA',
  ORAL = 'ORAL',
  IV = 'IV',
  SC = 'SC',
  IM = 'IM',
  TOPICA = 'TOPICA',
  INHALATORIA = 'INHALATORIA',
  SUBLINGUAL = 'SUBLINGUAL',
  RECTAL = 'RECTAL',
  VAGINAL = 'VAGINAL',
  NASAL = 'NASAL',
  TRANSDERMICA = 'TRANSDERMICA',
  OFTALMICA = 'OFTALMICA',
  OTICA = 'OTICA',
  INTRAOCULAR = 'INTRAOCULAR',
  OTRA = 'OTRA',
}

export class CrearPrescripcionDto {
  /** Producto comercial del catálogo. Ausente solo si es fármaco libre. */
  @ValidateIf((o: CrearPrescripcionDto) => !o.esFarmacoLibre)
  @IsUUID()
  productoComercialId?: string;

  @IsOptional() @IsBoolean() esFarmacoLibre?: boolean;

  @ValidateIf((o: CrearPrescripcionDto) => o.esFarmacoLibre === true)
  @IsString()
  @Length(2, 120)
  nombreLibre?: string;

  @IsString() @Length(1, 60) dosis!: string;
  @IsString() @Length(1, 60) frecuencia!: string;
  @IsEnum(ViaDto) via!: ViaDto;
  @IsOptional() @IsString() @Length(1, 160) indicacion?: string;

  /** El cliente reintenta con esto en true tras ver el 409 de alergia cruzada. */
  @IsOptional() @IsBoolean() confirmarAlergiaCruzada?: boolean;
}

export class ActualizarPrescripcionDto {
  @IsOptional() @IsString() @Length(1, 60) dosis?: string;
  @IsOptional() @IsString() @Length(1, 60) frecuencia?: string;
  @IsOptional() @IsEnum(ViaDto) via?: ViaDto;
  @IsOptional() @IsString() @Length(1, 160) indicacion?: string;
  @IsOptional() @IsEnum(['ACTIVO', 'SUSPENDIDO', 'FINALIZADO']) estado?: string;
}

export class AgregarCondicionDto {
  @IsUUID() condicionClinicaId!: string;
  @IsOptional() @IsString() @Length(1, 200) observaciones?: string;
}

export class AgregarAlergiaDto {
  @IsEnum(['FARMACOLOGICA', 'GENERAL']) tipo!: 'FARMACOLOGICA' | 'GENERAL';
  @IsEnum(['LEVE', 'MODERADA', 'GRAVE']) severidad!: 'LEVE' | 'MODERADA' | 'GRAVE';
  @ValidateIf((o: AgregarAlergiaDto) => o.tipo === 'FARMACOLOGICA')
  @IsUUID()
  principioActivoId?: string;
  /** Texto libre de la alergia GENERAL. Se intenta mapear a un grupo; si no
   *  matchea se registra igual, solo que no cruza. Nunca se inventa familia. */
  @ValidateIf((o: AgregarAlergiaDto) => o.tipo === 'GENERAL')
  @IsString()
  @Length(2, 120)
  descripcion?: string;
}

export class DatosRenalesDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) pesoKg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(30) creatininaMgDl?: number;
  /** Si viene, pisa al calculado — el médico siempre puede sobreescribir. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(300) clcrMlMin?: number;
}

// --- herramientas standalone -------------------------------------------------
// No persisten nada: son puro cálculo sin estado (modelo §5).

export class HerramientaInteraccionesDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  principioActivoIds!: string[];
}

export class HerramientaCondicionAlergiaDto {
  @IsUUID() principioActivoId!: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) condicionIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) grupoAlergenicoIds?: string[];
  @IsOptional() @IsEnum(['LEVE', 'MODERADA', 'GRAVE']) severidadAlergia?: 'LEVE' | 'MODERADA' | 'GRAVE';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(45) semanaGestacion?: number;
}

export class HerramientaRenalDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsUUID('4', { each: true })
  principioActivoIds!: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(300) clcrMlMin?: number;

  // Alternativa: los datos para calcularlo.
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(120) edadAnios?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) pesoKg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(30) creatininaMgDl?: number;
  @IsOptional() @IsEnum(['M', 'F', 'OTRO']) sexo?: 'M' | 'F' | 'OTRO';
}
