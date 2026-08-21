import { describe, expect, it } from 'vitest';

import {
  viaCorta,
  viaLegible,
  VIAS_DE_LA_FUENTE,
  VIAS_OFRECIDAS,
  VIAS_PARA_PRESCRIBIR,
} from './vias';

describe('viaLegible', () => {
  it('escribe la vía con su preposición', () => {
    expect(viaLegible('ORAL')).toBe('vía oral');
    expect(viaLegible('IV')).toBe('vía intravenosa');
  });

  it('NO_ESPECIFICADA no se escribe: un renglón para no informar nada', () => {
    expect(viaLegible('NO_ESPECIFICADA')).toBeNull();
  });

  it('OTRA no lleva «vía» adelante', () => {
    expect(viaLegible('OTRA')).toBe('otra vía');
  });

  it('una vía sin rótulo cae al código en minúsculas, no rompe', () => {
    expect(viaLegible('EPIDURAL')).toBe('epidural');
  });
});

describe('viaCorta', () => {
  it('saca el «vía» para los chips', () => {
    expect(viaCorta('ORAL')).toBe('oral');
    expect(viaCorta('SUBLINGUAL')).toBe('sublingual');
  });

  it('la que no empieza con «vía» queda igual', () => {
    expect(viaCorta('OTRA')).toBe('otra vía');
  });
});

describe('los vocabularios', () => {
  it('todas las que se ofrecen tienen rótulo: un chip sin texto no se puede tocar a ciegas', () => {
    for (const v of VIAS_OFRECIDAS) expect(viaLegible(v)).not.toBeNull();
  });

  it('no se ofrece NO_ESPECIFICADA: es lo que llega sin dato, no algo que alguien elija', () => {
    expect(VIAS_OFRECIDAS).not.toContain('NO_ESPECIFICADA');
  });

  it('los dos vocabularios no se pisan', () => {
    const fuente = new Set<string>(VIAS_DE_LA_FUENTE);
    for (const v of VIAS_PARA_PRESCRIBIR) expect(fuente.has(v)).toBe(false);
  });
});
