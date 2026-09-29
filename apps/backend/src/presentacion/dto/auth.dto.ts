import { ESPECIALIDADES } from '@gfh/shared-types';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

/** Lo declara la app al iniciar sesión; sin valor se asume teléfono. */
export const TIPOS_DISPOSITIVO = { TELEFONO: 'TELEFONO', TABLET: 'TABLET' } as const;
export type TipoDispositivoDto = (typeof TIPOS_DISPOSITIVO)[keyof typeof TIPOS_DISPOSITIVO];

export class RegistroDto {
  @IsEmail({}, { message: 'El email no es válido.', context: { propio: true } })
  email!: string;

  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'El nombre de usuario solo admite letras, números, punto, guion y guion bajo.',
    context: { propio: true },
  })
  nombreUsuario!: string;

  /** 10 caracteres mínimo: la longitud protege más que exigir símbolos raros
   *  que el médico va a terminar anotando en un papel. */
  @IsString()
  @MinLength(10, { message: 'La contraseña necesita al menos 10 caracteres.', context: { propio: true } })
  @MaxLength(128, { message: 'La contraseña admite hasta 128 caracteres.', context: { propio: true } })
  password!: string;

  @IsString() @Length(1, 80) nombre!: string;
  @IsString() @Length(1, 80) apellido!: string;
  @IsOptional()
  @IsIn(ESPECIALIDADES, { message: 'Especialidad no reconocida.', context: { propio: true } })
  especialidad?: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
  @IsOptional() @IsEnum(TIPOS_DISPOSITIVO) tipoDispositivo?: TipoDispositivoDto;
}

export class LoginDto {
  /** Email o nombre de usuario: el backend resuelve cuál es. */
  @IsString() @Length(3, 120) identificador!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
  @IsOptional() @IsEnum(TIPOS_DISPOSITIVO) tipoDispositivo?: TipoDispositivoDto;
}

export class GoogleLoginDto {
  @IsString() @MinLength(20) @MaxLength(4096) idToken!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
  @IsOptional() @IsEnum(TIPOS_DISPOSITIVO) tipoDispositivo?: TipoDispositivoDto;
}

export class RefreshDto {
  @IsString() @MinLength(20) @MaxLength(512) refreshToken!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
}

export class CambiarPasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) actual!: string;
  @IsString() @MinLength(10) @MaxLength(128) nueva!: string;
}

export class AceptarDisclaimerDto {
  @IsString() @Length(1, 20) version!: string;
}

export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'El email no es válido.', context: { propio: true } })
  email!: string;
}

export class ConfirmarRecuperacionDto {
  @IsEmail({}, { message: 'El email no es válido.', context: { propio: true } })
  email!: string;

  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos.', context: { propio: true } })
  codigo!: string;

  @IsString() @MinLength(10, { message: 'La contraseña necesita al menos 10 caracteres.', context: { propio: true } })
  @MaxLength(128, { message: 'La contraseña admite hasta 128 caracteres.', context: { propio: true } })
  nueva!: string;
}
