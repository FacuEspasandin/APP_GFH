import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

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
  password!: string;

  @IsString() @Length(1, 80) nombre!: string;
  @IsString() @Length(1, 80) apellido!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
}

export class LoginDto {
  /** Email o nombre de usuario: el backend resuelve cuál es. */
  @IsString() @Length(3, 120) identificador!: string;
  @IsString() @MinLength(1) password!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
}

export class RefreshDto {
  @IsString() @MinLength(20) refreshToken!: string;
  @IsOptional() @IsString() @Length(1, 120) dispositivoInfo?: string;
}

export class CambiarPasswordDto {
  @IsString() @MinLength(1) actual!: string;
  @IsString() @MinLength(10) nueva!: string;
}

export class AceptarDisclaimerDto {
  @IsString() @Length(1, 20) version!: string;
}
