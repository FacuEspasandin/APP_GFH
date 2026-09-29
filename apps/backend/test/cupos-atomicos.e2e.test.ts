import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AccesoService } from '../src/aplicacion/suscripcion/acceso.service';
import { ChatIaService } from '../src/aplicacion/chat-ia/chat-ia.service';
import { LIMITE_CONSULTAS_CHAT_24H } from '../src/aplicacion/chat-ia/limites';
import { ClienteAnthropic } from '../src/infraestructura/anthropic/cliente-anthropic';
import { LIMITE_FOTOS_24H } from '../src/aplicacion/foto/foto.service';
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
 * Los cupos que cuestan plata se cuentan y se guardan de forma atómica.
 * Auditoría del 29/9/2026: contar en un paso y guardar en otro dejaba pasar N
 * pedidos simultáneos con "queda 1".
 */
describe('cupos atómicos', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let llamadasAClaude = 0;
  let demoraClaudeMs = 0;

  const claudeFalso = {
    enviarMensaje: async () => {
      llamadasAClaude += 1;
      if (demoraClaudeMs) await new Promise((r) => setTimeout(r, demoraClaudeMs));
      return {
        content: [{ type: 'text', text: 'Respuesta de prueba.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      };
    },
  };

  beforeAll(async () => {
    ctx = await levantarApp({ overrides: [{ provider: ClienteAnthropic, useValue: claudeFalso }] });
    api = cliente(ctx.app);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  describe('plan gratis: consultas de restricción', () => {
    it('20 consultas simultáneas de productos distintos no superan el cupo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const acceso = ctx.app.get(AccesoService);

      const resultados = await Promise.allSettled(
        Array.from({ length: 20 }, () => acceso.consumirConsulta(m.id, randomUUID(), 'RENAL')),
      );

      const cupo = 10;
      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(cupo);
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: m.id } })).toBe(cupo);
    });

    it('repetir el mismo producto no gasta otra consulta', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const acceso = ctx.app.get(AccesoService);
      const producto = randomUUID();

      await Promise.all(Array.from({ length: 5 }, () => acceso.consumirConsulta(m.id, producto, 'RENAL')));

      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: m.id } })).toBe(1);
    });
  });

  describe('foto (Cloud Vision)', () => {
    const claveAntes = process.env.VISION_API_KEY;
    const fetchAntes = globalThis.fetch;
    let visionOk = true;
    let llamadasAVision = 0;

    beforeAll(() => {
      process.env.VISION_API_KEY = 'clave-de-prueba';
      globalThis.fetch = (async () => {
        llamadasAVision += 1;
        if (!visionOk) return new Response('boom', { status: 500 });
        return new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text: 'Ibuprofeno 600 mg' } }] }), {
          status: 200,
        });
      }) as typeof fetch;
    });

    afterAll(() => {
      if (claveAntes === undefined) delete process.env.VISION_API_KEY;
      else process.env.VISION_API_KEY = claveAntes;
      globalThis.fetch = fetchAntes;
    });

    const foto = (token: string, pacienteId: string) =>
      api.post(`/pacientes/${pacienteId}/foto`, { imagenBase64: 'AAAA' }, token);

    it('el paciente de la URL tiene que ser del médico: si no, 404 y sin gastar Vision', async () => {
      const dueno = await crearMedico(api);
      const intruso = await crearMedico(api);
      medicos.push(dueno.id, intruso.id);
      await darSuscripcion(ctx.prisma, dueno.id);
      await darSuscripcion(ctx.prisma, intruso.id);
      const pacienteAjeno = await crearPaciente(api, dueno.token);
      const antes = llamadasAVision;

      const r = await foto(intruso.token, pacienteAjeno);

      expect(r.status).toBe(404);
      expect(llamadasAVision).toBe(antes);
      expect(await ctx.prisma.auditLog.count({ where: { medicoId: intruso.id, accion: 'TREATMENT_LOADED_VIA_PHOTO' } })).toBe(0);
    });

    it('pasado el tope diario responde 429 y no llama a Vision', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);
      const paciente = await crearPaciente(api, m.token);
      await ctx.prisma.auditLog.createMany({
        data: Array.from({ length: LIMITE_FOTOS_24H }, () => ({
          medicoId: m.id,
          accion: 'TREATMENT_LOADED_VIA_PHOTO' as const,
          detalle: paciente,
        })),
      });
      const antes = llamadasAVision;

      const r = await foto(m.token, paciente);

      expect(r.status).toBe(429);
      expect(r.cuerpo!.error!.code).toBe('LIMITE_FOTOS_DIARIO');
      expect(llamadasAVision).toBe(antes);
    });

    it('fotos simultáneas: sólo entran las que quedan del cupo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);
      const paciente = await crearPaciente(api, m.token);
      await ctx.prisma.auditLog.createMany({
        data: Array.from({ length: LIMITE_FOTOS_24H - 3 }, () => ({
          medicoId: m.id,
          accion: 'TREATMENT_LOADED_VIA_PHOTO' as const,
          detalle: paciente,
        })),
      });

      const rs = await Promise.all(Array.from({ length: 10 }, () => foto(m.token, paciente)));

      expect(rs.filter((r) => r.status < 300)).toHaveLength(3);
      expect(rs.filter((r) => r.status === 429)).toHaveLength(7);
    });

    it('si Vision falla, la foto no gasta cupo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);
      const paciente = await crearPaciente(api, m.token);

      visionOk = false;
      try {
        const r = await foto(m.token, paciente);
        expect(r.status).toBe(503);
      } finally {
        visionOk = true;
      }

      expect(await ctx.prisma.auditLog.count({ where: { medicoId: m.id, accion: 'TREATMENT_LOADED_VIA_PHOTO' } })).toBe(0);
    });
  });

  describe('Vera', () => {
    it('la reserva del cupo diario es atómica: 20 en paralelo, sólo entran las que quedan', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const sesion = await ctx.prisma.chatSession.create({ data: { medicoId: m.id, titulo: 'x' } });
      // Ya hay 4 de las 10 usadas.
      await ctx.prisma.chatMessage.createMany({
        data: Array.from({ length: 4 }, () => ({
          chatSessionId: sesion.id,
          medicoId: m.id,
          rol: 'USUARIO' as const,
          contenido: 'previa',
        })),
      });

      const servicio = ctx.app.get(ChatIaService) as unknown as {
        reservarConsulta: (medicoId: string, sesionId: string, pregunta: string) => Promise<unknown>;
      };
      const resultados = await Promise.allSettled(
        Array.from({ length: 20 }, () => servicio.reservarConsulta(m.id, sesion.id, 'pregunta')),
      );

      const entraron = LIMITE_CONSULTAS_CHAT_24H - 4;
      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(entraron);
      expect(
        await ctx.prisma.chatMessage.count({ where: { medicoId: m.id, rol: 'USUARIO' } }),
      ).toBe(LIMITE_CONSULTAS_CHAT_24H);
    });

    it('un médico no puede tener más de 2 consultas en vuelo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      demoraClaudeMs = 400;
      try {
        const respuestas = await Promise.all(
          Array.from({ length: 4 }, (_, i) => api.post('/chat/mensajes', { pregunta: `hola ${i}` }, m.token)),
        );
        const estados = respuestas.map((r) => r.status).sort();
        expect(estados).toEqual([200, 200, 429, 429]);
      } finally {
        demoraClaudeMs = 0;
      }
    });

    it('una pregunta con NUL o con un sustituto suelto se rechaza ANTES de llamar a Claude', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);
      const antes = llamadasAClaude;

      const conNul = await api.post('/chat/mensajes', { pregunta: 'hola\u0000mundo' }, m.token);
      const conSustituto = await api.post('/chat/mensajes', { pregunta: 'hola \ud83d' }, m.token);

      expect(conNul.status).toBe(400);
      expect(conSustituto.status).toBe(400);
      expect(llamadasAClaude).toBe(antes);
    });

    it('si Claude falla, la consulta no se cobra del cupo y no queda una sesión vacía', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      const original = claudeFalso.enviarMensaje;
      claudeFalso.enviarMensaje = async () => {
        throw new Error('Anthropic caído');
      };
      try {
        const r = await api.post('/chat/mensajes', { pregunta: 'hola' }, m.token);
        expect(r.status).toBeGreaterThanOrEqual(500);
      } finally {
        claudeFalso.enviarMensaje = original;
      }

      expect(await ctx.prisma.chatMessage.count({ where: { medicoId: m.id } })).toBe(0);
      const sesiones = await api.get('/chat/sesiones', m.token);
      expect(sesiones.cuerpo!.data).toEqual([]);
    });
  });
});
