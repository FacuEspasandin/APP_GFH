import { beforeEach, describe, expect, it, vi } from 'vitest';

const { crearMock, mensajesCreateMock } = vi.hoisted(() => {
  const mensajesCreateMock = vi.fn();
  const crearMock = vi.fn().mockImplementation(() => ({ messages: { create: mensajesCreateMock } }));
  return { crearMock, mensajesCreateMock };
});
vi.mock('@anthropic-ai/sdk', () => ({ default: crearMock }));

import { ClienteAnthropic } from './cliente-anthropic';

describe('ClienteAnthropic', () => {
  beforeEach(() => {
    crearMock.mockClear();
    mensajesCreateMock.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
  });

  const PARAMS = { sistema: 'sos un asistente', mensajes: [{ role: 'user' as const, content: 'hola' }], tools: [] };

  it('sin ANTHROPIC_API_KEY, tira un error claro en vez de fallar en silencio', async () => {
    await expect(new ClienteAnthropic().enviarMensaje(PARAMS)).rejects.toThrow(/no está configurado/);
    expect(mensajesCreateMock).not.toHaveBeenCalled();
  });

  it('con clave configurada, llama al SDK y devuelve el mensaje', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    const mensajeEsperado = { role: 'assistant', content: [{ type: 'text', text: 'hola' }], stop_reason: 'end_turn' };
    mensajesCreateMock.mockResolvedValue(mensajeEsperado);

    const resultado = await new ClienteAnthropic().enviarMensaje(PARAMS);

    expect(resultado).toBe(mensajeEsperado);
    expect(mensajesCreateMock).toHaveBeenCalledTimes(1);
    const llamado = mensajesCreateMock.mock.calls[0]![0];
    expect(llamado.system).toBe('sos un asistente');
  });

  it('si el SDK falla, propaga una excepción clara en vez de dejar el error crudo', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    mensajesCreateMock.mockRejectedValue(new Error('529 overloaded'));

    await expect(new ClienteAnthropic().enviarMensaje(PARAMS)).rejects.toThrow(/no pudo responder/i);
  });
});
