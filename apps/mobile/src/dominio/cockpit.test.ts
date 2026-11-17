import { describe, expect, it } from 'vitest';

import {
  destacados,
  filaSinVerificarCompleto,
  hepaticoSinEvaluar,
  invalidarPaciente,
  opcionesDelPaciente,
  peoresPorCategoria,
  precargarCockpits,
  renalSinEvaluar,
  rutaEditarPrescripcion,
  type HallazgoResumible,
} from './cockpit';

const h = (categoria: HallazgoResumible['categoria'], rango: 0 | 1 | 2 | 3): HallazgoResumible => ({
  categoria,
  rango,
});

describe('peor rango por categoría', () => {
  it('se queda con el más grave de cada una', () => {
    const r = peoresPorCategoria([
      h('INTERACCION', 3),
      h('INTERACCION', 1),
      h('CONDICION', 2),
      h('AJUSTE_RENAL', 0),
    ]);

    expect(r.INTERACCION).toBe(1);
    expect(r.CONDICION).toBe(2);
    expect(r.AJUSTE_RENAL).toBe(0);
  });

  it('la categoría sin hallazgos queda ausente, no en 3', () => {
    // Ausente y "informativo" no son lo mismo: uno es que no hay nada, el otro
    // es que hay algo leve.
    const r = peoresPorCategoria([h('INTERACCION', 1)]);
    expect(r.AJUSTE_HEPATICO).toBeUndefined();
    expect('AJUSTE_HEPATICO' in r).toBe(false);
  });
});

describe('hallazgos destacados', () => {
  it('sube los más graves primero', () => {
    const hallazgos = [h('CONDICION', 3), h('INTERACCION', 0), h('CONDICION', 2)];
    expect(destacados(hallazgos).map((x) => x.rango)).toEqual([0, 2]);
  });

  it('con menos que el corte devuelve los que hay', () => {
    expect(destacados([h('INTERACCION', 1)])).toHaveLength(1);
  });

  it('no muta la lista original', () => {
    const hallazgos = [h('CONDICION', 3), h('INTERACCION', 0)];
    destacados(hallazgos);
    expect(hallazgos[0]!.rango).toBe(3);
  });
});

describe('ajuste hepático sin evaluar', () => {
  it('lo detecta desde el aviso del motor, no de una constante', () => {
    expect(hepaticoSinEvaluar([{ codigo: 'SIN_CHILD_PUGH' }])).toBe(true);
    // Con la clase cargada el motivo cambia —falta la tabla, no el dato— pero
    // sigue sin poder evaluar, así que sigue mostrando «—» y no «0».
    expect(hepaticoSinEvaluar([{ codigo: 'SIN_TABLA_HEPATICA' }])).toBe(true);
  });

  it('con estado hepático cargado, cero significa cero', () => {
    expect(hepaticoSinEvaluar([{ codigo: 'SIN_CLCR' }])).toBe(false);
    expect(hepaticoSinEvaluar([])).toBe(false);
  });
});

describe('ajuste renal sin evaluar', () => {
  it('sin Clcr el motor avisa SIN_CLCR y el cockpit muestra «—», no «0»', () => {
    expect(renalSinEvaluar([{ codigo: 'SIN_CLCR' }])).toBe(true);
  });

  it('con Clcr, cero significa cero', () => {
    expect(renalSinEvaluar([])).toBe(false);
    expect(renalSinEvaluar([{ codigo: 'SIN_CHILD_PUGH' }])).toBe(false);
  });
});

/**
 * El menú de los «···».
 *
 * Lo que importa acá es el subtítulo: convierte el menú en un resumen de qué
 * datos tiene cargados el paciente, y equivocarlo es afirmar algo falso sobre
 * un dato clínico.
 */
describe('opciones del paciente', () => {
  const vacio: Parameters<typeof opcionesDelPaciente>[1] = {
    clcrMlMin: null,
    clcrOrigen: null,
    childPughClase: null,
    semanaGestacion: null,
    estaLactando: null,
  };

  const detalleDe = (titulo: string, p: typeof vacio) =>
    opcionesDelPaciente('p1', p).find((o) => o.titulo === titulo)?.detalle;

  it('no incluye nada de agregar: eso es del +', () => {
    const titulos = opcionesDelPaciente('p1', vacio).map((o) => o.titulo);
    expect(titulos).toEqual([
      'Editar paciente',
      'Función renal',
      'Función hepática',
      'Embarazo y lactancia',
      'Condiciones y alergias',
      'Ver historial',
    ]);
    expect(titulos.some((t) => t.startsWith('Agregar'))).toBe(false);
  });

  it('dice Sin cargar en vez de dejar en blanco', () => {
    // En blanco no se distingue de «el servidor no lo mandó».
    expect(detalleDe('Función renal', vacio)).toBe('Sin cargar');
    expect(detalleDe('Función hepática', vacio)).toBe('Sin cargar');
    expect(detalleDe('Embarazo y lactancia', vacio)).toBe('Sin cargar');
  });

  it('muestra el Clcr sin arrastrar decimales', () => {
    expect(detalleDe('Función renal', { ...vacio, clcrMlMin: 26.4999 })).toBe('Clcr 26.5 mL/min');
    expect(detalleDe('Función renal', { ...vacio, clcrMlMin: 60 })).toBe('Clcr 60 mL/min');
  });

  it('un Clcr de 0 no se lee como sin cargar', () => {
    // `!clcrMlMin` trataría el 0 como falta de dato. Son cosas distintas.
    expect(detalleDe('Función renal', { ...vacio, clcrMlMin: 0 })).toBe('Clcr 0 mL/min');
  });

  it('lactancia en false es un dato, no una falta de dato', () => {
    expect(detalleDe('Embarazo y lactancia', { ...vacio, estaLactando: false })).toBe(
      'sin lactancia',
    );
    expect(detalleDe('Embarazo y lactancia', { ...vacio, estaLactando: true })).toBe('lactancia');
  });

  it('junta semana y lactancia cuando están las dos', () => {
    expect(
      detalleDe('Embarazo y lactancia', { ...vacio, semanaGestacion: 24, estaLactando: true }),
    ).toBe('24 semanas · lactancia');
  });

  it('las rutas cuelgan del paciente', () => {
    expect(opcionesDelPaciente('abc', vacio).map((o) => o.ruta)).toEqual([
      '/paciente/abc/editar',
      '/paciente/abc/datos-renales',
      '/paciente/abc/datos-hepaticos',
      '/paciente/abc/embarazo-lactancia',
      '/paciente/abc/condiciones-alergias',
      '/paciente/abc/historial',
    ]);
  });
});

describe('rutaEditarPrescripcion', () => {
  it('lleva la pauta por parámetros y escapa lo que hace falta', () => {
    const ruta = rutaEditarPrescripcion('pac1', {
      id: 'pr9',
      nombre: 'Coumadin',
      dosis: '5 mg',
      frecuencia: 'cada 24 h',
      via: 'ORAL',
    });
    expect(ruta).toBe(
      '/prescripcion/pr9?paciente=pac1&nombre=Coumadin&dosis=5%20mg&frecuencia=cada%2024%20h&via=ORAL',
    );
  });
});

describe('fila de tratamiento sin verificar completo (regla 5)', () => {
  const sano = { esFarmacoLibre: false, espina: null } as const;

  it('un fármaco libre nunca va en verde', () => {
    expect(filaSinVerificarCompleto({ esFarmacoLibre: true, espina: null }, [])).toBe(true);
  });

  it('sin hallazgos y sin Clcr o sin Child-Pugh va en neutro', () => {
    expect(filaSinVerificarCompleto(sano, [{ codigo: 'SIN_CLCR' }])).toBe(true);
    expect(filaSinVerificarCompleto(sano, [{ codigo: 'SIN_CHILD_PUGH' }])).toBe(true);
  });

  it('con los datos cargados, sin hallazgos sí es verde', () => {
    expect(filaSinVerificarCompleto(sano, [])).toBe(false);
    // Clase cargada pero sin tabla para ningún fármaco: no es un dato que falte.
    expect(filaSinVerificarCompleto(sano, [{ codigo: 'SIN_TABLA_HEPATICA' }])).toBe(false);
  });

  it('con hallazgos conserva su color de gravedad', () => {
    expect(
      filaSinVerificarCompleto({ esFarmacoLibre: false, espina: 1 }, [{ codigo: 'SIN_CLCR' }]),
    ).toBe(false);
  });
});

describe('precargarCockpits', () => {
  const qcFalso = () => {
    const claves: string[] = [];
    return {
      claves,
      qc: {
        prefetchQuery: async ({ queryKey, queryFn }: { queryKey: unknown[]; queryFn: () => Promise<unknown> }) => {
          claves.push(queryKey.join(':'));
          await queryFn();
        },
      },
    };
  };

  it('pide cockpit y alergias de cada paciente, y salta el de demostración', async () => {
    const { qc, claves } = qcFalso();
    await precargarCockpits(
      qc as never,
      ['a', 'b', 'demo-paciente-1', 'c', 'd'],
      async () => null,
      async () => null,
    );
    expect(claves.sort()).toEqual(
      ['a', 'b', 'c', 'd'].flatMap((id) => [`cockpit:${id}`, `condiciones-alergias:${id}`]).sort(),
    );
  });

  it('un pedido que falla no frena a los demás', async () => {
    const { qc, claves } = qcFalso();
    await expect(
      precargarCockpits(
        qc as never,
        ['a', 'b'],
        async (id) => {
          if (id === 'a') throw new Error('sin señal');
        },
        async () => null,
      ),
    ).resolves.toBeUndefined();
    expect(claves).toContain('cockpit:b');
  });
});

describe('invalidarPaciente', () => {
  it('invalida todo lo que muestra al paciente, incluida su fila en Pacientes', async () => {
    const llamadas: unknown[][] = [];
    const qc = {
      invalidateQueries: async ({ queryKey }: { queryKey: unknown[] }) => {
        llamadas.push(queryKey);
      },
    };
    await invalidarPaciente(qc as never, 'p1');
    expect(llamadas).toEqual(
      expect.arrayContaining([
        ['cockpit', 'p1'],
        ['inicio'],
        ['historial', 'p1'],
        ['paciente', 'p1'],
        ['condiciones-alergias', 'p1'],
      ]),
    );
  });
});
