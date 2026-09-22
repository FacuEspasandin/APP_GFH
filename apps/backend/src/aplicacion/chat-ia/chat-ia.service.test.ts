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
  ragBuscar?: ReturnType<typeof vi.fn>;
  chatSessionCreate?: ReturnType<typeof vi.fn>;
  chatSessionFindFirst?: ReturnType<typeof vi.fn>;
  chatMessageFindMany?: ReturnType<typeof vi.fn>;
  transaction?: ReturnType<typeof vi.fn>;
}) {
  const cliente = { enviarMensaje: opts.enviarMensaje } as unknown as ClienteAnthropic;
  const catalogo = {} as unknown as CatalogoService;
  const herramientas = { interacciones: opts.interacciones ?? vi.fn() } as unknown as HerramientasService;
  const alternativas = {} as unknown as AlternativasService;
  const rag = { buscar: opts.ragBuscar ?? vi.fn() } as unknown as RagService;

  const chatSessionCreate =
    opts.chatSessionCreate ?? vi.fn().mockResolvedValue({ id: SESSION_ID, medicoId: MEDICO_ID, titulo: null });
  const chatSessionFindFirst = opts.chatSessionFindFirst ?? vi.fn().mockResolvedValue(null);
  const chatMessageFindMany = opts.chatMessageFindMany ?? vi.fn().mockResolvedValue([]);
  const transaction = opts.transaction ?? vi.fn().mockResolvedValue(undefined);

  const prisma = {
    chatSession: { create: chatSessionCreate, findFirst: chatSessionFindFirst },
    chatMessage: { create: vi.fn((args: unknown) => args), findMany: chatMessageFindMany },
    $transaction: transaction,
  } as unknown as PrismaService;

  return {
    servicio: new ChatIaService(cliente, catalogo, herramientas, alternativas, rag, prisma),
    chatSessionCreate,
    chatSessionFindFirst,
    chatMessageFindMany,
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

  it('ficha_tecnica con un fragmento cuyo nombre aparece en la pregunta, marca encontrado:true', async () => {
    const ragBuscar = vi.fn().mockResolvedValue([
      { principioActivoId: ID_VALIDO, nombrePrincipioActivo: 'Metformina', textoChunk: 'posología...', distancia: 0.3 },
    ]);
    const enviarMensaje = vi
      .fn()
      .mockImplementationOnce(async () => usoDeTool('tool-1', 'ficha_tecnica', { pregunta: 'posología metformina' }))
      .mockImplementationOnce(async () => textoFinal('Dosis inicial 500mg.'));

    const { servicio } = construirServicio({ enviarMensaje, ragBuscar });

    const resultado = await servicio.responder(MEDICO_ID, { pregunta: '¿dosis de metformina?' });

    expect(resultado.toolsUsadas).toEqual([
      { tool: 'ficha_tecnica', input: { pregunta: 'posología metformina' }, encontrado: true },
    ]);
  });

  it('ficha_tecnica sin ningún fragmento cuyo nombre aparezca en la pregunta, marca encontrado:false — AUNQUE la distancia sea baja (medido en vivo: un match irrelevante puede dar ~0,39, no sirve como corte)', async () => {
    const ragBuscar = vi.fn().mockResolvedValue([
      { principioActivoId: ID_VALIDO, nombrePrincipioActivo: 'Warfarina', textoChunk: 'irrelevante...', distancia: 0.39 },
    ]);
    const enviarMensaje = vi
      .fn()
      .mockImplementationOnce(async () => usoDeTool('tool-1', 'ficha_tecnica', { pregunta: 'ibuprofeno indicaciones' }))
      .mockImplementationOnce(async () => textoFinal('No tengo ficha técnica de ibuprofeno indexada.'));

    const { servicio } = construirServicio({ enviarMensaje, ragBuscar });

    const resultado = await servicio.responder(MEDICO_ID, { pregunta: 'contame sobre el ibuprofeno' });

    expect(resultado.toolsUsadas).toEqual([
      { tool: 'ficha_tecnica', input: { pregunta: 'ibuprofeno indicaciones' }, encontrado: false },
    ]);
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

  it('con sesión existente, reenvía el historial previo ANTES de la pregunta nueva (sin esto, un followup no tiene contexto)', async () => {
    const chatSessionFindFirst = vi
      .fn()
      .mockResolvedValue({ id: SESSION_ID, medicoId: MEDICO_ID, titulo: 'anterior' });
    // Guardados más nuevo primero, como los devuelve la query real — el
    // servicio tiene que invertirlos antes de mandarlos.
    const chatMessageFindMany = vi.fn().mockResolvedValue([
      { rol: 'ASISTENTE', contenido: 'Sí, interactúan, severidad ALTA.' },
      { rol: 'USUARIO', contenido: '¿Warfarina y amiodarona interactúan?' },
    ]);
    let mensajesEnLlamado: unknown[] = [];
    const enviarMensaje = vi.fn().mockImplementationOnce(async (params: { mensajes: unknown[] }) => {
      mensajesEnLlamado = structuredClone(params.mensajes);
      return textoFinal('Con ClCr 35, ajustar a la mitad.');
    });

    const { servicio } = construirServicio({
      enviarMensaje,
      chatSessionFindFirst,
      chatMessageFindMany,
    });

    await servicio.responder(MEDICO_ID, { sessionId: SESSION_ID, pregunta: '¿Y con un ClCr de 35?' });

    expect(chatMessageFindMany).toHaveBeenCalledWith({
      where: { chatSessionId: SESSION_ID },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { rol: true, contenido: true },
    });

    expect(mensajesEnLlamado).toEqual([
      { role: 'user', content: '¿Warfarina y amiodarona interactúan?' },
      { role: 'assistant', content: 'Sí, interactúan, severidad ALTA.' },
      { role: 'user', content: '¿Y con un ClCr de 35?' },
    ]);
  });

  it('con 2+ intercambios previos (turno 3+), cachea el último mensaje del historial reenviado', async () => {
    const chatSessionFindFirst = vi
      .fn()
      .mockResolvedValue({ id: SESSION_ID, medicoId: MEDICO_ID, titulo: 'anterior' });
    const chatMessageFindMany = vi.fn().mockResolvedValue([
      { rol: 'ASISTENTE', contenido: 'Con ClCr 35, ajustar a la mitad.' },
      { rol: 'USUARIO', contenido: '¿Y con un ClCr de 35?' },
      { rol: 'ASISTENTE', contenido: 'Sí, interactúan, severidad ALTA.' },
      { rol: 'USUARIO', contenido: '¿Warfarina y amiodarona interactúan?' },
    ]);
    let mensajesEnLlamado: unknown[] = [];
    const enviarMensaje = vi.fn().mockImplementationOnce(async (params: { mensajes: unknown[] }) => {
      mensajesEnLlamado = structuredClone(params.mensajes);
      return textoFinal('También hay que vigilar la función hepática.');
    });

    const { servicio } = construirServicio({ enviarMensaje, chatSessionFindFirst, chatMessageFindMany });

    await servicio.responder(MEDICO_ID, { sessionId: SESSION_ID, pregunta: '¿Algo más a vigilar?' });

    // Sólo el ÚLTIMO mensaje del historial lleva el breakpoint — la pregunta
    // nueva queda afuera del bloque cacheado, es la parte fresca de este turno.
    expect(mensajesEnLlamado).toEqual([
      { role: 'user', content: '¿Warfarina y amiodarona interactúan?' },
      { role: 'assistant', content: 'Sí, interactúan, severidad ALTA.' },
      { role: 'user', content: '¿Y con un ClCr de 35?' },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Con ClCr 35, ajustar a la mitad.',
            cache_control: { type: 'ephemeral', ttl: '1h' },
          },
        ],
      },
      { role: 'user', content: '¿Algo más a vigilar?' },
    ]);
  });

  it('sin sessionId (primera pregunta), no hay historial que reenviar', async () => {
    const chatMessageFindMany = vi.fn();
    let mensajesEnLlamado: unknown[] = [];
    const enviarMensaje = vi.fn().mockImplementationOnce(async (params: { mensajes: unknown[] }) => {
      mensajesEnLlamado = structuredClone(params.mensajes);
      return textoFinal('Hola.');
    });

    const { servicio } = construirServicio({ enviarMensaje, chatMessageFindMany });

    await servicio.responder(MEDICO_ID, { pregunta: 'primera pregunta' });

    expect(chatMessageFindMany).not.toHaveBeenCalled();
    expect(mensajesEnLlamado).toEqual([{ role: 'user', content: 'primera pregunta' }]);
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
