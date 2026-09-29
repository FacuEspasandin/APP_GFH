import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TOPES } from '../src/aplicacion/topes';
import {
  borrarMedicos,
  buscarPrincipioActivo,
  cliente,
  crearMedico,
  crearPaciente,
  darSuscripcion,
  levantarApp,
  type Contexto,
} from './ayuda';

/** Fase 2 de la auditoría del 29/9/2026: topes por médico y tool de alergias. */
describe('topes por médico y herramienta de alergias', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  const conSuscripcion = async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await darSuscripcion(ctx.prisma, m.id);
    return m;
  };

  describe('topes', () => {
    it('grupos: pasado el tope responde 422 TOPE_ALCANZADO', async () => {
      const m = await conSuscripcion();
      await ctx.prisma.grupo.createMany({
        data: Array.from({ length: TOPES.grupos }, (_, i) => ({ medicoId: m.id, nombre: `Grupo ${i}` })),
      });

      const r = await api.post('/grupos', { nombre: 'uno más' }, m.token);

      expect(r.status).toBe(422);
      expect(r.cuerpo!.error!.code).toBe('TOPE_ALCANZADO');
    });

    it('fármacos por paciente: pasado el tope responde 422', async () => {
      const m = await conSuscripcion();
      const paciente = await crearPaciente(api, m.token);
      await ctx.prisma.prescripcion.createMany({
        data: Array.from({ length: TOPES.prescripcionesPorPaciente }, (_, i) => ({
          medicoId: m.id,
          pacienteId: paciente,
          esFarmacoLibre: true,
          nombreLibre: `Preparado ${i}`,
          dosis: '1',
          frecuencia: 'cada 24 h',
          via: 'ORAL' as const,
        })),
      });

      const r = await api.post(
        `/pacientes/${paciente}/prescripciones`,
        { esFarmacoLibre: true, nombreLibre: 'uno más', dosis: '1', frecuencia: 'cada 24 h', via: 'ORAL' },
        m.token,
      );

      expect(r.status).toBe(422);
      expect(r.cuerpo!.error!.code).toBe('TOPE_ALCANZADO');
    });

    it('dispositivos push: se conservan los 10 más recientes', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      for (let i = 0; i < TOPES.dispositivosPush + 3; i += 1) {
        const token = `ExponentPushToken[tope-${m.id.slice(0, 8)}-${i}-xxxxxxxx]`;
        const r = await api.post('/perfil/push-token', { token, plataforma: 'ANDROID' }, m.token);
        expect(r.status, JSON.stringify(r.cuerpo)).toBeLessThan(300);
      }

      const tokens = await ctx.prisma.pushToken.findMany({ where: { medicoId: m.id } });
      expect(tokens).toHaveLength(TOPES.dispositivosPush);
      // Sobrevivieron los últimos; los primeros se descartaron.
      expect(tokens.some((t) => t.token.includes('-12-'))).toBe(true);
      expect(tokens.some((t) => t.token.includes('-0-'))).toBe(false);
    });
  });

  describe('herramienta condición/alergia', () => {
    it('alergia exacta GRAVE al mismo fármaco BLOQUEA', async () => {
      const m = await conSuscripcion();
      const pa = await buscarPrincipioActivo(api, m.token, 'Ibuprofeno');

      const r = await api.post(
        '/herramientas/condicion-alergia',
        { principioActivoId: pa.id, alergiaPrincipioActivoIds: [pa.id], severidadAlergia: 'GRAVE' },
        m.token,
      );

      expect(r.status).toBe(200);
      const alergias = r.cuerpo!.data.alergias as Array<{ tipo: string; bloquea: boolean }>;
      expect(alergias).toHaveLength(1);
      expect(alergias[0]).toMatchObject({ tipo: 'EXACTA', bloquea: true });
    });

    it('la misma alergia exacta LEVE no bloquea (la severidad decide)', async () => {
      const m = await conSuscripcion();
      const pa = await buscarPrincipioActivo(api, m.token, 'Ibuprofeno');

      const r = await api.post(
        '/herramientas/condicion-alergia',
        { principioActivoId: pa.id, alergiaPrincipioActivoIds: [pa.id], severidadAlergia: 'LEVE' },
        m.token,
      );

      expect(r.cuerpo!.data.alergias[0].bloquea).toBe(false);
    });

    it('con alergia y sin severidad se rechaza: ya no se supone MODERADA', async () => {
      const m = await conSuscripcion();
      const pa = await buscarPrincipioActivo(api, m.token, 'Ibuprofeno');

      const r = await api.post(
        '/herramientas/condicion-alergia',
        { principioActivoId: pa.id, alergiaPrincipioActivoIds: [pa.id] },
        m.token,
      );

      expect(r.status).toBe(400);
    });

    it('sin ninguna alergia la severidad no hace falta', async () => {
      const m = await conSuscripcion();
      const pa = await buscarPrincipioActivo(api, m.token, 'Ibuprofeno');

      const r = await api.post('/herramientas/condicion-alergia', { principioActivoId: pa.id }, m.token);

      expect(r.status).toBe(200);
    });
  });
});
