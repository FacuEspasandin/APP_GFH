import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { HashService } from '../aplicacion/auth/hash.service';
import { PerfilService } from '../aplicacion/perfil/perfil.service';
import { SuscripcionService, type EventoRevenueCat } from '../aplicacion/suscripcion/suscripcion.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual } from './comun/medico-actual';

export class ConfiguracionDto {
  @IsOptional() @IsEnum(['CLARO', 'OSCURO', 'SISTEMA']) tema?: 'CLARO' | 'OSCURO' | 'SISTEMA';
  @IsOptional() @IsBoolean() notificacionesPush?: boolean;
  /** 65 es el corte de la literatura; en geriatría todos lo superan y la
   *  alerta se vuelve ruido. Por eso es configurable. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(40) @Max(100) umbralAdultoMayor?: number;
}

export class DatosMedicoDto {
  @IsOptional() @IsString() @Length(1, 80) nombre?: string;
  @IsOptional() @IsString() @Length(1, 80) apellido?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class EliminarCuentaDto {
  @IsString() @Length(1, 200) password!: string;
}

@Controller('perfil')
@UseGuards(JwtGuard)
export class PerfilController {
  constructor(
    @Inject(PerfilService) private readonly perfil: PerfilService,
    @Inject(SuscripcionService) private readonly suscripcion: SuscripcionService,
    @Inject(HashService) private readonly hash: HashService,
  ) {}

  @Get('configuracion')
  configuracion(@MedicoActual() medicoId: string) {
    return this.perfil.configuracion(medicoId);
  }

  @Patch('configuracion')
  guardarConfiguracion(@MedicoActual() medicoId: string, @Cuerpo(ConfiguracionDto) dto: ConfiguracionDto) {
    return this.perfil.actualizarConfiguracion(medicoId, dto);
  }

  @Patch('datos')
  datos(@MedicoActual() medicoId: string, @Cuerpo(DatosMedicoDto) dto: DatosMedicoDto) {
    return this.perfil.actualizarDatos(medicoId, dto);
  }

  @Get('suscripcion')
  estadoSuscripcion(@MedicoActual() medicoId: string) {
    return this.suscripcion.estado(medicoId);
  }

  /** Pide la contraseña: es irreversible desde el punto de vista del usuario. */
  @Post('eliminar-cuenta')
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  async eliminar(@MedicoActual() medicoId: string, @Cuerpo(EliminarCuentaDto) dto: EliminarCuentaDto) {
    await this.perfil.eliminarCuenta(medicoId, dto.password, (hash) =>
      this.hash.verificarPassword(dto.password, hash),
    );
  }

  @Get('pacientes/:id/condiciones-alergias')
  condicionesYAlergias(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
  ) {
    return this.perfil.condicionesYAlergias(medicoId, pacienteId);
  }
}

/**
 * Webhook de RevenueCat.
 *
 * SIN guard de JWT: lo llama RevenueCat, no la app. Se autentica con el header
 * `Authorization` que se configura en su panel — un secreto compartido.
 *
 * Sin rate limit: RevenueCat reintenta ante fallos y limitarlo produciría
 * eventos perdidos, que es peor que un pico de tráfico. La idempotencia por
 * `ultimoEventoId` cubre los reintentos.
 */
@Controller('webhooks/revenuecat')
@SkipThrottle()
export class RevenueCatController {
  constructor(@Inject(SuscripcionService) private readonly suscripcion: SuscripcionService) {}

  @Post()
  @HttpCode(200)
  async recibir(
    @Headers('authorization') autorizacion: string | undefined,
    // Sin validar a propósito: es un cuerpo de RevenueCat, no nuestro. Lo
    // autentica la firma del header, y `forbidNonWhitelisted` rechazaría
    // cualquier campo que agreguen de su lado.
    @Body() cuerpo: EventoRevenueCat,
  ) {
    const esperado = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
    if (!esperado) {
      // Sin secreto configurado no se procesa nada: un webhook abierto deja que
      // cualquiera se regale una suscripción.
      throw new UnauthorizedException('Webhook no configurado.');
    }
    if (autorizacion !== esperado) {
      throw new UnauthorizedException('Firma inválida.');
    }

    // Siempre 200, incluso si el evento no aplica: un 4xx hace que RevenueCat
    // reintente para siempre un evento que nunca vamos a poder procesar.
    return this.suscripcion.procesarWebhook(cuerpo);
  }
}
