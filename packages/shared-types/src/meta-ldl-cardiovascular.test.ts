import { describe, expect, it } from 'vitest';

import { metaLdlCardiovascular } from './meta-ldl-cardiovascular';

describe('meta de LDL según riesgo cardiovascular', () => {
  it('Bajo: LDL <130, no-HDL <160, sin reducción porcentual', () => {
    const r = metaLdlCardiovascular({ categoria: 1, sexo: 'M', edad: 40 });
    expect(r).toEqual({ ldlMgDl: 130, noHdlMgDl: 160, reduccionPorcentualMinima: undefined });
  });

  it('Alto, Muy alto y Crítico: LDL <70, no-HDL <100, reducción ≥50%', () => {
    for (const categoria of [3, 4, 5] as const) {
      const r = metaLdlCardiovascular({ categoria, sexo: 'F', edad: 60 });
      expect(r, `categoria ${categoria}`).toEqual({ ldlMgDl: 70, noHdlMgDl: 100, reduccionPorcentualMinima: 50 });
    }
  });

  it('no-HDL es siempre LDL + 30, en cualquier categoría', () => {
    for (const categoria of [1, 3, 4, 5] as const) {
      const r = metaLdlCardiovascular({ categoria, sexo: 'M', edad: 40 })!;
      expect(r.noHdlMgDl).toBe(r.ldlMgDl + 30);
    }
  });

  describe('Moderado — se ramifica', () => {
    it('sin ninguna condición asociada: LDL <100', () => {
      const r = metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 40 });
      expect(r).toEqual({ ldlMgDl: 100, noHdlMgDl: 130, reduccionPorcentualMinima: undefined });
    });

    it('LDL basal ≥130 alcanza solo, sin las otras dos', () => {
      const r = metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 40, ldlBasalAlto: true });
      expect(r?.ldlMgDl).toBe(70);
    });

    it('HTA con HVI alcanza solo', () => {
      const r = metaLdlCardiovascular({ categoria: 2, sexo: 'F', edad: 40, htaConHvi: true });
      expect(r?.ldlMgDl).toBe(70);
    });

    it('edad/sexo + otro factor alcanza junto, ninguno de los dos solo', () => {
      // Hombre de 40 no cumple el umbral (Hombres >= 50): el otro factor solo no alcanza.
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 40, otroFactorAsociado: true })?.ldlMgDl).toBe(100);
      // Hombre de 50 cumple el umbral, pero sin el otro factor tampoco alcanza.
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 50 })?.ldlMgDl).toBe(100);
      // Los dos juntos sí.
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 50, otroFactorAsociado: true })?.ldlMgDl).toBe(70);
    });

    it('el umbral de edad es distinto por sexo: mujer de 50 no alcanza, de 60 sí', () => {
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'F', edad: 50, otroFactorAsociado: true })?.ldlMgDl).toBe(100);
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'F', edad: 60, otroFactorAsociado: true })?.ldlMgDl).toBe(70);
    });

    it('Moderado nunca pide reducción porcentual, alcance la condición que alcance', () => {
      expect(metaLdlCardiovascular({ categoria: 2, sexo: 'M', edad: 40, ldlBasalAlto: true })?.reduccionPorcentualMinima).toBeUndefined();
    });
  });
});
