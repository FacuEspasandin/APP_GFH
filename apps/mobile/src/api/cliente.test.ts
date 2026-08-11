import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  api,
  cerrarSesionLocal,
  ErrorApi,
  haySesion,
  haySesionSincrona,
  iniciarSesion,
  registrarManejadorLimitePlan,
  registrarManejadorSuscripcionVencida,
  suscribirseASesion,
} from './cliente';

/**
 * El cliente HTTP es el único lugar por donde pasa todo lo que la app le pide
 * al servidor. Lo que se prueba acá no es "hace un fetch": es lo que resuelve
 * en silencio y sólo se nota cuando falla — el reintento del token, el corte
 * por servidor dormido, y las dos respuestas que abren una pantalla entera.
 */

const sobre = (data: unknown) => ({ success: true, data, message: '' });
const falla = (code: string, message: string) => ({ success: false, error: { code, message } });

function respuesta(cuerpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as unknown as Response;
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
  await cerrarSesionLocal();
  registrarManejadorSuscripcionVencida(() => {});
  registrarManejadorLimitePlan(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('respuestas del servidor', () => {
  it('devuelve el contenido del sobre, no el sobre', async () => {
    fetchSimulado.mockResolvedValue(respuesta(sobre({ productos: 638 })));
    await expect(api.get('/catalogo/productos/conteo')).resolves.toEqual({ productos: 638 });
  });

  it('un 204 no intenta parsear un cuerpo que no vino', async () => {
    fetchSimulado.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
    await expect(api.delete('/pacientes/1')).resolves.toBeUndefined();
  });

  it('un error del backend llega con su código, no como texto suelto', async () => {
    fetchSimulado.mockResolvedValue(respuesta(falla('VALIDACION', 'Falta el nombre.'), 400));

    await expect(api.post('/pacientes', {})).rejects.toMatchObject({
      codigo: 'VALIDACION',
      status: 400,
      message: 'Falta el nombre.',
    });
  });
});

describe('cuando no se llega al servidor', () => {
  it('sin red se distingue de un error del backend', async () => {
    // El usuario puede hacer algo con lo primero —revisar el wifi— y nada con
    // lo segundo. Mezclarlos hace que reintente en vano.
    fetchSimulado.mockRejectedValue(new TypeError('Network request failed'));

    const e = (await api.get('/inicio').catch((x: unknown) => x)) as ErrorApi;
    expect(e).toBeInstanceOf(ErrorApi);
    expect(e.esSinConexion).toBe(true);
  });

  it('el corte por tiempo también es "sin conexión", con su propio mensaje', async () => {
    // Sin esto, una petición contra el plan gratuito de Render dormido queda
    // esperando para siempre y la pantalla se queda en skeletons.
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    fetchSimulado.mockRejectedValue(abort);

    const e = (await api.get('/inicio').catch((x: unknown) => x)) as ErrorApi;
    expect(e.esSinConexion).toBe(true);
    expect(e.message).toContain('tardó demasiado');
  });

  it('manda una señal de aborto para poder cortar', async () => {
    fetchSimulado.mockResolvedValue(respuesta(sobre(null)));
    await api.get('/inicio');
    expect(fetchSimulado.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });
});

describe('cabeceras', () => {
  it('sólo declara JSON cuando manda cuerpo', async () => {
    // Fastify rechaza con 400 un request que declara JSON y viene vacío, así
    // que mandarlo siempre rompía todos los DELETE.
    fetchSimulado.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
    await api.delete('/alergias/1');

    expect(fetchSimulado.mock.calls[0]![1].headers['content-type']).toBeUndefined();
  });

  it('con cuerpo sí lo declara', async () => {
    fetchSimulado.mockResolvedValue(respuesta(sobre(null)));
    await api.post('/pacientes', { nombre: 'Ana' });

    expect(fetchSimulado.mock.calls[0]![1].headers['content-type']).toBe('application/json');
  });

  it('adjunta el token cuando hay sesión', async () => {
    fetchSimulado.mockResolvedValue(
      respuesta(sobre({ accessToken: 'tok-1', refreshToken: 'ref-1' })),
    );
    await iniciarSesion('demo@gfh.app', 'x');

    fetchSimulado.mockResolvedValue(respuesta(sobre(null)));
    await api.get('/inicio');

    const ultima = fetchSimulado.mock.calls.at(-1)!;
    expect(ultima[1].headers.authorization).toBe('Bearer tok-1');
  });
});

describe('token vencido', () => {
  it('reintenta UNA vez con el refresh y devuelve el resultado bueno', async () => {
    fetchSimulado.mockResolvedValue(
      respuesta(sobre({ accessToken: 'viejo', refreshToken: 'ref-1' })),
    );
    await iniciarSesion('demo@gfh.app', 'x');
    fetchSimulado.mockReset();

    fetchSimulado
      .mockResolvedValueOnce(respuesta(falla('NO_AUTORIZADO', 'vencido'), 401))
      .mockResolvedValueOnce(respuesta(sobre({ accessToken: 'nuevo', refreshToken: 'ref-2' })))
      .mockResolvedValueOnce(respuesta(sobre({ pacientes: [] })));

    await expect(api.get('/inicio')).resolves.toEqual({ pacientes: [] });
    expect(fetchSimulado).toHaveBeenCalledTimes(3);
  });

  it('no reintenta dos veces: un 401 después del refresh se propaga', async () => {
    fetchSimulado.mockResolvedValue(
      respuesta(sobre({ accessToken: 'viejo', refreshToken: 'ref-1' })),
    );
    await iniciarSesion('demo@gfh.app', 'x');
    fetchSimulado.mockReset();

    fetchSimulado
      .mockResolvedValueOnce(respuesta(falla('NO_AUTORIZADO', 'vencido'), 401))
      .mockResolvedValueOnce(respuesta(sobre({ accessToken: 'nuevo', refreshToken: 'ref-2' })))
      .mockResolvedValueOnce(respuesta(falla('NO_AUTORIZADO', 'vencido'), 401));

    await expect(api.get('/inicio')).rejects.toBeInstanceOf(ErrorApi);
    expect(fetchSimulado).toHaveBeenCalledTimes(3);
  });

  it('varias pantallas a la vez comparten UN solo refresh', async () => {
    // Sin esto, cinco requests simultáneos disparan cinco rotaciones y cuatro
    // son "reuso de token revocado": el backend cierra todas las sesiones del
    // médico por sospecha de robo.
    fetchSimulado.mockResolvedValue(
      respuesta(sobre({ accessToken: 'viejo', refreshToken: 'ref-1' })),
    );
    await iniciarSesion('demo@gfh.app', 'x');
    fetchSimulado.mockReset();

    fetchSimulado.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) {
        return respuesta(sobre({ accessToken: 'nuevo', refreshToken: 'ref-2' }));
      }
      const yaRefrescado = fetchSimulado.mock.calls.some((c) =>
        String(c[0]).endsWith('/auth/refresh'),
      );
      return yaRefrescado
        ? respuesta(sobre({ ok: true }))
        : respuesta(falla('NO_AUTORIZADO', 'vencido'), 401);
    });

    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    const refrescos = fetchSimulado.mock.calls.filter((c) =>
      String(c[0]).endsWith('/auth/refresh'),
    );
    expect(refrescos).toHaveLength(1);
  });

  it('si el refresh falla, se cierra la sesión local', async () => {
    fetchSimulado.mockResolvedValue(
      respuesta(sobre({ accessToken: 'viejo', refreshToken: 'ref-1' })),
    );
    await iniciarSesion('demo@gfh.app', 'x');
    expect(haySesionSincrona()).toBe(true);
    fetchSimulado.mockReset();

    fetchSimulado
      .mockResolvedValueOnce(respuesta(falla('NO_AUTORIZADO', 'vencido'), 401))
      .mockResolvedValueOnce(respuesta(falla('NO_AUTORIZADO', 'revocado'), 401));

    await api.get('/inicio').catch(() => {});
    expect(await haySesion()).toBe(false);
  });
});

describe('las dos respuestas que abren una pantalla entera', () => {
  it('la suscripción vencida se maneja una sola vez, en un solo lugar', async () => {
    const visto = vi.fn();
    registrarManejadorSuscripcionVencida(visto);

    fetchSimulado.mockResolvedValue(
      respuesta(falla('SUSCRIPCION_VENCIDA', 'Tu suscripción venció.'), 403),
    );
    await api.get('/inicio').catch(() => {});

    expect(visto).toHaveBeenCalledOnce();
  });

  it('el límite del plan gratis abre el paywall, no la pantalla de bloqueo', async () => {
    const paywall = vi.fn();
    const bloqueo = vi.fn();
    registrarManejadorLimitePlan(paywall);
    registrarManejadorSuscripcionVencida(bloqueo);

    fetchSimulado.mockResolvedValue(
      respuesta(falla('LIMITE_PLAN_GRATIS', 'El plan gratis incluye 1 paciente.'), 403),
    );
    const e = (await api.post('/pacientes', {}).catch((x: unknown) => x)) as ErrorApi;

    expect(paywall).toHaveBeenCalledOnce();
    expect(bloqueo).not.toHaveBeenCalled();
    expect(e.esLimiteDelPlanGratis).toBe(true);
  });

  it('un 403 cualquiera no dispara ninguna de las dos', async () => {
    const paywall = vi.fn();
    const bloqueo = vi.fn();
    registrarManejadorLimitePlan(paywall);
    registrarManejadorSuscripcionVencida(bloqueo);

    fetchSimulado.mockResolvedValue(respuesta(falla('PROHIBIDO', 'No podés.'), 403));
    await api.get('/x').catch(() => {});

    expect(paywall).not.toHaveBeenCalled();
    expect(bloqueo).not.toHaveBeenCalled();
  });
});

describe('aviso de sesión', () => {
  it('avisa al aparecer y al irse', async () => {
    const oido: boolean[] = [];
    const desuscribir = suscribirseASesion((hay) => oido.push(hay));

    fetchSimulado.mockResolvedValue(respuesta(sobre({ accessToken: 't', refreshToken: 'r' })));
    await iniciarSesion('demo@gfh.app', 'x');
    await cerrarSesionLocal();

    expect(oido).toEqual([true, false]);
    desuscribir();
  });

  it('no repite el aviso si el estado no cambió', async () => {
    const oido: boolean[] = [];
    const desuscribir = suscribirseASesion((hay) => oido.push(hay));

    await cerrarSesionLocal();
    await cerrarSesionLocal();

    expect(oido).toEqual([]);
    desuscribir();
  });

  it('deja de avisar después de desuscribirse', async () => {
    const oido: boolean[] = [];
    const desuscribir = suscribirseASesion((hay) => oido.push(hay));
    desuscribir();

    fetchSimulado.mockResolvedValue(respuesta(sobre({ accessToken: 't', refreshToken: 'r' })));
    await iniciarSesion('demo@gfh.app', 'x');

    expect(oido).toEqual([]);
  });

  it('haySesion hidrata el flag sincrónico que usan las consultas', async () => {
    // De esto dependía la configuración del médico: el proveedor de tema monta
    // antes que el splash y sin el aviso la consulta quedaba deshabilitada.
    fetchSimulado.mockResolvedValue(respuesta(sobre({ accessToken: 't', refreshToken: 'r' })));
    await iniciarSesion('demo@gfh.app', 'x');
    expect(await haySesion()).toBe(true);
    expect(haySesionSincrona()).toBe(true);
  });
});

describe('errores tipados', () => {
  it('cada bandera responde sólo a su código', () => {
    expect(new ErrorApi('SIN_CONEXION', '', 0).esSinConexion).toBe(true);
    expect(new ErrorApi('SUSCRIPCION_VENCIDA', '', 403).esSuscripcionVencida).toBe(true);
    expect(new ErrorApi('LIMITE_PLAN_GRATIS', '', 403).esLimiteDelPlanGratis).toBe(true);

    const otro = new ErrorApi('ERROR', '', 500);
    expect(otro.esSinConexion).toBe(false);
    expect(otro.esSuscripcionVencida).toBe(false);
    expect(otro.esLimiteDelPlanGratis).toBe(false);
  });
});
