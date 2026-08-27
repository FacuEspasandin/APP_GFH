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

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { HashService } from './hash.service';

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}

const DIAS_REFRESH = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HashService) private readonly hash: HashService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async registrar(datos: {
    email: string;
    nombreUsuario: string;
    password: string;
    nombre: string;
    apellido: string;
    dispositivoInfo?: string;
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
        rol: 'USER',
        configuracion: { create: {} },
      },
    });

    await this.auditar(medico.id, 'LOGIN', 'registro');
    return this.emitirTokens(medico.id, datos.dispositivoInfo);
  }

  /**
   * Acepta email o nombre de usuario indistintamente: el backend resuelve cuál
   * de los dos matchea antes de validar la contraseña.
   */
  async login(identificador: string, password: string, dispositivoInfo?: string): Promise<ParDeTokens> {
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
    /*
     * Entrar es la forma de recuperar una cuenta dada de baja.
     *
     * Dentro de los siete días de gracia, el login la revive en vez de
     * rechazarla: el gesto de arrepentirse ya es exactamente «volver a
     * entrar», y un flujo aparte —un enlace por correo, una pantalla de
     * restaurar— sería más trabajo para el médico y más código para nosotros.
     *
     * La contraseña ya se verificó arriba, así que revivirla acá no abre
     * ninguna puerta que no estuviera abierta.
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

    await this.auditar(medico.id, 'LOGIN');
    return this.emitirTokens(medico.id, dispositivoInfo);
  }

  /**
   * Rotación: cada refresh emite una sesión nueva y revoca la anterior.
   *
   * Reuso de un refresh ya revocado = señal de robo de token → se revocan
   * TODAS las sesiones del médico. Es agresivo a propósito: si el token viajó
   * a manos ajenas, no sabemos cuál de las dos partes es la legítima.
   */
  async refrescar(refreshToken: string, dispositivoInfo?: string): Promise<ParDeTokens> {
    const hash = this.hash.hashearToken(refreshToken);
    const sesion = await this.prisma.sesion.findUnique({ where: { refreshTokenHash: hash } });

    if (!sesion) throw new UnauthorizedException('Sesión inválida.');

    if (sesion.revocadaAt !== null) {
      this.logger.warn(`Reuso de refresh token revocado — médico ${sesion.medicoId}`);
      await this.revocarTodas(sesion.medicoId);
      await this.auditar(sesion.medicoId, 'ERROR', 'reuso de refresh token revocado');
      throw new UnauthorizedException('Sesión inválida.');
    }

    if (sesion.expiraAt < new Date()) {
      throw new UnauthorizedException('La sesión expiró.');
    }

    await this.prisma.sesion.update({
      where: { id: sesion.id },
      data: { revocadaAt: new Date() },
    });

    return this.emitirTokens(sesion.medicoId, dispositivoInfo ?? sesion.dispositivoInfo ?? undefined);
  }

  async logout(medicoId: string, refreshToken: string): Promise<void> {
    const hash = this.hash.hashearToken(refreshToken);
    await this.prisma.sesion.updateMany({
      where: { refreshTokenHash: hash, medicoId, revocadaAt: null },
      data: { revocadaAt: new Date() },
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
      select: { id: true, dispositivoInfo: true, creadaAt: true, ultimoUsoAt: true, expiraAt: true },
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
      data: { revocadaAt: new Date() },
    });
  }

  async cambiarPassword(medicoId: string, actual: string, nueva: string): Promise<void> {
    const medico = await this.prisma.medico.findUniqueOrThrow({ where: { id: medicoId } });
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

  private async emitirTokens(medicoId: string, dispositivoInfo?: string): Promise<ParDeTokens> {
    const refreshToken = this.hash.generarTokenOpaco();
    const expiraAt = new Date(Date.now() + DIAS_REFRESH * 24 * 60 * 60 * 1000);

    const sesion = await this.prisma.sesion.create({
      data: {
        medicoId,
        refreshTokenHash: this.hash.hashearToken(refreshToken),
        dispositivoInfo: dispositivoInfo ?? null,
        expiraAt,
        ultimoUsoAt: new Date(),
      },
      select: { id: true },
    });

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

  private async revocarTodas(medicoId: string): Promise<void> {
    await this.prisma.sesion.updateMany({
      where: { medicoId, revocadaAt: null },
      data: { revocadaAt: new Date() },
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
