import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';

/**
 * Andamiaje de los tests de integración.
 *
 * Corren contra la app REAL y la base REAL, no contra mocks. La razón: los
 * errores que se escaparon vivían justamente en las capas que un mock
 * reemplaza — el filtro de excepciones, el parseo del cuerpo de Fastify, las
 * restricciones únicas de Postgres.
 *
 * El aislamiento sale de la propia garantía del sistema: cada corrida crea su
 * médico y todo cuelga de `medicoId`. Los datos reales no se tocan, y al
 * terminar se borra el médico — la cascada se lleva pacientes, grupos,
 * prescripciones y sesiones.
 *
 * Depende de que el catálogo clínico esté cargado (`pnpm db:seed` y
 * `pnpm db:genericos`): es de sólo lectura y compartido, así que no se toca.
 */

export interface Contexto {
  app: NestFastifyApplication;
  prisma: PrismaClient;
  cerrar: () => Promise<void>;
}

/**
 * El rate limiting va apagado salvo que se pida.
 *
 * No es comodidad: el límite de `/auth/registro` son 5 por minuto y una sola
 * suite crea más médicos que eso, así que con el guard puesto los tests fallan
 * por la cuota y no por lo que prueban. Que el throttler funcione se verifica
 * aparte, en `throttling.e2e.test.ts`, que sí lo enciende.
 */
export async function levantarApp(
  opciones: { throttling?: boolean } = {},
): Promise<Contexto> {
  const constructor = Test.createTestingModule({ imports: [AppModule] });

  if (!opciones.throttling) {
    // Se reemplaza el almacenamiento, no el guard: `APP_GUARD` lo resuelve Nest
    // por la vía de los enhancers y `overrideProvider` no lo alcanza. Así el
    // guard corre de verdad —y cualquier error suyo se vería— pero el contador
    // siempre responde "primer intento".
    constructor.overrideProvider(ThrottlerStorage).useValue({
      increment: async () => ({
        totalHits: 1,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    });
  }

  const modulo = await constructor.compile();

  const app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  configurarApp(app);
  await app.init();
  // Fastify necesita esto para que `inject` tenga las rutas listas.
  await app.getHttpAdapter().getInstance().ready();

  const prisma = new PrismaClient();

  return {
    app,
    prisma,
    cerrar: async () => {
      await prisma.$disconnect();
      await app.close();
    },
  };
}

export interface Respuesta<T = any> {
  status: number;
  cuerpo: { success: boolean; data?: T; error?: { code: string; message: string } } | null;
}

/**
 * Cliente que imita al de la app, incluido el detalle que rompió los DELETE:
 * el `content-type` va SÓLO cuando hay cuerpo. Si el test mandara siempre el
 * header —o nunca— dejaría pasar la misma clase de error otra vez.
 */
export function cliente(app: NestFastifyApplication) {
  const pedir = async (
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    opciones: { cuerpo?: unknown; token?: string } = {},
  ): Promise<Respuesta> => {
    const res = await app.inject({
      method: metodo,
      url,
      ...(opciones.cuerpo !== undefined
        ? { payload: opciones.cuerpo as Record<string, unknown> }
        : {}),
      headers: {
        ...(opciones.cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(opciones.token ? { authorization: `Bearer ${opciones.token}` } : {}),
      },
    });

    let cuerpo = null;
    try {
      cuerpo = res.body ? JSON.parse(res.body) : null;
    } catch {
      cuerpo = null;
    }

    return { status: res.statusCode, cuerpo };
  };

  return {
    get: (url: string, token?: string) => pedir('GET', url, { token }),
    post: (url: string, cuerpo?: unknown, token?: string) => pedir('POST', url, { cuerpo, token }),
    patch: (url: string, cuerpo: unknown, token?: string) => pedir('PATCH', url, { cuerpo, token }),
    /** Sin cuerpo y sin `content-type`, igual que la app. */
    delete: (url: string, token?: string) => pedir('DELETE', url, { token }),
    /** Con `content-type: application/json` y sin cuerpo: el caso que fallaba. */
    deleteConContentType: (url: string, token?: string) =>
      app
        .inject({
          method: 'DELETE',
          url,
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
        })
        .then((r) => ({ status: r.statusCode, cuerpo: r.body ? JSON.parse(r.body) : null })),
  };
}

let contador = 0;

/** Un médico nuevo por cada test que lo pida, con su token listo. */
export async function crearMedico(
  api: ReturnType<typeof cliente>,
): Promise<{ id: string; email: string; token: string; refresh: string }> {
  contador += 1;
  const marca = `${process.pid}${contador}`;
  const email = `e2e${marca}@gfh.test`;

  const r = await api.post('/auth/registro', {
    email,
    nombreUsuario: `e2e${marca}`,
    password: 'PruebaIntegracion1',
    nombre: 'Médico',
    apellido: `Prueba ${marca}`,
  });

  if (r.status !== 201 || !r.cuerpo?.data) {
    throw new Error(`No se pudo crear el médico de prueba: ${JSON.stringify(r.cuerpo)}`);
  }

  const yo = await api.get('/auth/yo', r.cuerpo.data.accessToken);

  return {
    id: yo.cuerpo!.data.id,
    email,
    token: r.cuerpo.data.accessToken,
    refresh: r.cuerpo.data.refreshToken,
  };
}

/** Borrado real, no marcado como ELIMINADO: los tests no dejan basura. */
export async function borrarMedicos(prisma: PrismaClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.medico.deleteMany({ where: { id: { in: ids } } });
}

/** Un paciente con lo mínimo para que el motor tenga algo que evaluar. */
export async function crearPaciente(
  api: ReturnType<typeof cliente>,
  token: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const r = await api.post(
    '/pacientes',
    {
      nombre: 'Paciente',
      apellido: 'De Prueba',
      fechaNacimiento: new Date(Date.UTC(1948, 3, 12)).toISOString(),
      sexo: 'F',
      pesoKg: 58,
      creatininaMgDl: 1.6,
      ...extra,
    },
    token,
  );
  if (r.status !== 201) throw new Error(`No se pudo crear el paciente: ${JSON.stringify(r.cuerpo)}`);
  return r.cuerpo!.data.id;
}

/** Busca un producto del catálogo por nombre. Lectura, no escribe nada. */
export async function buscarProducto(
  api: ReturnType<typeof cliente>,
  token: string,
  nombre: string,
): Promise<{ id: string; nombreComercial: string }> {
  const r = await api.get(`/catalogo/productos?q=${encodeURIComponent(nombre)}`, token);
  const producto = r.cuerpo?.data?.[0];
  if (!producto) throw new Error(`No hay producto "${nombre}" en el catálogo. ¿Corriste el seed?`);
  return producto;
}

export async function buscarPrincipioActivo(
  api: ReturnType<typeof cliente>,
  token: string,
  nombre: string,
): Promise<{ id: string; nombre: string }> {
  const r = await api.get(`/catalogo/principios-activos?q=${encodeURIComponent(nombre)}`, token);
  const pa = r.cuerpo?.data?.find(
    (x: { nombre: string }) => x.nombre.toLowerCase() === nombre.toLowerCase(),
  ) ?? r.cuerpo?.data?.[0];
  if (!pa) throw new Error(`No hay principio activo "${nombre}". ¿Corriste el seed?`);
  return pa;
}
