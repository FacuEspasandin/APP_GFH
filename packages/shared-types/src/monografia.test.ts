import { describe, expect, it } from 'vitest';

import { enOraciones, SECCIONES_MONOGRAFIA, seccionesDe } from './monografia';

describe('secciones de la monografía', () => {
  it('sin monografía no hay secciones', () => {
    expect(seccionesDe(null)).toEqual([]);
    expect(seccionesDe(undefined)).toEqual([]);
    expect(seccionesDe({})).toEqual([]);
  });

  it('una sección vacía no aparece: mostrarla haría creer que no hay dato', () => {
    const s = seccionesDe({ posologia: '500 mg c/12 h.', interacciones: '', embarazo: null });
    expect(s.map((x) => x.clave)).toEqual(['posologia']);
  });

  it('el orden es el de consulta, no el de la fuente', () => {
    // Un médico entra por posología o interacciones, no por descripción.
    const s = seccionesDe({ descripcion: 'a', posologia: 'b', interacciones: 'c' });
    expect(s.map((x) => x.clave)).toEqual(['posologia', 'interacciones', 'descripcion']);
  });

  it('cada clave declarada tiene título y glosa, y no hay repetidas', () => {
    const claves = SECCIONES_MONOGRAFIA.map((s) => s.clave);
    expect(new Set(claves).size).toBe(claves.length);
    expect(SECCIONES_MONOGRAFIA.every((s) => s.titulo && s.glosa)).toBe(true);
  });

  it('el texto se recorta', () => {
    expect(seccionesDe({ usos: '  Fiebre.  ' })[0]!.texto).toBe('Fiebre.');
  });
});

describe('partir en oraciones', () => {
  it('el texto telegráfico se abre en renglones', () => {
    expect(enOraciones('Insuf. hepática. Miastenia gravis. Cardiopatía.')).toEqual([
      'Insuf. hepática.',
      'Miastenia gravis.',
      'Cardiopatía.',
    ]);
  });

  it('«Vit. E» no es el final de una oración', () => {
    // Warfarina real. Cortando por punto+mayúscula salían tres renglones y uno
    // de ellos era «E, Vit.», que no quiere decir nada.
    expect(
      enOraciones(
        'Dietas ricas en alimentos que la contienen, Vit. E, Vit. C y polivitamínicos, ' +
          'así como la vitamina K, reducen los efectos anticoagulantes. ' +
          'Incrementa la acción de hipoglucemiantes orales.',
      ),
    ).toEqual([
      'Dietas ricas en alimentos que la contienen, Vit. E, Vit. C y polivitamínicos, ' +
        'así como la vitamina K, reducen los efectos anticoagulantes.',
      'Incrementa la acción de hipoglucemiantes orales.',
    ]);
  });

  it('la inicial de un género bacteriano tampoco corta', () => {
    expect(enOraciones('Infecciones por S. aureus. Otitis media.')).toEqual([
      'Infecciones por S. aureus.',
      'Otitis media.',
    ]);
  });

  it('un punto seguido de minúscula nunca corta', () => {
    expect(enOraciones('En insuf. renal ajustar dosis.')).toEqual([
      'En insuf. renal ajustar dosis.',
    ]);
  });

  it('nunca se pierde texto', () => {
    const original =
      'Uso concomitante con antiarrítmicos clase IA y III aumenta riesgo. ' +
      'Pueden disminuir la eficacia de anticonceptivos orales. ' +
      'Inhibe la glicoproteína-P (por ej, digoxina).';
    expect(enOraciones(original).join(' ')).toBe(original);
  });
});
