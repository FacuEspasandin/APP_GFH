import { describe, expect, it } from 'vitest';

import {
  categoriaRiesgoCardiovascular,
  COLESTEROL_CV,
  EDADES_CV,
  PAS_CV,
  type EdadBandaCV,
  type PasBandaCV,
} from './riesgo-cardiovascular';

/**
 * No prueba números de memoria —no hay ninguno para memorizar, es una tabla
 * digitalizada a mano— sino que la tabla completa respeta las cuatro reglas
 * que no dependen de leer bien un color puntual:
 *
 *   1. El riesgo no baja al subir el colesterol, a igualdad de todo lo demás.
 *   2. El riesgo no baja al subir la PAS.
 *   3. Fumar nunca da un riesgo menor que no fumar.
 *   4. Mujer nunca da un riesgo mayor que hombre, salvo las excepciones
 *      confirmadas contra la imagen original (ver `EXCEPCIONES_CONFIRMADAS_RIESGO_CV`).
 *
 * Es el mismo chequeo que se corrió a mano, celda por celda, mientras se
 * cargaba la tabla — acá queda para siempre, así una edición futura no
 * reintroduce en silencio algo que ya se descartó una vez.
 */
describe('riesgo cardiovascular WHO/ISH AMR-B', () => {
  const combinaciones = [] as Array<{
    diabetes: boolean;
    edad: EdadBandaCV;
    sexo: 'M' | 'F';
    fumador: boolean;
    pas: PasBandaCV;
  }>;
  for (const diabetes of [true, false]) {
    for (const edad of EDADES_CV) {
      for (const sexo of ['M', 'F'] as const) {
        for (const fumador of [true, false]) {
          for (const pas of PAS_CV) combinaciones.push({ diabetes, edad, sexo, fumador, pas });
        }
      }
    }
  }

  it('cubre las 128 combinaciones de diabetes/edad/sexo/fumador/PAS, sin huecos', () => {
    for (const c of combinaciones) {
      const valor = categoriaRiesgoCardiovascular({ ...c, colesterolMmolL: 4 });
      expect(valor, JSON.stringify(c)).not.toBeNull();
    }
  });

  it('el riesgo nunca baja al subir el colesterol', () => {
    for (const c of combinaciones) {
      let previo = 0;
      for (const col of COLESTEROL_CV) {
        const v = categoriaRiesgoCardiovascular({ ...c, colesterolMmolL: col })!;
        expect(v, `${JSON.stringify(c)} col=${col}`).toBeGreaterThanOrEqual(previo);
        previo = v;
      }
    }
  });

  it('el riesgo nunca baja al subir la PAS', () => {
    for (const diabetes of [true, false]) {
      for (const edad of EDADES_CV) {
        for (const sexo of ['M', 'F'] as const) {
          for (const fumador of [true, false]) {
            for (const col of COLESTEROL_CV) {
              let previo = 0;
              for (const pas of PAS_CV) {
                const v = categoriaRiesgoCardiovascular({ diabetes, edad, sexo, fumador, pas, colesterolMmolL: col })!;
                expect(v, `d=${diabetes} e=${edad} s=${sexo} f=${fumador} col=${col} pas=${pas}`).toBeGreaterThanOrEqual(previo);
                previo = v;
              }
            }
          }
        }
      }
    }
  });

  it('fumador nunca da menos riesgo que no fumador, a igualdad del resto', () => {
    for (const diabetes of [true, false]) {
      for (const edad of EDADES_CV) {
        for (const sexo of ['M', 'F'] as const) {
          for (const pas of PAS_CV) {
            for (const col of COLESTEROL_CV) {
              const noFumador = categoriaRiesgoCardiovascular({ diabetes, edad, sexo, fumador: false, pas, colesterolMmolL: col })!;
              const fumador = categoriaRiesgoCardiovascular({ diabetes, edad, sexo, fumador: true, pas, colesterolMmolL: col })!;
              expect(fumador, `d=${diabetes} e=${edad} s=${sexo} pas=${pas} col=${col}`).toBeGreaterThanOrEqual(noFumador);
            }
          }
        }
      }
    }
  });

  it('mujer no da más riesgo que hombre, salvo las excepciones confirmadas contra la fuente', () => {
    // Mismas 12 excepciones que confirmó Facundo releyendo la imagen original
    // dos veces — documentadas en EXCEPCIONES_CONFIRMADAS_RIESGO_CV. Test
    // explícito y no un `if` silencioso: si aparece una violación nueva acá,
    // es una violación de verdad, no una de las ya revisadas.
    const excepciones = new Set([
      'true,50,false,140,4', 'true,40,false,140,3', 'true,40,false,140,4',
      'true,40,false,160,2', 'true,40,false,160,3', 'true,40,false,180,0',
      'true,40,true,140,3', 'true,40,true,160,2',
      'false,50,false,180,0', 'false,40,false,160,2', 'false,40,false,180,0',
      'false,40,true,160,2',
    ]);

    for (const diabetes of [true, false]) {
      for (const edad of EDADES_CV) {
        for (const fumador of [true, false]) {
          for (const pas of PAS_CV) {
            for (let i = 0; i < COLESTEROL_CV.length; i++) {
              const col = COLESTEROL_CV[i]!;
              const hombre = categoriaRiesgoCardiovascular({ diabetes, edad, sexo: 'M', fumador, pas, colesterolMmolL: col })!;
              const mujer = categoriaRiesgoCardiovascular({ diabetes, edad, sexo: 'F', fumador, pas, colesterolMmolL: col })!;
              const clave = `${diabetes},${edad},${fumador},${pas},${i}`;
              if (excepciones.has(clave)) {
                expect(mujer, clave).toBeGreaterThan(hombre);
              } else {
                expect(mujer, clave).toBeLessThanOrEqual(hombre);
              }
            }
          }
        }
      }
    }
  });

  it('una combinación fuera de las bandas conocidas da null, no un valor aproximado', () => {
    expect(
      categoriaRiesgoCardiovascular({
        diabetes: false,
        edad: 45 as EdadBandaCV,
        sexo: 'M',
        fumador: false,
        pas: 130 as PasBandaCV,
        colesterolMmolL: 4,
      }),
    ).toBeNull();
  });
});
