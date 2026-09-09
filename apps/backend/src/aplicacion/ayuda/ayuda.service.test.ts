import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enviarMock } = vi.hoisted(() => ({ enviarMock: vi.fn() }));
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: enviarMock } })),
}));

import { AyudaService, type ReporteAyuda } from './ayuda.service';

const REPORTE: ReporteAyuda = {
  nombre: 'Ana',
  apellido: 'Pérez',
  telefono: '099123456',
  correo: 'ana@correo.com',
  tipo: 'ERROR',
  descripcion: 'La app se cerró al agregar un fármaco.',
};

describe('AyudaService', () => {
  beforeEach(() => {
    enviarMock.mockReset();
    delete process.env.RESEND_API_KEY;
  });

  it('obtenerFaq devuelve las preguntas reales de docs/data/ayuda-faq.json', () => {
    const faq = new AyudaService().obtenerFaq();
    expect(faq.length).toBeGreaterThan(5);
    expect(faq[0]).toHaveProperty('pregunta');
    expect(faq[0]).toHaveProperty('respuesta');
  });

  it('obtenerProblemas devuelve las entradas reales de docs/data/ayuda-problemas.json', () => {
    const problemas = new AyudaService().obtenerProblemas();
    expect(problemas.length).toBeGreaterThan(5);
    expect(problemas[0]).toHaveProperty('categoria');
    expect(problemas[0]).toHaveProperty('titulo');
  });

  it('sin RESEND_API_KEY, tira un error claro en vez de fallar en silencio', async () => {
    await expect(new AyudaService().enviarReporte('medico-1', REPORTE)).rejects.toThrow(
      /no está configurado/,
    );
    expect(enviarMock).not.toHaveBeenCalled();
  });

  it('con RESEND_API_KEY, manda el email al destino correcto', async () => {
    process.env.RESEND_API_KEY = 'clave-de-prueba';
    enviarMock.mockResolvedValue({ data: { id: '1' }, error: null });

    await new AyudaService().enviarReporte('medico-1', {
      ...REPORTE,
      tipo: 'SUGERENCIA',
    });

    expect(enviarMock).toHaveBeenCalledTimes(1);
    const llamado = enviarMock.mock.calls[0]![0];
    expect(llamado.to).toBe('gfh.uruguay@gmail.com');
    expect(llamado.replyTo).toBe('ana@correo.com');
    expect(llamado.subject).toContain('Sugerencia');
    expect(llamado.text).toContain('medico-1');
  });

  it('si Resend devuelve error, propaga una excepción clara en vez de un 204 falso', async () => {
    process.env.RESEND_API_KEY = 'clave-de-prueba';
    enviarMock.mockResolvedValue({ data: null, error: { message: 'dominio no verificado' } });

    await expect(new AyudaService().enviarReporte('medico-1', REPORTE)).rejects.toThrow(
      /no se pudo enviar/i,
    );
  });
});
