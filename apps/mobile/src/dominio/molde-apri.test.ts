import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularApriParaMolde, moldeApri } from './molde-apri';

describe('molde de APRI', () => {
  it('declara los tres valores, en orden', () => {
    const m = moldeApri();
    expect(m.campos.map((c) => c.clave)).toEqual(['astUI', 'astUlnUI', 'plaquetasMiles']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularApriParaMolde({ astUI: '80' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('APRI = (AST / ULN) / plaquetas × 100', () => {
    const r = calcularApriParaMolde({ astUI: '80', astUlnUI: '40', plaquetasMiles: '100' }, {});
    expect(r.valor?.valor).toBe(2);
  });

  it('los cortes son 0,5 y 1,5', () => {
    const m = moldeApri();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0.5)?.rotulo).toContain('Baja');
    expect(tramoDe(tramos, 1)?.rotulo).toBe('Indeterminado');
    expect(tramoDe(tramos, 1.51)?.rotulo).toContain('Alta');
  });
});
