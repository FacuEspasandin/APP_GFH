import { Platform } from 'react-native';

import { borrar, CLAVE_ACCESS, CLAVE_REFRESH, guardar, leer } from './almacen';

/**
 * Cliente HTTP.
 *
 * Toda comunicación con la API pasa por acá — ningún componente hace `fetch`
 * directo (Opciones_stack.md, "Arquitectura Mobile").
 *
 * Lo que resuelve y no es obvio: cuando el access token vence, reintenta UNA
 * vez usando el refresh, y si varias pantallas piden a la vez comparten el
 * mismo refresh en vuelo. Sin eso, cinco requests simultáneos dispararían cinco
 * rotaciones y cuatro de ellas serían "reuso de token revocado" → el backend
 * cerraría todas las sesiones del médico por sospecha de robo.
 */

const BASE = resolverBase();

function resolverBase(): string {
  const deEntorno = process.env.EXPO_PUBLIC_API_URL;
  if (deEntorno) return deEntorno.replace(/\/$/, '');
  // En emulador Android, `localhost` es el propio emulador.
  if (Platform.OS === 'android') return 'http://10.0.2.2:3333';
  return 'http://127.0.0.1:3333';
}

export class ErrorApi extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly status: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** El teléfono no llegó al servidor. Es accionable por el usuario —revisar
   *  wifi— a diferencia de un error del backend, que no lo es. */
  get esSinConexion(): boolean {
    return this.codigo === 'SIN_CONEXION';
  }

  get esSuscripcionVencida(): boolean {
    return this.codigo === 'SUSCRIPCION_VENCIDA';
  }

  /** El plan gratis no da para esto. No es un error: es el momento de vender. */
  get esLimiteDelPlanGratis(): boolean {
    return this.codigo === 'LIMITE_PLAN_GRATIS';
  }
}

/**
 * Qué hacer cuando el backend dice que la suscripción venció.
 *
 * Lo resuelve quien tenga el router a mano, no el cliente HTTP: importar
 * expo-router acá acoplaría la capa de red a la de navegación. El layout raíz
 * registra el manejador al montar.
 */
let alVencerSuscripcion: (() => void) | null = null;
export function registrarManejadorSuscripcionVencida(fn: () => void): void {
  alVencerSuscripcion = fn;
}

/**
 * Qué hacer cuando una acción excede el plan gratis.
 *
 * Va acá y no en cada pantalla: si dependiera de que cada una se acuerde de
 * atrapar `LIMITE_PLAN_GRATIS`, la primera función paga que agreguemos sin
 * cablearla le mostraría al médico un mensaje de error en vez del paywall. Con
 * el manejador central, cualquier acción que el backend rechace por plan abre
 * la misma pantalla, sin que haya que recordarlo.
 */
let alLlegarAlLimite: (() => void) | null = null;
export function registrarManejadorLimitePlan(fn: () => void): void {
  alLlegarAlLimite = fn;
}

interface RespuestaSobre<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
}

let refrescoEnVuelo: Promise<boolean> | null = null;

async function refrescar(): Promise<boolean> {
  if (refrescoEnVuelo) return refrescoEnVuelo;

  refrescoEnVuelo = (async () => {
    const refreshToken = await leer(CLAVE_REFRESH);
    if (!refreshToken) return false;

    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await cerrarSesionLocal();
      return false;
    }

    const cuerpo = (await res.json()) as RespuestaSobre<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (!cuerpo.data) return false;

    await guardar(CLAVE_ACCESS, cuerpo.data.accessToken);
    await guardar(CLAVE_REFRESH, cuerpo.data.refreshToken);
    return true;
  })().finally(() => {
    refrescoEnVuelo = null;
  });

  return refrescoEnVuelo;
}

/**
 * Cuánto se espera antes de darse por vencido.
 *
 * Generoso a propósito: el plan gratuito de Render apaga el servicio por
 * inactividad y despertarlo lleva cerca de un minuto. Cortar antes convertiría
 * un arranque lento en un error, y el médico reintentaría sobre un servidor que
 * ya estaba por responder.
 */
const TIEMPO_MAXIMO_MS = 75_000;

async function pedir<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintentar = true,
): Promise<T> {
  const accessToken = await leer(CLAVE_ACCESS);

  let res: Response;
  // Sin esto, una petición contra un servidor dormido queda esperando para
  // siempre y la pantalla se queda en skeletons, sin error y sin forma de
  // reintentar. Pasó con el plan gratuito de Render, que apaga el servicio por
  // inactividad y tarda cerca de un minuto en despertar.
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), TIEMPO_MAXIMO_MS);

  try {
    res = await fetch(`${BASE}${ruta}`, {
      ...opciones,
      signal: corte.signal,
      headers: {
        // `content-type: application/json` SÓLO cuando hay cuerpo. Fastify
        // rechaza con 400 un request que declara JSON y viene vacío
        // ("Body cannot be empty when content-type is set to
        // 'application/json'"), así que mandarlo siempre rompía todos los
        // DELETE: borrar un paciente, quitar una alergia, cerrar una sesión.
        ...(opciones.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(opciones.headers ?? {}),
      },
    });
  } catch (e) {
    // `fetch` sólo tira cuando no llegó a hablar con el servidor: sin red, DNS
    // caído o servidor apagado. Se distingue del error del backend porque el
    // usuario puede hacer algo al respecto.
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ErrorApi(
        'SIN_CONEXION',
        'El servidor tardó demasiado en responder. Probá de nuevo.',
        0,
      );
    }
    throw new ErrorApi('SIN_CONEXION', 'No hay conexión con el servidor.', 0);
  } finally {
    clearTimeout(reloj);
  }

  if (res.status === 401 && reintentar) {
    const ok = await refrescar();
    if (ok) return pedir<T>(ruta, opciones, false);
  }

  if (res.status === 204) return undefined as T;

  const cuerpo = (await res.json().catch(() => null)) as RespuestaSobre<T> | null;

  if (!res.ok || !cuerpo?.success) {
    const codigo = cuerpo?.error?.code ?? 'ERROR';

    // La suscripción vencida no es un error de la pantalla: bloquea toda la
    // app, así que se maneja una vez y en un solo lugar.
    if (res.status === 403 && codigo === 'SUSCRIPCION_VENCIDA') {
      alVencerSuscripcion?.();
    }

    // Distinto del anterior: acá no se perdió el acceso, hay algo que se
    // desbloquea pagando. Por eso el paywall y no la pantalla de bloqueo.
    if (res.status === 403 && codigo === 'LIMITE_PLAN_GRATIS') {
      alLlegarAlLimite?.();
    }

    throw new ErrorApi(
      codigo,
      cuerpo?.error?.message ?? 'No se pudo completar la operación.',
      res.status,
    );
  }

  return cuerpo.data as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, { method: 'POST', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
  patch: <T>(ruta: string, cuerpo: unknown) =>
    pedir<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }),
  delete: <T>(ruta: string) => pedir<T>(ruta, { method: 'DELETE' }),
};

// --- sesión -----------------------------------------------------------------

export async function iniciarSesion(identificador: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identificador,
      password,
      dispositivoInfo: `${Platform.OS} · GFH ${Platform.Version ?? ''}`.trim(),
    }),
  });

  const cuerpo = (await res.json().catch(() => null)) as RespuestaSobre<{
    accessToken: string;
    refreshToken: string;
  }> | null;

  if (!res.ok || !cuerpo?.data) {
    throw new ErrorApi(
      cuerpo?.error?.code ?? 'ERROR',
      cuerpo?.error?.message ?? 'No se pudo iniciar sesión.',
      res.status,
    );
  }

  await guardar(CLAVE_ACCESS, cuerpo.data.accessToken);
  await guardar(CLAVE_REFRESH, cuerpo.data.refreshToken);
  marcarSesion(true);
}

export async function cerrarSesionLocal(): Promise<void> {
  await borrar(CLAVE_ACCESS);
  await borrar(CLAVE_REFRESH);
  marcarSesion(false);
}

export async function haySesion(): Promise<boolean> {
  const token = await leer(CLAVE_ACCESS);
  marcarSesion(token !== null);
  return hayTokenEnMemoria;
}

/**
 * Versión sincrónica, para decidir si una query puede correr. `leer` es async
 * en device (SecureStore) y los hooks de React no pueden esperar, así que se
 * cachea el resultado de la última consulta.
 */
let hayTokenEnMemoria = false;
export function haySesionSincrona(): boolean {
  return hayTokenEnMemoria;
}

/**
 * Avisar cuando la sesión aparece o se va.
 *
 * Sin esto, una query con `enabled: haySesionSincrona()` que se monta antes de
 * que el splash termine de leer el token queda deshabilitada para siempre: el
 * flag cambia pero nadie vuelve a renderizar al componente que la declara.
 * Pasaba con la configuración del médico —tema y umbral de adulto mayor—, que
 * en un arranque en frío nunca se pedía y la app se quedaba con los valores por
 * defecto sin decirlo.
 */
type Oyente = (hay: boolean) => void;
const oyentes = new Set<Oyente>();

export function suscribirseASesion(fn: Oyente): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function marcarSesion(hay: boolean): void {
  if (hayTokenEnMemoria === hay) return;
  hayTokenEnMemoria = hay;
  for (const fn of oyentes) fn(hay);
}

export { BASE as URL_API };
