import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DIAS_DE_GRACIA_BAJA } from '@gfh/shared-types';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'node:crypto';
import type { TipoDispositivo } from '@prisma/client';
import { Resend } from 'resend';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { PushService } from '../notificaciones/push.service';
import { GoogleAuthService } from './google-auth.service';
import { HashService } from './hash.service';

/** Lo que la app usa para distinguir «entraron desde otro dispositivo» de una
 *  sesión que simplemente venció: la primera se avisa, la segunda no. */
export const CODIGO_SESION_REEMPLAZADA = 'SESION_REEMPLAZADA';

/** Sin dominio propio todavía: mismo remitente de prueba que `AyudaService`. */
const REMITENTE_RECUPERACION = 'GFH <onboarding@resend.dev>';

/** Corto a propósito: 6 dígitos son pocos, así que dura poco y se prueba poco. */
const MINUTOS_CODIGO_RECUPERACION = 15;
const MAX_INTENTOS_CODIGO = 5;
const MAX_CODIGOS_POR_HORA = 5;
/** UUID que no existe: se consulta contra él para que una cuenta inexistente
 *  cueste lo mismo que una real. */
const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
  /** Sólo en `loginConGoogle`: si la cuenta se acaba de crear, la app tiene
   *  que mandar al disclaimer de primer ingreso en vez de ir directo a
   *  Inicio, igual que hace `registrar()`. */
  esNuevo?: boolean;
}

const DIAS_REFRESH = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HashService) private readonly hash: HashService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PushService) private readonly push: PushService,
    @Inject(GoogleAuthService) private readonly google: GoogleAuthService,
  ) {}

  async registrar(datos: {
    email: string;
    nombreUsuario: string;
    password: string;
    nombre: string;
    apellido: string;
    especialidad?: string;
    dispositivoInfo?: string;
    tipoDispositivo?: TipoDispositivo;
  }): Promise<ParDeTokens> {
    const email = datos.email.trim().toLowerCase();
    const nombreUsuario = datos.nombreUsuario.trim().toLowerCase();

    const yaExiste = await this.prisma.medico.findFirst({
      where: { OR: [{ email }, { nombreUsuario }] },
      select: { email: true },
    });
    if (yaExiste) {
      // Mensaje genérico: decir cuál de los dos está tomado permite enumerar
      // cuentas existentes.
      throw new ConflictException('Ese email o nombre de usuario ya está en uso.');
    }

    const medico = await this.prisma.medico.create({
      data: {
        email,
        nombreUsuario,
        passwordHash: await this.hash.hashearPassword(datos.password),
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        especialidad: datos.especialidad ?? null,
        rol: 'USER',
        configuracion: { create: {} },
      },
    });

    await this.auditar(medico.id, 'LOGIN', 'registro');
    return this.emitirTokens(medico.id, datos.dispositivoInfo, datos.tipoDispositivo ?? 'TELEFONO', true);
  }

  /**
   * Acepta email o nombre de usuario indistintamente: el backend resuelve cuál
   * de los dos matchea antes de validar la contraseña.
   */
  async login(
    identificador: string,
    password: string,
    dispositivoInfo?: string,
    tipoDispositivo: TipoDispositivo = 'TELEFONO',
  ): Promise<ParDeTokens> {
    const valor = identificador.trim().toLowerCase();
    const medico = await this.prisma.medico.findFirst({
      where: { OR: [{ email: valor }, { nombreUsuario: valor }] },
    });

    // Se verifica el hash incluso cuando el médico no existe, contra un hash
    // fijo, para que el tiempo de respuesta no revele si la cuenta existe.
    const hashAComparar = medico?.passwordHash ?? HASH_SENUELO;
    const passwordOk = await this.hash.verificarPassword(password, hashAComparar);

    if (!medico || !passwordOk) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }

    return this.finalizarLogin(medico, dispositivoInfo, tipoDispositivo);
  }

  /**
   * Login/registro con Google, en un solo paso — no hay pantalla de
   * "confirmar datos" intermedia, se entra directo con lo que Google ya
   * verificó.
   *
   * Resuelve la cuenta en este orden: por `googleId` (ya vinculada), si no
   * por `email` (cuenta con contraseña que ahora también entra por Google —
   * es seguro vincular así porque Google ya verificó ese email antes de
   * emitir el token), si no la crea.
   */
  async loginConGoogle(
    idToken: string,
    dispositivoInfo?: string,
    tipoDispositivo: TipoDispositivo = 'TELEFONO',
  ): Promise<ParDeTokens> {
    const identidad = await this.google.verificar(idToken);

    let medico = await this.prisma.medico.findUnique({ where: { googleId: identidad.googleId } });

    if (!medico) {
      const porEmail = await this.prisma.medico.findUnique({ where: { email: identidad.email } });
      if (porEmail) {
        medico = await this.prisma.medico.update({
          where: { id: porEmail.id },
          data: { googleId: identidad.googleId },
        });
      }
    }

    let esNuevo = false;
    if (!medico) {
      esNuevo = true;
      medico = await this.prisma.medico.create({
        data: {
          email: identidad.email,
          nombreUsuario: await this.nombreUsuarioLibre(identidad.email),
          passwordHash: null,
          googleId: identidad.googleId,
          nombre: identidad.nombre,
          apellido: identidad.apellido,
          rol: 'USER',
          configuracion: { create: {} },
        },
      });
    }

    const tokens = await this.finalizarLogin(
      medico,
      dispositivoInfo,
      tipoDispositivo,
      esNuevo ? 'registro con Google' : 'google',
    );
    return { ...tokens, esNuevo };
  }

  /**
   * Rotación: cada refresh emite una sesión nueva y revoca la anterior.
   *
   * Reuso de un refresh que YA fue rotado = señal de robo de token → se revocan
   * TODAS las sesiones del médico. Es agresivo a propósito: si el token viajó
   * a manos ajenas, no sabemos cuál de las dos partes es la legítima.
   *
   * Sólo cuenta como robo el reuso de un token rotado (`ROTADA`). Una sesión
   * cerrada por otro motivo —el médico salió, cambió la contraseña, o entró desde
   * otro dispositivo del mismo tipo (`REEMPLAZADA`)— intenta renovar de buena fe
   * y recibe un 401 sin más: tratarlo como robo cerraría también la sesión nueva
   * del médico legítimo cada vez que el dispositivo desplazado reintenta.
   *
   * La revocación de la sesión vieja es atómica (`updateMany` condicional): dos
   * renovaciones simultáneas con el mismo token no pueden ganar las dos.
   */
  async refrescar(refreshToken: string, dispositivoInfo?: string): Promise<ParDeTokens> {
    const hash = this.hash.hashearToken(refreshToken);
    const sesion = await this.prisma.sesion.findUnique({ where: { refreshTokenHash: hash } });

    if (!sesion) throw new UnauthorizedException('Sesión inválida.');

    if (sesion.revocadaAt !== null) {
      if (sesion.motivoRevocacion === 'REEMPLAZADA') {
        throw new UnauthorizedException({
          codigo: CODIGO_SESION_REEMPLAZADA,
          mensaje: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo del mismo tipo.',
        });
      }
      if (sesion.motivoRevocacion === 'CERRADA') {
        throw new UnauthorizedException('Sesión inválida.');
      }
      return this.reusoDeRefreshToken(sesion.medicoId);
    }

    if (sesion.expiraAt < new Date()) {
      throw new UnauthorizedException('La sesión expiró.');
    }

    const rotada = await this.prisma.sesion.updateMany({
      where: { id: sesion.id, revocadaAt: null },
      data: { revocadaAt: new Date(), motivoRevocacion: 'ROTADA' },
    });
    // Otra renovación con este mismo token llegó primero: es un reuso.
    if (rotada.count === 0) return this.reusoDeRefreshToken(sesion.medicoId);

    // Rotar no desplaza a nadie: la sesión nueva ocupa el lugar de la vieja.
    return this.emitirTokens(
      sesion.medicoId,
      dispositivoInfo ?? sesion.dispositivoInfo ?? undefined,
      sesion.tipoDispositivo,
      false,
    );
  }

  private async reusoDeRefreshToken(medicoId: string): Promise<never> {
    this.logger.warn(`Reuso de refresh token revocado — médico ${medicoId}`);
    await this.revocarTodas(medicoId);
    await this.auditar(medicoId, 'ERROR', 'reuso de refresh token revocado');
    throw new UnauthorizedException('Sesión inválida.');
  }

  async logout(medicoId: string, refreshToken: string): Promise<void> {
    const hash = this.hash.hashearToken(refreshToken);
    await this.prisma.sesion.updateMany({
      where: { refreshTokenHash: hash, medicoId, revocadaAt: null },
      data: { revocadaAt: new Date(), motivoRevocacion: 'CERRADA' },
    });
    await this.auditar(medicoId, 'LOGOUT');
  }

  /**
   * Perfil > Sesiones activas. Una fila por dispositivo con sesión viva.
   *
   * `sesionActualId` llega del `sid` del token. Con un token viejo viene
   * `undefined` y no se marca ninguna: es un estado transitorio que se corrige
   * solo en el primer refresh, y no marcar es mejor que marcar la equivocada.
   */
  async sesionesActivas(medicoId: string, sesionActualId?: string) {
    const sesiones = await this.prisma.sesion.findMany({
      where: { medicoId, revocadaAt: null, expiraAt: { gt: new Date() } },
      orderBy: { creadaAt: 'desc' },
      select: {
        id: true,
        dispositivoInfo: true,
        tipoDispositivo: true,
        creadaAt: true,
        ultimoUsoAt: true,
        expiraAt: true,
      },
    });
    return sesiones.map((s) => ({ ...s, esActual: s.id === sesionActualId }));
  }

  /**
   * Cierra UNA sesión, y nunca la propia.
   *
   * Cerrar la propia desde esta lista deja al médico afuera de la app sin
   * avisarle qué acaba de hacer, y con cara de error. Para eso está
   * «Cerrar sesión» en el perfil, que sí lo dice.
   */
  async revocarSesion(medicoId: string, sesionId: string, sesionActualId?: string): Promise<void> {
    if (sesionActualId && sesionId === sesionActualId) {
      throw new BadRequestException('Para cerrar esta sesión, usá «Cerrar sesión» en el perfil.');
    }
    await this.prisma.sesion.updateMany({
      where: { id: sesionId, medicoId, revocadaAt: null },
      data: { revocadaAt: new Date(), motivoRevocacion: 'CERRADA' },
    });
  }

  async cambiarPassword(medicoId: string, actual: string, nueva: string): Promise<void> {
    const medico = await this.prisma.medico.findUniqueOrThrow({ where: { id: medicoId } });
    if (medico.passwordHash === null) {
      throw new BadRequestException('Esta cuenta entra con Google. No tiene contraseña para cambiar.');
    }
    if (!(await this.hash.verificarPassword(actual, medico.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }
    await this.prisma.medico.update({
      where: { id: medicoId },
      data: { passwordHash: await this.hash.hashearPassword(nueva) },
    });
    // Cambiar la contraseña cierra todas las sesiones: si alguien más la tenía,
    // deja de tener acceso.
    await this.revocarTodas(medicoId);
    await this.auditar(medicoId, 'PASSWORD_CHANGE');
    // Se manda igual sin sesión activa: el token de push no depende del JWT,
    // y es justo la confirmación que el médico espera ver tras cambiarla.
    await this.push.enviarAMedico(medicoId, {
      titulo: 'Tu contraseña se actualizó',
      cuerpo: 'Si no fuiste vos, cambiala de nuevo y revisá tus sesiones activas.',
    });
  }

  /**
   * Pide un código de recuperación por email.
   *
   * Responde siempre lo mismo, exista o no la cuenta, y sin importar si el
   * envío salió bien: decir "no existe esa cuenta" o "no se pudo enviar"
   * permitiría enumerar emails registrados probando uno por uno. Es la
   * excepción a como `AyudaService` trata los fallos de Resend —ahí el envío
   * ES la funcionalidad y hay que avisar si falló—; acá el silencio es la
   * propiedad de seguridad, no un envío fingido: la cuenta con ese email, si
   * existe, sigue recibiendo su código igual.
   *
   * Una cuenta que entra sólo por Google (`passwordHash: null`) no tiene
   * contraseña que recuperar — tampoco se distingue ese caso en la respuesta.
   *
   * **Nada de esto se espera antes de responder.** Con cuenta real hay
   * consultas, una escritura y un envío de email (cientos de ms o segundos);
   * sin cuenta, nada. Si la respuesta esperara el trabajo, la diferencia de
   * tiempos delataría qué emails están registrados aunque el cuerpo fuera
   * idéntico.
   */
  async solicitarRecuperacion(email: string): Promise<void> {
    void this.procesarRecuperacion(email.trim().toLowerCase()).catch((e) =>
      this.logger.error(`Falló el proceso de recuperación: ${String(e)}`),
    );
  }

  private async procesarRecuperacion(valor: string): Promise<void> {
    const medico = await this.prisma.medico.findFirst({
      where: { email: valor, passwordHash: { not: null } },
      select: { id: true, email: true },
    });

    if (!medico) {
      // Sin el email en el log: es un dato personal y no hace falta para nada.
      this.logger.log('Recuperación pedida para un email sin cuenta con contraseña.');
      return;
    }

    /*
     * Tope de códigos por hora. Un código de 6 dígitos sólo es seguro si el
     * atacante no puede pedir códigos nuevos sin límite: cada código nuevo
     * es otra tanda de intentos. El límite por IP (`@Throttle`) no alcanza,
     * porque se esquiva cambiando de IP; éste es por cuenta.
     */
    const hace1h = new Date(Date.now() - 60 * 60 * 1000);
    const pedidos = await this.prisma.codigoRecuperacion.count({
      where: { medicoId: medico.id, creadoAt: { gt: hace1h } },
    });
    if (pedidos >= MAX_CODIGOS_POR_HORA) {
      this.logger.warn(`Tope de códigos de recuperación por hora alcanzado — médico ${medico.id}`);
      return;
    }

    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiraAt = new Date(Date.now() + MINUTOS_CODIGO_RECUPERACION * 60 * 1000);

    await this.prisma.$transaction([
      // Un código nuevo invalida los anteriores sin usar — pero no los borra:
      // hay que poder contarlos para el tope de arriba.
      this.prisma.codigoRecuperacion.updateMany({
        where: { medicoId: medico.id, usadaAt: null },
        data: { usadaAt: new Date() },
      }),
      this.prisma.codigoRecuperacion.create({
        data: { medicoId: medico.id, codigoHash: this.hash.hashearCodigo(medico.id, codigo), expiraAt },
      }),
    ]);

    await this.enviarEmailRecuperacion(medico.email, codigo);
  }

  /**
   * Confirma la recuperación: cambia la contraseña y cierra todas las
   * sesiones, igual que `cambiarPassword` — si el código llegó a manos
   * ajenas, esto también las saca a ellas.
   *
   * **Todos los caminos de falla hacen el mismo trabajo y dicen lo mismo**:
   * email que no existe, cuenta sin código vigente, código equivocado. Las
   * mismas consultas, la misma escritura, un único mensaje. Si no, la
   * respuesta (o su demora) diría qué emails tienen cuenta.
   *
   * **Cada intento se cuenta ANTES de mirar si el código es el correcto**, con
   * un UPDATE condicional atómico. Contarlo después dejaría a un atacante
   * mandar muchos intentos en paralelo que pasan todos el chequeo antes de que
   * el primero sume; así, a lo sumo `MAX_INTENTOS_CODIGO` llegan a comparar.
   * A los 5 el código deja de servir aunque después llegue el correcto.
   */
  async confirmarRecuperacion(email: string, codigo: string, nueva: string): Promise<void> {
    const invalido = () =>
      new UnauthorizedException('El código es inválido o venció. Pedí uno nuevo.');

    const medico = await this.prisma.medico.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });

    const fila = await this.prisma.codigoRecuperacion.findFirst({
      where: {
        // Con una cuenta inexistente se consulta igual, contra un id que no
        // matchea nada: mismo costo, mismo resultado vacío.
        medicoId: medico?.id ?? ID_INEXISTENTE,
        usadaAt: null,
        expiraAt: { gt: new Date() },
        intentos: { lt: MAX_INTENTOS_CODIGO },
      },
      orderBy: { creadoAt: 'desc' },
    });

    const contado = await this.prisma.codigoRecuperacion.updateMany({
      where: {
        id: fila?.id ?? ID_INEXISTENTE,
        usadaAt: null,
        intentos: { lt: MAX_INTENTOS_CODIGO },
      },
      data: { intentos: { increment: 1 } },
    });

    // El hash se calcula siempre, con o sin fila: es lo que iguala el costo.
    const esperado = this.hash.hashearCodigo(medico?.id ?? ID_INEXISTENTE, codigo);
    const coincide = fila !== null && this.hash.hashesIguales(fila.codigoHash, esperado);

    if (!medico || !fila || contado.count === 0 || !coincide) throw invalido();

    await this.prisma.$transaction([
      this.prisma.medico.update({
        where: { id: medico.id },
        data: { passwordHash: await this.hash.hashearPassword(nueva) },
      }),
      this.prisma.codigoRecuperacion.update({
        where: { id: fila.id },
        data: { usadaAt: new Date() },
      }),
      this.prisma.sesion.updateMany({
        where: { medicoId: medico.id, revocadaAt: null },
        data: { revocadaAt: new Date(), motivoRevocacion: 'CERRADA' },
      }),
    ]);

    await this.auditar(medico.id, 'PASSWORD_CHANGE', 'por recuperación');
    await this.push.enviarAMedico(medico.id, {
      titulo: 'Tu contraseña se restableció',
      cuerpo: 'Si no fuiste vos, escribinos apenas puedas entrar.',
    });
  }

  async perfil(medicoId: string) {
    return this.prisma.medico.findUniqueOrThrow({
      where: { id: medicoId },
      select: {
        id: true,
        email: true,
        nombreUsuario: true,
        nombre: true,
        apellido: true,
        especialidad: true,
        rol: true,
        disclaimerVersion: true,
        disclaimerAceptadoAt: true,
        createdAt: true,
      },
    });
  }

  async aceptarDisclaimer(medicoId: string, version: string): Promise<void> {
    await this.prisma.medico.update({
      where: { id: medicoId },
      data: { disclaimerVersion: version, disclaimerAceptadoAt: new Date() },
    });
  }

  // --- internos -------------------------------------------------------------

  /**
   * Todo lo que pasa DESPUÉS de saber quién es el médico y que puede entrar,
   * sin importar si se identificó con contraseña o con Google: la ventana de
   * gracia de una cuenta eliminada, el aviso de "dispositivo nuevo", y la
   * emisión de tokens. Antes vivía duplicado dentro de `login()`; con Google
   * sumando un segundo camino de entrada, mantenerlo en dos lugares es
   * exactamente el tipo de cosa que diverge sin que nadie lo note.
   */
  private async finalizarLogin(
    medico: { id: string; estado: string; eliminadaAt: Date | null },
    dispositivoInfo: string | undefined,
    tipoDispositivo: TipoDispositivo,
    detalleAuditoria?: string,
  ): Promise<ParDeTokens> {
    /*
     * Entrar es la forma de recuperar una cuenta dada de baja.
     *
     * Dentro de los siete días de gracia, el login la revive en vez de
     * rechazarla: el gesto de arrepentirse ya es exactamente «volver a
     * entrar», y un flujo aparte —un enlace por correo, una pantalla de
     * restaurar— sería más trabajo para el médico y más código para nosotros.
     *
     * Quien llama ya verificó la identidad (contraseña o token de Google),
     * así que revivirla acá no abre ninguna puerta que no estuviera abierta.
     */
    if (medico.estado === 'ELIMINADO') {
      const vence =
        medico.eliminadaAt === null
          ? 0
          : medico.eliminadaAt.getTime() + DIAS_DE_GRACIA_BAJA * 24 * 60 * 60 * 1000;

      if (Date.now() > vence) {
        throw new UnauthorizedException('La cuenta no está activa.');
      }

      await this.prisma.$transaction([
        this.prisma.medico.update({
          where: { id: medico.id },
          data: { estado: 'ACTIVO', eliminadaAt: null },
        }),
        this.prisma.auditLog.create({
          data: {
            medicoId: medico.id,
            accion: 'ADMIN_ACTION',
            detalle: 'cuenta recuperada dentro de la gracia',
          },
        }),
      ]);
    } else if (medico.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está activa.');
    }

    // Antes de crear la sesión nueva: qué había vivo. Del mismo tipo de
    // dispositivo, este login lo va a DESPLAZAR (una sola sesión por teléfono y
    // una por tablet); de otro tipo, es "un dispositivo más". En el primer login
    // de la cuenta no hay nada y no se manda ningún aviso, que es lo correcto.
    const activas = await this.prisma.sesion.findMany({
      where: { medicoId: medico.id, revocadaAt: null, expiraAt: { gt: new Date() } },
      select: { tipoDispositivo: true },
    });
    const delMismoTipo = activas.filter((s) => s.tipoDispositivo === tipoDispositivo).length;
    const deOtroTipo = activas.length - delMismoTipo;

    await this.auditar(medico.id, 'LOGIN', detalleAuditoria);
    await this.prisma.medico.update({
      where: { id: medico.id },
      data: { ultimoLoginAt: new Date() },
    });
    // El reenganche por inactividad tiene que poder volver a dispararse la
    // próxima vez que pase un mes sin entrar — sin este reset, quedaría
    // marcado como "ya avisado" para siempre desde la primera vez.
    await this.push.resetearReenganche(medico.id);

    const aQuien = tipoDispositivo === 'TABLET' ? 'tablet' : 'teléfono';
    if (delMismoTipo > 0) {
      await this.push.enviarAMedico(medico.id, {
        titulo: `Se cerró tu sesión en otro ${aQuien}`,
        cuerpo: dispositivoInfo
          ? `Alguien entró con tu cuenta desde ${dispositivoInfo}. Si no fuiste vos, cambiá tu contraseña.`
          : 'Alguien entró con tu cuenta desde otro dispositivo. Si no fuiste vos, cambiá tu contraseña.',
      });
    } else if (deOtroTipo > 0) {
      await this.push.enviarAMedico(medico.id, {
        titulo: 'Se inició sesión desde un dispositivo nuevo',
        cuerpo: dispositivoInfo ? `Desde ${dispositivoInfo}. Si no fuiste vos, revisá Perfil → Sesiones activas.` : 'Si no fuiste vos, revisá Perfil → Sesiones activas.',
      });
    }

    return this.emitirTokens(medico.id, dispositivoInfo, tipoDispositivo, true);
  }

  /**
   * Un `nombreUsuario` derivado del email para cuentas que nacen por Google,
   * que no pasan por la pantalla de registro y por lo tanto nunca lo eligen.
   * Determinístico y sin azar: dos altas del mismo email dan el mismo primer
   * candidato, y sólo se agrega un sufijo si de verdad choca.
   */
  private async nombreUsuarioLibre(email: string): Promise<string> {
    const limpio = (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const base = (limpio.length >= 3 ? limpio : `medico${limpio}`).slice(0, 26);

    let candidato = base;
    let sufijo = 1;
    while (
      await this.prisma.medico.findUnique({ where: { nombreUsuario: candidato }, select: { id: true } })
    ) {
      candidato = `${base}${sufijo}`;
      sufijo += 1;
    }
    return candidato;
  }

  /**
   * `reemplazar`: al INICIAR sesión (login, registro, Google) la sesión nueva
   * desplaza a la que hubiera viva del mismo tipo de dispositivo —una por
   * teléfono y una por tablet—, en la misma transacción que la crea. Al RENOVAR
   * (`refrescar`) no: la sesión vieja ya se rotó y la nueva sólo ocupa su lugar.
   *
   * Es lo que impide que dos personas usen una misma cuenta paga a la vez sin
   * estorbarle a un médico que trabaja con su teléfono y su tablet. Dos inicios
   * simultáneos del mismo tipo pueden dejar dos sesiones vivas; el siguiente
   * inicio las cierra, y no vale la pena un lock por eso.
   */
  private async emitirTokens(
    medicoId: string,
    dispositivoInfo: string | undefined,
    tipoDispositivo: TipoDispositivo,
    reemplazar: boolean,
  ): Promise<ParDeTokens> {
    const refreshToken = this.hash.generarTokenOpaco();
    const expiraAt = new Date(Date.now() + DIAS_REFRESH * 24 * 60 * 60 * 1000);

    const crear = this.prisma.sesion.create({
      data: {
        medicoId,
        refreshTokenHash: this.hash.hashearToken(refreshToken),
        dispositivoInfo: dispositivoInfo ?? null,
        tipoDispositivo,
        expiraAt,
        ultimoUsoAt: new Date(),
      },
      select: { id: true },
    });

    const sesion = reemplazar
      ? (
          await this.prisma.$transaction([
            this.prisma.sesion.updateMany({
              where: { medicoId, tipoDispositivo, revocadaAt: null },
              data: { revocadaAt: new Date(), motivoRevocacion: 'REEMPLAZADA' },
            }),
            crear,
          ])
        )[1]
      : await crear;

    /*
     * `sid`: de qué sesión salió este token.
     *
     * Sirve para que la lista de sesiones pueda marcar «esta» y no ofrecer
     * cerrarla — hoy el médico puede cerrar la suya propia desde ahí y queda
     * afuera de la app sin que nada se lo avise.
     *
     * No identifica al dispositivo ni agrega nada sensible: es el id de una
     * fila que el mismo médico ya puede listar.
     */
    const accessToken = await this.jwt.signAsync({ sub: medicoId, sid: sesion.id });
    return { accessToken, refreshToken, expiraEn: expiraAt.getTime() };
  }

  /**
   * El envío nunca sube un error al llamador: `solicitarRecuperacion` ya
   * decidió responder igual pase lo que pase con Resend (ver su comentario).
   * Si falla, queda en el log del servidor — no en una respuesta que
   * distinga cuentas reales de inventadas.
   */
  private async enviarEmailRecuperacion(email: string, codigo: string): Promise<void> {
    const claveApi = process.env.RESEND_API_KEY;
    if (!claveApi) {
      this.logger.error('No se pudo enviar el email de recuperación: falta RESEND_API_KEY.');
      return;
    }

    // Un código y no un enlace a propósito: un esquema propio (`gfh://`) lo
    // puede interceptar otra app instalada en el teléfono, y los clientes de
    // correo suelen no volverlo tocable. Un código que se escribe a mano no
    // viaja por ningún canal que otra app pueda escuchar.
    const cuerpo = [
      'Pediste restablecer tu contraseña de GFH.',
      '',
      `Tu código: ${codigo}`,
      '',
      `Escribilo en la app. Vence en ${MINUTOS_CODIGO_RECUPERACION} minutos.`,
      'Si no fuiste vos, ignorá este correo: tu contraseña sigue igual y nadie puede cambiarla sin este código.',
    ].join('\n');

    try {
      const resend = new Resend(claveApi);
      const { error } = await resend.emails.send({
        from: REMITENTE_RECUPERACION,
        to: email,
        subject: `${codigo} es tu código de GFH`,
        text: cuerpo,
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      this.logger.error(`No se pudo enviar el email de recuperación: ${String(e)}`);
    }
  }

  private async revocarTodas(medicoId: string): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: { medicoId, revocadaAt: null },
      data: { revocadaAt: new Date(), motivoRevocacion: 'CERRADA' },
    });
  }

  private async auditar(
    medicoId: string,
    accion: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'ERROR',
    detalle?: string,
  ): Promise<void> {
    // Nunca información clínica sensible en el detalle.
    await this.prisma.auditLog.create({ data: { medicoId, accion, detalle: detalle ?? null } });
  }
}

/**
 * Hash de una contraseña que nadie conoce. Se compara contra esto cuando el
 * médico no existe, para que login con usuario inexistente tarde lo mismo que
 * con contraseña incorrecta. Sin esto, la diferencia de tiempos permite
 * enumerar cuentas.
 */
const HASH_SENUELO =
  '$argon2id$v=19$m=19456,t=2,p=1$c2VudWVsbzE2Ynl0ZXNzYWx0$YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY';
