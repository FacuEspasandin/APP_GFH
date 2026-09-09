import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

/**
 * Lo que se necesita del id_token de Google, ya verificado.
 *
 * `nombre`/`apellido` vienen del token: Google los manda siempre en el
 * primer login (a diferencia de Apple, que sólo manda el nombre completo la
 * primera vez que el usuario autoriza).
 */
export interface IdentidadGoogle {
  googleId: string;
  email: string;
  nombre: string;
  apellido: string;
}

/**
 * Verifica el id_token que manda la app contra la clave pública de Google.
 *
 * Aislado en su propio servicio (y no inline en `AuthService`) para poder
 * reemplazarlo por un doble en los tests de integración — no tiene sentido
 * pegarle a la red de Google en cada corrida de la suite.
 */
@Injectable()
export class GoogleAuthService {
  private readonly cliente = new OAuth2Client();

  async verificar(idToken: string): Promise<IdentidadGoogle> {
    // Los tres tipos de client id que puede traer el token, según si salió
    // del botón nativo en iOS, en Android, o de un flujo web. Se aceptan los
    // tres como audiencia válida; los que no estén configurados se ignoran.
    const audiencias = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].filter((v): v is string => Boolean(v));

    if (audiencias.length === 0) {
      throw new UnauthorizedException('El login con Google no está configurado.');
    }

    let payload;
    try {
      const ticket = await this.cliente.verifyIdToken({ idToken, audience: audiencias });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido.');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token de Google inválido.');
    }
    // Google no emite `email_verified: false` para cuentas normales, pero sí
    // puede pasar con dominios de G Suite mal configurados — no vale confiar
    // en un email que el propio Google no verificó.
    if (!payload.email_verified) {
      throw new UnauthorizedException('El email de la cuenta de Google no está verificado.');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      nombre: payload.given_name ?? 'Sin nombre',
      apellido: payload.family_name ?? '',
    };
  }
}
