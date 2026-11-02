import { randomUUID } from 'node:crypto';

import { VERSION_CONSENTIMIENTO } from '@gfh/shared-types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  cliente,
  crearMedico,
  crearPaciente,
  darSuscripcion,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * Vera y la carga por foto mandan datos a un tercero (Anthropic, Google Cloud
 * Vision). Apple exige permiso expreso antes (guideline 5.1.2(i)) y el que
 * decide es el backend, no la app: un cliente viejo o un script no pueden
 * saltearlo.
 */
describe('consentimientos', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
  });

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  const conPlan = async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await darSuscripcion(ctx.prisma, m.id);
    return m;
  };

  it('sin permiso, Vera responde 403 CONSENTIMIENTO_REQUERIDO y no crea nada', async () => {
    const m = await conPlan();

    const r = await api.post('/chat/mensajes', { pregunta: 'hola' }, m.token);

    expect(r.status).toBe(403);
    expect(r.cuerpo!.error!.code).toBe('CONSENTIMIENTO_REQUERIDO');
    expect(await ctx.prisma.chatMessage.count({ where: { medicoId: m.id } })).toBe(0);
  });

  it('sin permiso, la foto responde 403 antes de tocar al proveedor', async () => {
    const m = await conPlan();
    const paciente = await crearPaciente(api, m.token);

    const r = await api.post(`/pacientes/${paciente}/foto`, { imagenBase64: 'AAAA' }, m.token);

    expect(r.status).toBe(403);
    expect(r.cuerpo!.error!.code).toBe('CONSENTIMIENTO_REQUERIDO');
  });

  it('pegar texto para matchear NO necesita el permiso: no sale a ningún tercero', async () => {
    const m = await conPlan();

    const r = await api.post(
      `/pacientes/${randomUUID()}/lineas/matchear`,
      { textos: ['ibuprofeno 600 mg'] },
      m.token,
    );

    expect(r.status).not.toBe(403);
  });

  it('aceptar guarda la versión y la fecha, y el perfil lo dice', async () => {
    const m = await conPlan();

    const r = await api.post(
      '/auth/consentimientos',
      { tipo: 'VERA', version: VERSION_CONSENTIMIENTO.VERA },
      m.token,
    );
    expect(r.status).toBe(204);

    const yo = await api.get('/auth/yo', m.token);
    expect(yo.cuerpo!.data.consentimientoVeraVersion).toBe(VERSION_CONSENTIMIENTO.VERA);
    expect(yo.cuerpo!.data.consentimientoVeraAt).toBeTruthy();
    // Aceptar uno no acepta el otro.
    expect(yo.cuerpo!.data.consentimientoFotoVersion).toBeNull();
  });

  it('una versión que no es la vigente se rechaza: no se da por probado un texto que no se leyó', async () => {
    const m = await conPlan();

    const r = await api.post('/auth/consentimientos', { tipo: 'FOTO', version: '0.1' }, m.token);

    expect(r.status).toBe(409);
    const yo = await api.get('/auth/yo', m.token);
    expect(yo.cuerpo!.data.consentimientoFotoVersion).toBeNull();
  });

  it('un tipo desconocido se rechaza', async () => {
    const m = await conPlan();
    const r = await api.post('/auth/consentimientos', { tipo: 'OTRO', version: '1.0' }, m.token);
    expect(r.status).toBe(400);
  });

  it('con el permiso, el guard deja pasar (la foto llega al servicio)', async () => {
    const m = await conPlan();
    const paciente = await crearPaciente(api, m.token);
    await api.post('/auth/consentimientos', { tipo: 'FOTO', version: VERSION_CONSENTIMIENTO.FOTO }, m.token);

    const r = await api.post(`/pacientes/${paciente}/foto`, { imagenBase64: '' }, m.token);

    // Puede ser 501 (sin proveedor configurado) o 400 (imagen vacía): lo que no
    // puede ser es el 403 del permiso.
    expect(r.cuerpo?.error?.code).not.toBe('CONSENTIMIENTO_REQUERIDO');
  });

  it('retirar el permiso vuelve a bloquear y queda registrado', async () => {
    const m = await conPlan();
    await api.post('/auth/consentimientos', { tipo: 'VERA', version: VERSION_CONSENTIMIENTO.VERA }, m.token);

    const retirado = await api.delete('/auth/consentimientos/VERA', m.token);
    expect(retirado.status).toBe(204);

    const r = await api.post('/chat/mensajes', { pregunta: 'hola' }, m.token);
    expect(r.status).toBe(403);
    expect(r.cuerpo!.error!.code).toBe('CONSENTIMIENTO_REQUERIDO');

    const huellas = await ctx.prisma.auditLog.findMany({
      where: { medicoId: m.id, detalle: { startsWith: 'consentimiento VERA' } },
      select: { detalle: true },
    });
    expect(huellas.map((h) => h.detalle)).toEqual(
      expect.arrayContaining([`consentimiento VERA aceptado v${VERSION_CONSENTIMIENTO.VERA}`, 'consentimiento VERA retirado']),
    );
  });

  it('los términos no se «retiran»: se termina eliminando la cuenta', async () => {
    const m = await conPlan();
    const r = await api.delete('/auth/consentimientos/TERMINOS', m.token);
    expect(r.status).toBe(400);
  });

  it('sin sesión, ninguno de los dos endpoints funciona', async () => {
    expect((await api.post('/auth/consentimientos', { tipo: 'VERA', version: '1.0' })).status).toBe(401);
    expect((await api.delete('/auth/consentimientos/VERA')).status).toBe(401);
  });
});

describe('eliminar cuenta con suscripción vigente', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
  });

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('se puede: la baja no depende de cancelar antes en la tienda (guideline 5.1.1(v))', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await darSuscripcion(ctx.prisma, m.id);

    const r = await api.post('/perfil/eliminar-cuenta', { password: 'PruebaIntegracion1' }, m.token);

    expect(r.status).toBe(204);
    const medico = await ctx.prisma.medico.findUnique({ where: { id: m.id } });
    expect(medico?.estado).toBe('ELIMINADO');
  });

  it('con la contraseña equivocada no se elimina', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await api.post('/perfil/eliminar-cuenta', { password: 'esta-no-es' }, m.token);

    expect(r.status).toBe(409);
    expect((await ctx.prisma.medico.findUnique({ where: { id: m.id } }))?.estado).toBe('ACTIVO');
  });

  it('sin contraseña ni token de Google tampoco', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await api.post('/perfil/eliminar-cuenta', {}, m.token);

    expect(r.status).toBe(409);
  });

  it('el perfil dice cómo entra la cuenta, sin devolver ni la contraseña ni el id de Google', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const yo = await api.get('/auth/yo', m.token);

    expect(yo.cuerpo!.data.tienePassword).toBe(true);
    expect(yo.cuerpo!.data.tieneGoogle).toBe(false);
    expect(yo.cuerpo!.data).not.toHaveProperty('passwordHash');
    expect(yo.cuerpo!.data).not.toHaveProperty('googleId');
  });
});
