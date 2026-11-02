import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TIPOS_CONSENTIMIENTO, type TipoConsentimiento } from '@gfh/shared-types';

import { AuthService } from '../aplicacion/auth/auth.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual, SesionActual } from './comun/medico-actual';
import {
  AceptarConsentimientoDto,
  AceptarDisclaimerDto,
  CambiarPasswordDto,
  ConfirmarRecuperacionDto,
  GoogleLoginDto,
  LoginDto,
  RefreshDto,
  RegistroDto,
  SolicitarRecuperacionDto,
} from './dto/auth.dto';

/**
 * Los endpoints sin autenticar llevan rate limiting propio y más estricto que
 * el global: son la superficie donde se prueban contraseñas.
 */
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('registro')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registro(@Cuerpo(RegistroDto) dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Cuerpo(LoginDto) dto: LoginDto) {
    return this.auth.login(dto.identificador, dto.password, dto.dispositivoInfo, dto.tipoDispositivo);
  }

  @Post('google')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  google(@Cuerpo(GoogleLoginDto) dto: GoogleLoginDto) {
    return this.auth.loginConGoogle(dto.idToken, dto.dispositivoInfo, dto.tipoDispositivo);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Cuerpo(RefreshDto) dto: RefreshDto) {
    return this.auth.refrescar(dto.refreshToken, dto.dispositivoInfo);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  logout(@MedicoActual() medicoId: string, @Cuerpo(RefreshDto) dto: RefreshDto) {
    return this.auth.logout(medicoId, dto.refreshToken);
  }

  @Get('yo')
  @UseGuards(JwtGuard)
  yo(@MedicoActual() medicoId: string) {
    return this.auth.perfil(medicoId);
  }

  @Get('sesiones')
  @UseGuards(JwtGuard)
  sesiones(@MedicoActual() medicoId: string, @SesionActual() sesionId?: string) {
    return this.auth.sesionesActivas(medicoId, sesionId);
  }

  @Delete('sesiones/:id')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  revocarSesion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @SesionActual() sesionId?: string,
  ) {
    return this.auth.revocarSesion(medicoId, id, sesionId);
  }

  /**
   * Siempre 204, exista o no la cuenta — ver el comentario de
   * `solicitarRecuperacion` en el servicio. El límite es más estricto que
   * login porque además dispara un envío de email real.
   */
  @Post('recuperar')
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  recuperar(@Cuerpo(SolicitarRecuperacionDto) dto: SolicitarRecuperacionDto) {
    return this.auth.solicitarRecuperacion(dto.email);
  }

  @Post('recuperar/confirmar')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirmarRecuperacion(@Cuerpo(ConfirmarRecuperacionDto) dto: ConfirmarRecuperacionDto) {
    return this.auth.confirmarRecuperacion(dto.email, dto.codigo, dto.nueva);
  }

  @Post('password')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  cambiarPassword(@MedicoActual() medicoId: string, @Cuerpo(CambiarPasswordDto) dto: CambiarPasswordDto) {
    return this.auth.cambiarPassword(medicoId, dto.actual, dto.nueva);
  }

  @Post('disclaimer')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  aceptarDisclaimer(@MedicoActual() medicoId: string, @Cuerpo(AceptarDisclaimerDto) dto: AceptarDisclaimerDto) {
    return this.auth.aceptarDisclaimer(medicoId, dto.version);
  }

  /** Acepta un texto (términos, Vera, fotos) y guarda cuál versión. */
  @Post('consentimientos')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  aceptarConsentimiento(
    @MedicoActual() medicoId: string,
    @Cuerpo(AceptarConsentimientoDto) dto: AceptarConsentimientoDto,
  ) {
    return this.auth.aceptarConsentimiento(medicoId, dto.tipo, dto.version);
  }

  /** Retira el permiso de Vera o de fotos. Desde ese momento no se manda nada. */
  @Delete('consentimientos/:tipo')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  retirarConsentimiento(@MedicoActual() medicoId: string, @Param('tipo') tipo: string) {
    if (!(TIPOS_CONSENTIMIENTO as readonly string[]).includes(tipo)) {
      throw new BadRequestException('Consentimiento desconocido.');
    }
    return this.auth.retirarConsentimiento(medicoId, tipo as TipoConsentimiento);
  }
}
