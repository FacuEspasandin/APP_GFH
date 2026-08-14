import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AlternativasService } from './aplicacion/alternativas/alternativas.service';
import { AuthService } from './aplicacion/auth/auth.service';
import { HashService } from './aplicacion/auth/hash.service';
import { CatalogoService } from './aplicacion/catalogo/catalogo.service';
import { CockpitService } from './aplicacion/cockpit/cockpit.service';
import { FotoService } from './aplicacion/foto/foto.service';
import { HerramientasService } from './aplicacion/herramientas/herramientas.service';
import { PerfilService } from './aplicacion/perfil/perfil.service';
import { SuscripcionService } from './aplicacion/suscripcion/suscripcion.service';
import { DemoService } from './aplicacion/demo/demo.service';
import { EventosService } from './aplicacion/historial/eventos.service';
import { PacientesService } from './aplicacion/pacientes/pacientes.service';
import { TratamientoService } from './aplicacion/tratamiento/tratamiento.service';
import { CatalogoInteraccionesService } from './infraestructura/catalogo/catalogo-interacciones.service';
import { PurgaSesionesService } from './infraestructura/mantenimiento/purga-sesiones.service';
import { PrismaModule } from './infraestructura/prisma/prisma.module';
import { AlternativasController } from './presentacion/alternativas.controller';
import { AuthController } from './presentacion/auth.controller';
import { CockpitController } from './presentacion/cockpit.controller';
import { PacientesController } from './presentacion/pacientes.controller';
import { PerfilController, RevenueCatController } from './presentacion/perfil.controller';
import { SaludController } from './presentacion/salud.controller';
import { SuscripcionGuard } from './presentacion/comun/suscripcion.guard';
import {
  CatalogoController,
  HerramientasController,
  TratamientoController,
} from './presentacion/tratamiento.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: exigirSecreto(),
      // El tipo de `expiresIn` es una plantilla literal ("15m", "1h"…), así que
      // una variable de entorno no encaja sin afirmarlo.
      signOptions: { expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as `${number}m` },
    }),
    // Rate limiting global; login/registro/refresh lo ajustan hacia abajo con
    // @Throttle en su propio controlador.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    SaludController,
    AuthController,
    PacientesController,
    CockpitController,
    TratamientoController,
    CatalogoController,
    HerramientasController,
    AlternativasController,
    PerfilController,
    RevenueCatController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    CatalogoInteraccionesService,
    HashService,
    AuthService,
    CockpitService,
    DemoService,
    EventosService,
    PacientesService,
    TratamientoService,
    CatalogoService,
    HerramientasService,
    AlternativasService,
    FotoService,
    PerfilService,
    SuscripcionService,
    SuscripcionGuard,
    PurgaSesionesService,
  ],
})
export class AppModule {}

/**
 * Sin secreto no se arranca. Un default en el código es un backend firmando
 * tokens con una clave pública de hecho — y nadie se entera hasta que alguien
 * se emite un token de otro médico.
 */
function exigirSecreto(): string {
  const secreto = process.env.JWT_ACCESS_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET falta o es demasiado corto (mínimo 32 caracteres). ' +
        'Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return secreto;
}
