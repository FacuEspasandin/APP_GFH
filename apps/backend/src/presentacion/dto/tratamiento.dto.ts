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

/**
 * Los cinco criterios de Child-Pugh, todos opcionales.
 *
 * Opcionales porque la pantalla guarda lo que haya: un paciente al que todavía
 * no le llegó el INR igual tiene bilirrubina y albúmina cargadas, y perderlas
 * hasta que llegue el tercer valor no ayuda a nadie. La clase se calcula sólo
 * cuando están los cinco.
 *
 * **Los tres de laboratorio llegan como PUNTOS**, de 1 a 3. La escala no
 * distingue una bilirrubina de 2,4 de una de 2,9 —las dos son «2 – 3»— así que
 * la pantalla se contesta tocando la banda y no escribiendo el número.
 *
 * El valor exacto sigue aceptándose y no decide nada: se guarda para que el
 * historial pueda decir «2,4 → 3,1 mg/dL». Las unidades son las del esquema
 * —mg/dL y g/dL—; la conversión desde µmol/L y g/L la hace el cliente, que es
 * donde el médico elige la unidad.
 */
export class DatosHepaticosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3) bilirrubinaPuntos?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3) albuminaPuntos?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3) inrPuntos?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(80) bilirrubinaMgDl?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(10) albuminaGDl?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(20) inr?: number;
  @IsOptional() @IsEnum(['AUSENTE', 'LEVE', 'MODERADA_SEVERA']) ascitis?: 'AUSENTE' | 'LEVE' | 'MODERADA_SEVERA';
  @IsOptional() @IsEnum(['AUSENTE', 'GRADO_1_2', 'GRADO_3_4']) encefalopatia?: 'AUSENTE' | 'GRADO_1_2' | 'GRADO_3_4';
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

/**
 * La herramienta suelta: mismos criterios, sin paciente y sin guardar nada.
 * Se declara aparte del DTO del paciente a propósito — si mañana el de
 * paciente suma un campo, la herramienta no tiene por qué heredarlo.
 */
export class HerramientaHepaticaDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(80) bilirrubinaMgDl?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) @Max(10) albuminaGDl?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(20) inr?: number;
  @IsOptional() @IsEnum(['AUSENTE', 'LEVE', 'MODERADA_SEVERA']) ascitis?: 'AUSENTE' | 'LEVE' | 'MODERADA_SEVERA';
  @IsOptional() @IsEnum(['AUSENTE', 'GRADO_1_2', 'GRADO_3_4']) encefalopatia?: 'AUSENTE' | 'GRADO_1_2' | 'GRADO_3_4';
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
