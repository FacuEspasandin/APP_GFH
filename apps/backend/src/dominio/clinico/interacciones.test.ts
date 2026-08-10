import fs from 'node:fs';
import path from 'node:path';

import { normalizar, parClave } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import {
  cargarReglasInteraccion,
  RUTA_REGLAS_POR_DEFECTO,
} from '../../infraestructura/catalogo/cargar-reglas-interaccion';
import {
  coberturaPorPar,
  construirCatalogo,
  detectarInteracciones,
  masGrave,
  type ComponenteActivo,
  type Curacion,
  type Regla,
  type SeveridadInteraccion,
} from './interacciones';

const { reglas, listas, listasSinUso } = cargarReglasInteraccion(RUTA_REGLAS_POR_DEFECTO);
const catalogo = construirCatalogo(reglas);

const PAS = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../docs/data/principios-activos.json'),
    'utf8',
  ),
) as Array<{ nombre: string }>;

describe('catálogo expandido desde las reglas reales', () => {
  it('produce 638 pares, igual que el módulo que corre en GFH', () => {
    expect(catalogo.size).toBe(638);
  });

  it('un fármaco no interactúa consigo mismo', () => {
    const conSigoMismo = [...catalogo.keys()].filter((k) => {
      const [a, b] = k.split('|');
      return a === b;
    });
    expect(conSigoMismo).toEqual([]);
  });

  it('(A,B) y (B,A) son la misma entrada', () => {
    expect(catalogo.get(parClave('Warfarina', 'Ibuprofeno'))).toBeDefined();
    expect(catalogo.get(parClave('Ibuprofeno', 'Warfarina'))).toBe(
      catalogo.get(parClave('Warfarina', 'Ibuprofeno')),
    );
  });
});

/**
 * EL invariante. Motor §5.2.
 *
 * Que "las contraindicadas van primero" sea una convención escrita no sirve de
 * nada: alguien agrega una regla arriba, todo compila, todos los tests pasan y
 * un par contraindicado pasa a mostrarse como ALTA. Esto falla acá y no en la
 * pantalla de un médico.
 */
describe('invariante de severidad: gana la más grave', () => {
  const cobertura = coberturaPorPar(reglas);
  const multiCubiertos = [...cobertura.entries()].filter(([, v]) => v.length > 1);

  it('hay 14 pares cubiertos por más de una regla', () => {
    expect(multiCubiertos).toHaveLength(14);
  });

  it('en cada uno gana la severidad más grave de las que lo cubren', () => {
    const violaciones = multiCubiertos
      .map(([clave, reglasQueLoCubren]) => {
        const gana = catalogo.get(clave)!.severidad;
        const masGraveDeTodas = reglasQueLoCubren
          .map((r) => r.severidad)
          .reduce<SeveridadInteraccion>((peor, s) => masGrave(peor, s), 'INFORMATIVA');
        return { clave, gana, masGraveDeTodas };
      })
      .filter((v) => v.gana !== v.masGraveDeTodas);

    expect(violaciones).toEqual([]);
  });

  it('detecta una violación si alguien reordena las reglas', () => {
    // Prueba de que el test sirve: si la ALTA se declarara antes que la
    // CONTRAINDICADA, el par quedaría como ALTA.
    const invertidas: Regla[] = [
      { orden: 0, a: ['Simvastatina'], b: ['Claritromicina'], severidad: 'ALTA', texto: '' },
      { orden: 1, a: ['Simvastatina'], b: ['Claritromicina'], severidad: 'CONTRAINDICADA', texto: '' },
    ];
    const roto = construirCatalogo(invertidas);
    expect(roto.get(parClave('Simvastatina', 'Claritromicina'))!.severidad).toBe('ALTA');
  });
});

/**
 * El otro riesgo silencioso. Motor §5.2 / §11.2.
 *
 * Un nombre mal escrito no rompe nada: esa regla no matchea nunca y la
 * interacción DESAPARECE. Escribir "Espironolactona" en vez de "Espirolactona"
 * —como la nombra el catálogo SEN— borra ocho pares sin un solo error.
 */
describe('grafía: todo nombre citado existe en el catálogo', () => {
  const enCatalogo = new Set(PAS.map((p) => normalizar(p.nombre)));

  it('los nombres de todas las listas existen', () => {
    const ausentes = Object.entries(listas).flatMap(([lista, nombres]) =>
      nombres.filter((n) => !enCatalogo.has(normalizar(n))).map((n) => `${lista}: ${n}`),
    );
    expect(ausentes).toEqual([]);
  });

  it('los nombres citados directamente en una regla existen', () => {
    const ausentes = [...new Set(reglas.flatMap((r) => [...r.a, ...r.b]))].filter(
      (n) => !enCatalogo.has(normalizar(n)),
    );
    expect(ausentes).toEqual([]);
  });

  it('"Espirolactona" es la grafía del catálogo, y "Espironolactona" no existe', () => {
    expect(enCatalogo.has(normalizar('Espirolactona'))).toBe(true);
    expect(enCatalogo.has(normalizar('Espironolactona'))).toBe(false);
  });

  it('MACROLIDOS_INH está declarada y no la usa ninguna regla', () => {
    // Código muerto en GFH. Además su contenido contradice al motor §5.2, que
    // dice [Claritromicina, Eritromicina]; en el código real trae azoles.
    expect(listasSinUso).toEqual(['MACROLIDOS_INH']);
  });
});

describe('detección sobre un paciente (motor §5.4)', () => {
  const comp = (prescripcionId: string, nombre: string, paId = nombre): ComponenteActivo => ({
    prescripcionId,
    principioActivoId: paId,
    nombre,
  });

  it('encuentra el par y le pone la severidad del catálogo', () => {
    const r = detectarInteracciones([comp('p1', 'Warfarina'), comp('p2', 'Ibuprofeno')], catalogo);
    expect(r).toHaveLength(1);
    expect(r[0]!.severidad).toBe('ALTA');
  });

  it('n fármacos producen n(n−1)/2 cruces, pero solo se registran los conocidos', () => {
    const sinInteraccion = detectarInteracciones(
      [comp('p1', 'Paracetamol'), comp('p2', 'Amoxicilina')],
      catalogo,
    );
    expect(sinInteraccion).toEqual([]);
  });

  /**
   * El caso que rompe el unique del modelo de datos original: un producto
   * combinado aporta dos principios activos, y cada uno puede interactuar por
   * separado con el mismo otro fármaco.
   */
  it('un producto combinado dispara una interacción POR COMPONENTE', () => {
    const r = detectarInteracciones(
      [
        comp('p1', 'Claritromicina', 'pa-claritro'),
        // Un solo producto que aporta dos PAs que interactúan con claritromicina.
        comp('p2', 'Simvastatina', 'pa-simva'),
        comp('p2', 'Colchicina', 'pa-colchi'),
      ],
      catalogo,
    );
    expect(r).toHaveLength(2);
    // Mismo par de prescripciones en las dos...
    expect(new Set(r.map((x) => `${x.prescripcionAId}|${x.prescripcionBId}`)).size).toBe(1);
    // ...pero distinto par de principios activos. Con el unique de a dos que
    // proponía el modelo de datos, la segunda se perdía en silencio.
    expect(new Set(r.map((x) => `${x.principioActivoAId}|${x.principioActivoBId}`)).size).toBe(2);
  });

  it('no cruza dos componentes de la MISMA prescripción', () => {
    // Son el mismo comprimido: el producto existe así en el mercado.
    const r = detectarInteracciones(
      [comp('p1', 'Simvastatina', 'pa-simva'), comp('p1', 'Claritromicina', 'pa-claritro')],
      catalogo,
    );
    expect(r).toEqual([]);
  });

  it('el orden del par es estable: (A,B) y (B,A) dan lo mismo', () => {
    const ab = detectarInteracciones([comp('p1', 'Warfarina'), comp('p2', 'Ibuprofeno')], catalogo);
    const ba = detectarInteracciones([comp('p2', 'Ibuprofeno'), comp('p1', 'Warfarina')], catalogo);
    expect(ab[0]!.prescripcionAId).toBe(ba[0]!.prescripcionAId);
    expect(ab[0]!.prescripcionBId).toBe(ba[0]!.prescripcionBId);
  });

  it('normaliza la grafía: "apixaban" sin tilde encuentra el mismo par', () => {
    const conTilde = detectarInteracciones([comp('p1', 'Apixabán'), comp('p2', 'Rifampicina')], catalogo);
    const sinTilde = detectarInteracciones([comp('p1', 'apixaban'), comp('p2', 'RIFAMPICINA')], catalogo);
    expect(sinTilde).toHaveLength(conTilde.length);
    expect(sinTilde[0]!.severidad).toBe(conTilde[0]!.severidad);
  });

  describe('curación farmacéutica (motor §5.3)', () => {
    const clave = parClave('Warfarina', 'Ibuprofeno');
    const par = [comp('p1', 'Warfarina'), comp('p2', 'Ibuprofeno')];

    it('RECHAZADO descarta el par', () => {
      const cur = new Map<string, Curacion>([
        [clave, { parClave: clave, rechazado: true, severidadOverride: null, textoOverride: null }],
      ]);
      expect(detectarInteracciones(par, catalogo, cur)).toEqual([]);
    });

    it('el override pisa severidad y texto del catálogo', () => {
      const cur = new Map<string, Curacion>([
        [clave, { parClave: clave, rechazado: false, severidadOverride: 'CONTRAINDICADA', textoOverride: 'texto curado' }],
      ]);
      const r = detectarInteracciones(par, catalogo, cur)[0]!;
      expect(r.severidad).toBe('CONTRAINDICADA');
      expect(r.texto).toBe('texto curado');
    });
  });
});
