import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

/**
 * El webhook de RevenueCat es el ÚNICO camino que escribe una suscripción
 * (regla no negociable 6). Auditoría del 29/9/2026: eventos fuera de orden,
 * transferencias descartadas, reembolsos que no cortaban el acceso.
 */
describe('webhook de RevenueCat', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  const SECRETO = 'secreto-de-prueba-webhook';
  const secretoAntes = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
  const sandboxAntes = process.env.REVENUECAT_RECHAZA_SANDBOX;

  beforeAll(async () => {
    process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = SECRETO;
    ctx = await levantarApp();
    api = cliente(ctx.app);
  }, 90_000);

  afterEach(() => {
    if (sandboxAntes === undefined) delete process.env.REVENUECAT_RECHAZA_SANDBOX;
    else process.env.REVENUECAT_RECHAZA_SANDBOX = sandboxAntes;
  });

  afterAll(async () => {
    if (secretoAntes === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
    else process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = secretoAntes;
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  const enviar = (event: Record<string, unknown>, autorizacion: string | null = SECRETO) =>
    ctx.app.inject({
      method: 'POST',
      url: '/webhooks/revenuecat',
      headers: {
        'content-type': 'application/json',
        ...(autorizacion !== null ? { authorization: autorizacion } : {}),
      },
      payload: { event },
    });

  const cuerpoDe = (r: Awaited<ReturnType<typeof enviar>>) => r.json() as { data?: { aplicado: boolean; motivo?: string } };

  const evento = (medicoId: string, extra: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    type: 'INITIAL_PURCHASE',
    app_user_id: medicoId,
    entitlement_ids: ['premium'],
    product_id: 'gfh.pro.mensual',
    store: 'APP_STORE',
    environment: 'PRODUCTION',
    expiration_at_ms: Date.now() + 30 * 86_400_000,
    event_timestamp_ms: Date.now(),
    ...extra,
  });

  const nuevoMedico = async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    return m;
  };

  const suscripcionDe = (id: string) => ctx.prisma.suscripcion.findUnique({ where: { medicoId: id } });

  it('sin el secreto correcto no se procesa nada', async () => {
    const m = await nuevoMedico();
    expect((await enviar(evento(m.id), 'otro')).statusCode).toBe(401);
    expect((await enviar(evento(m.id), null)).statusCode).toBe(401);
    expect(await suscripcionDe(m.id)).toBeNull();
  });

  it('una compra válida abre la suscripción', async () => {
    const m = await nuevoMedico();
    expect(cuerpoDe(await enviar(evento(m.id))).data!.aplicado).toBe(true);
    expect((await suscripcionDe(m.id))!.estado).toBe('ACTIVA');
  });

  it('un evento que llega tarde no pisa a uno más nuevo', async () => {
    const m = await nuevoMedico();
    const ahora = Date.now();
    await enviar(evento(m.id, { event_timestamp_ms: ahora - 10_000 }));
    await enviar(evento(m.id, { type: 'EXPIRATION', event_timestamp_ms: ahora }));
    expect((await suscripcionDe(m.id))!.estado).toBe('VENCIDA');

    // Un RENEWAL generado ANTES del vencimiento, entregado después.
    const tarde = await enviar(evento(m.id, { type: 'RENEWAL', event_timestamp_ms: ahora - 5_000 }));

    expect(cuerpoDe(tarde).data!.aplicado).toBe(false);
    expect((await suscripcionDe(m.id))!.estado).toBe('VENCIDA');
  });

  it('un reembolso (CANCELLATION por CUSTOMER_SUPPORT) corta el acceso de inmediato', async () => {
    const m = await nuevoMedico();
    await enviar(evento(m.id, { event_timestamp_ms: Date.now() - 2000 }));

    await enviar(evento(m.id, { type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }));

    expect((await suscripcionDe(m.id))!.estado).toBe('VENCIDA');
    expect((await api.get('/perfil/plan', m.token)).cuerpo!.data.vigente).toBe(false);
  });

  it('una cancelación normal NO corta: sigue vigente hasta el fin de lo pagado', async () => {
    const m = await nuevoMedico();
    await enviar(evento(m.id, { event_timestamp_ms: Date.now() - 2000 }));

    await enviar(evento(m.id, { type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }));

    expect((await suscripcionDe(m.id))!.estado).toBe('CANCELADA');
    expect((await api.get('/perfil/plan', m.token)).cuerpo!.data.vigente).toBe(true);
  });

  it('TRANSFER le quita el acceso a la cuenta de origen', async () => {
    const origen = await nuevoMedico();
    const destino = await nuevoMedico();
    await enviar(evento(origen.id, { event_timestamp_ms: Date.now() - 2000 }));
    expect((await api.get('/perfil/plan', origen.token)).cuerpo!.data.vigente).toBe(true);

    const r = await enviar({
      id: randomUUID(),
      type: 'TRANSFER',
      transferred_from: [origen.id],
      transferred_to: [destino.id],
      event_timestamp_ms: Date.now(),
    });

    expect(cuerpoDe(r).data!.aplicado).toBe(true);
    expect((await api.get('/perfil/plan', origen.token)).cuerpo!.data.vigente).toBe(false);
    // Al destino no se le abre nada sin período conocido.
    expect(await suscripcionDe(destino.id)).toBeNull();
  });

  it('un evento de otro entitlement no abre el acceso', async () => {
    const m = await nuevoMedico();
    const r = await enviar(evento(m.id, { entitlement_ids: ['otro_producto'] }));
    expect(cuerpoDe(r).data!.aplicado).toBe(false);
    expect(await suscripcionDe(m.id)).toBeNull();
  });

  it('el sandbox se rechaza sólo cuando REVENUECAT_RECHAZA_SANDBOX=true', async () => {
    const a = await nuevoMedico();
    const b = await nuevoMedico();

    delete process.env.REVENUECAT_RECHAZA_SANDBOX;
    expect(cuerpoDe(await enviar(evento(a.id, { environment: 'SANDBOX' }))).data!.aplicado).toBe(true);

    process.env.REVENUECAT_RECHAZA_SANDBOX = 'true';
    expect(cuerpoDe(await enviar(evento(b.id, { environment: 'SANDBOX' }))).data!.aplicado).toBe(false);
    expect(await suscripcionDe(b.id)).toBeNull();
  });

  it('cuerpos raros responden 200 sin tocar nada y sin 500', async () => {
    for (const type of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 42, null, {}]) {
      const r = await enviar({ id: randomUUID(), type, app_user_id: randomUUID() });
      expect(r.statusCode, `type=${JSON.stringify(type)}`).toBe(200);
      expect(cuerpoDe(r).data!.aplicado).toBe(false);
    }
    for (const id of [undefined, 12, { a: 1 }, '']) {
      const r = await enviar({ id, type: 'INITIAL_PURCHASE', app_user_id: randomUUID() });
      expect(r.statusCode).toBe(200);
      expect(cuerpoDe(r).data!.aplicado).toBe(false);
    }
    const sinUsuario = await enviar({ id: randomUUID(), type: 'INITIAL_PURCHASE', app_user_id: { $ne: 1 } });
    expect(sinUsuario.statusCode).toBe(200);
    expect(cuerpoDe(sinUsuario).data!.aplicado).toBe(false);
  });

  it('reintentar el mismo evento no lo aplica dos veces', async () => {
    const m = await nuevoMedico();
    const e = evento(m.id);
    expect(cuerpoDe(await enviar(e)).data!.aplicado).toBe(true);
    expect(cuerpoDe(await enviar(e)).data!.aplicado).toBe(false);
  });
});
