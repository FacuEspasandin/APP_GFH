import {
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

import { AuthService } from '../aplicacion/auth/auth.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import {
  AceptarDisclaimerDto,
  CambiarPasswordDto,
  LoginDto,
  RefreshDto,
  RegistroDto,
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
    return this.auth.login(dto.identificador, dto.password, dto.dispositivoInfo);
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
  sesiones(@MedicoActual() medicoId: string) {
    return this.auth.sesionesActivas(medicoId);
  }

  @Delete('sesiones/:id')
  @HttpCode(204)
  @UseGuards(JwtGuard)
  revocarSesion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.auth.revocarSesion(medicoId, id);
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
}
