import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';

import type { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { LIMITE_CONSULTAS_CHAT_24H, LimiteChatDiarioGuard } from './limite-chat-diario.guard';

const MEDICO_ID = 'medico-1';

function contextoFalso(medicoId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ medicoId }),
    }),
  } as unknown as ExecutionContext;
}

describe('LimiteChatDiarioGuard', () => {
  it('deja pasar si todavía no llegó al límite', async () => {
    const count = vi.fn().mockResolvedValue(LIMITE_CONSULTAS_CHAT_24H - 1);
    const prisma = { chatMessage: { count } } as unknown as PrismaService;
    const guard = new LimiteChatDiarioGuard(prisma);

    await expect(guard.canActivate(contextoFalso(MEDICO_ID))).resolves.toBe(true);
  });

  it('bloquea con un código y mensaje claros al llegar al límite', async () => {
    const count = vi.fn().mockResolvedValue(LIMITE_CONSULTAS_CHAT_24H);
    const prisma = { chatMessage: { count } } as unknown as PrismaService;
    const guard = new LimiteChatDiarioGuard(prisma);

    // El cuerpo va como objeto {codigo, mensaje} — mismo patrón que PlanGuard
    // — así el filtro de excepciones global lo respeta como código propio en
    // vez de aplastarlo al genérico "SIN_PERMISO" del status 403.
    await expect(guard.canActivate(contextoFalso(MEDICO_ID))).rejects.toMatchObject({
      response: { codigo: 'LIMITE_CHAT_DIARIO', mensaje: expect.stringMatching(/límite/i) },
    });
  });

  it('cuenta sólo mensajes de USUARIO de las últimas 24h de ESE médico', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { chatMessage: { count } } as unknown as PrismaService;
    const guard = new LimiteChatDiarioGuard(prisma);

    await guard.canActivate(contextoFalso(MEDICO_ID));

    const llamado = count.mock.calls[0]![0] as { where: { medicoId: string; rol: string; createdAt: { gte: Date } } };
    expect(llamado.where.medicoId).toBe(MEDICO_ID);
    expect(llamado.where.rol).toBe('USUARIO');
    // Ventana móvil de 24h, no "desde medianoche" — el gte tiene que ser
    // ~24h atrás desde ahora, no el inicio del día calendario.
    const haceUnDia = Date.now() - 24 * 60 * 60 * 1000;
    expect(Math.abs(llamado.where.createdAt.gte.getTime() - haceUnDia)).toBeLessThan(2000);
  });

  it('sin medicoId (no debería pasar nunca el JwtGuard, pero por las dudas), no deja pasar', async () => {
    const prisma = { chatMessage: { count: vi.fn() } } as unknown as PrismaService;
    const guard = new LimiteChatDiarioGuard(prisma);

    await expect(guard.canActivate(contextoFalso(undefined))).resolves.toBe(false);
  });
});
