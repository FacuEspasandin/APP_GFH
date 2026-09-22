import { describe, expect, it, vi } from 'vitest';

import type { AlternativasService } from '../alternativas/alternativas.service';
import type { CatalogoService } from '../catalogo/catalogo.service';
import type { HerramientasService } from '../herramientas/herramientas.service';
import type { ClienteAnthropic } from '../../infraestructura/anthropic/cliente-anthropic';
import type { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RagService } from '../../infraestructura/rag/rag.service';
import { ChatIaService } from './chat-ia.service';

const ID_VALIDO = '11111111-1111-4111-8111-111111111111';
const ID_VALIDO_2 = '22222222-2222-4222-8222-222222222222';
const MEDICO_ID = 'medico-1';
const SESSION_ID = 'sesion-1';

const USO_FALSO = { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

function textoFinal(texto: string) {
  return { content: [{ type: 'text', text: texto }], stop_reason: 'end_turn' as const, usage: USO_FALSO };
}

function usoDeTool(id: string, name: string, input: unknown) {
  return {
    content: [{ type: 'tool_use', id, name, input }],
    stop_reason: 'tool_use' as const,
    usage: USO_FALSO,
  };
}

function construirServicio(opts: {
  enviarMensaje: ReturnType<typeof vi.fn>;
  interacciones?: ReturnType<typeof vi.fn>;
  chatSessionCreate?: ReturnType<typeof vi.fn>;
  chatSessionFindFirst?: ReturnType<typeof vi.fn>;
  transaction?: ReturnType<typeof vi.fn>;
}) {
  const cliente = { enviarMensaje: opts.enviarMensaje } as unknown as ClienteAnthropic;
  const catalogo = {} as unknown as CatalogoService;
  const herramientas = { interacciones: opts.interacciones ?? vi.fn() } as unknown as HerramientasService;
  const alternativas = {} as unknown as AlternativasService;
  const rag = {} as unknown as RagService;

  const chatSessionCreate =
    opts.chatSessionCreate ?? vi.fn().mockResolvedValue({ id: SESSION_ID, medicoId: MEDICO_ID, titulo: null });
  const chatSessionFindFirst = opts.chatSessionFindFirst ?? vi.fn().mockResolvedValue(null);
  const transaction = opts.transaction ?? vi.fn().mockResolvedValue(undefined);

  const prisma = {
    chatSession: { create: chatSessionCreate, findFirst: chatSessionFindFirst },
    chatMessage: { create: vi.fn((args: unknown) => args) },
    $transaction: transaction,
  } as unknown as PrismaService;

  return {
    servicio: new ChatIaService(cliente, catalogo, herramientas, alternativas, rag, prisma),
    chatSessionCreate,
    chatSessionFindFirst,
    transaction,
  };
}

describe('ChatIaService.responder', () => {
  it('sin tool_use, contesta directo con el texto del modelo', async () => {
    const enviarMensaje = vi.fn().mockResolvedValue(textoFinal('Hola, ¿en qué te ayudo?'));
    const { servicio, transaction } = construirServicio({ enviarMensaje });

    const resultado = await servicio.responder(MEDICO_ID, { pregunta: '¿cómo estás?' });

    expect(enviarMensaje).toHaveBeenCalledTimes(1);
    expect(resultado.respuesta).toBe('Hola, ¿en qué te ayudo?');
    expect(resultado.toolsUsadas).toEqual([]);
    expect(resultado.sessionId).toBe(SESSION_ID);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('con tool_use, ejecuta la tool real y le devuelve el resultado al modelo antes de la respuesta final', async () => {
    const interacciones = vi.fn().mockResolvedValue({ pares: [{ severidad: 'ALTA' }] });
    const mensajesEnSegundoLlamado: unknown[] = [];
    const enviarMensaje = vi
      .fn()
      .mockImplementationOnce(async () =>
        usoDeTool('tool-1', 'interacciones_farmaco_farmaco', {
          principioActivoIds: [ID_VALIDO, ID_VALIDO_2],
        }),
      )
      .mockImplementationOnce(async (params: { mensajes: unknown[] }) => {
        // Capturado EN el momento del llamado: `mensajes` es la misma
        // referencia que el servicio sigue mutando después, así que mirarla
        // al final del test mostraría el estado final, no el de este turno.
        mensajesEnSegundoLlamado.push(...structuredClone(params.mensajes));
        return textoFinal('Hay una interacción de severidad alta.');
      });

    const { servicio } = construirServicio({ enviarMensaje, interacciones });

    const resultado = await servicio.responder(MEDICO_ID, {
      pregunta: '¿interactúan estos dos fármacos?',
    });

    expect(interacciones).toHaveBeenCalledWith({ principioActivoIds: [ID_VALIDO, ID_VALIDO_2] });
    expect(resultado.respuesta).toBe('Hay una interacción de severidad alta.');
    expect(resultado.toolsUsadas).toEqual([
      { tool: 'interacciones_farmaco_farmaco', input: { principioActivoIds: [ID_VALIDO, ID_VALIDO_2] } },
    ]);

    // El segundo llamado al modelo tiene que llevar el tool_result del turno anterior.
    const ultimoMensaje = mensajesEnSegundoLlamado[mensajesEnSegundoLlamado.length - 1] as {
      role: string;
      content: Array<{ type: string; tool_use_id: string }>;
    };
    expect(ultimoMensaje.role).toBe('user');
    expect(ultimoMensaje.content[0]!.type).toBe('tool_result');
    expect(ultimoMensaje.content[0]!.tool_use_id).toBe('tool-1');
  });

  it('si la tool falla, el modelo recibe un tool_result de error y la conversación sigue (no crashea)', async () => {
    const interacciones = vi.fn().mockRejectedValue(new Error('motor clínico no disponible'));
    const mensajesEnSegundoLlamado: unknown[] = [];
    const enviarMensaje = vi
      .fn()
      .mockImplementationOnce(async () =>
        usoDeTool('tool-1', 'interacciones_farmaco_farmaco', {
          principioActivoIds: [ID_VALIDO, ID_VALIDO_2],
        }),
      )
      .mockImplementationOnce(async (params: { mensajes: unknown[] }) => {
        mensajesEnSegundoLlamado.push(...structuredClone(params.mensajes));
        return textoFinal('No pude cruzar esos fármacos ahora.');
      });

    const { servicio } = construirServicio({ enviarMensaje, interacciones });

    const resultado = await servicio.responder(MEDICO_ID, { pregunta: 'cruzá estos dos' });

    expect(resultado.respuesta).toBe('No pude cruzar esos fármacos ahora.');
    const ultimoMensaje = mensajesEnSegundoLlamado[mensajesEnSegundoLlamado.length - 1] as {
      content: Array<{ is_error?: boolean; content: string }>;
    };
    expect(ultimoMensaje.content[0]!.is_error).toBe(true);
    expect(ultimoMensaje.content[0]!.content).toMatch(/motor clínico no disponible/);
  });

  it('reusa una sesión existente en vez de crear una nueva cuando llega sessionId', async () => {
    const chatSessionFindFirst = vi
      .fn()
      .mockResolvedValue({ id: SESSION_ID, medicoId: MEDICO_ID, titulo: 'anterior' });
    const chatSessionCreate = vi.fn();
    const enviarMensaje = vi.fn().mockResolvedValue(textoFinal('seguimos'));

    const { servicio } = construirServicio({ enviarMensaje, chatSessionFindFirst, chatSessionCreate });

    const resultado = await servicio.responder(MEDICO_ID, { sessionId: SESSION_ID, pregunta: 'seguí' });

    expect(chatSessionFindFirst).toHaveBeenCalledWith({ where: { id: SESSION_ID, medicoId: MEDICO_ID } });
    expect(chatSessionCreate).not.toHaveBeenCalled();
    expect(resultado.sessionId).toBe(SESSION_ID);
  });

  it('si el modelo no termina en 6 vueltas, devuelve un mensaje de fallback en vez de colgarse', async () => {
    const interacciones = vi.fn().mockResolvedValue({ pares: [] });
    const enviarMensaje = vi
      .fn()
      .mockResolvedValue(
        usoDeTool('tool-loop', 'interacciones_farmaco_farmaco', {
          principioActivoIds: [ID_VALIDO, ID_VALIDO_2],
        }),
      );

    const { servicio } = construirServicio({ enviarMensaje, interacciones });

    const resultado = await servicio.responder(MEDICO_ID, { pregunta: 'preguntá algo raro' });

    expect(enviarMensaje).toHaveBeenCalledTimes(6);
    expect(resultado.respuesta).toMatch(/no pude terminar/i);
  });
});
