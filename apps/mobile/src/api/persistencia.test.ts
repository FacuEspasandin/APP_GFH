import { describe, expect, it } from 'vitest';

import { seGuarda } from './persistencia';

/**
 * La línea entre catálogo y paciente.
 *
 * Es una decisión clínica disfrazada de detalle técnico: una clave que caiga
 * del lado equivocado significa un cockpit de ayer mostrado como el de hoy.
 * Por eso se testea clave por clave y no «el mecanismo».
 */
describe('qué sobrevive a cerrar la app', () => {
  it('el catálogo sí: es contenido publicado, no cambia solo', () => {
    expect(seGuarda(['catalogo-indice'])).toBe(true);
    expect(seGuarda(['principios-activos-indice'])).toBe(true);
    expect(seGuarda(['ficha', 'abc-123'])).toBe(true);
    expect(seGuarda(['restriccion', 'abc-123', 'renal'])).toBe(true);
    expect(seGuarda(['cond'])).toBe(true);
  });

  it('nada que cuelgue de un paciente', () => {
    for (const clave of [
      'cockpit',
      'inicio',
      'paciente',
      'historial',
      'condiciones-alergias',
      'alternativas',
      'grupos',
    ]) {
      expect(seGuarda([clave, 'id-cualquiera'])).toBe(false);
    }
  });

  it('tampoco lo que define el acceso: se resuelve contra el servidor o no se resuelve', () => {
    for (const clave of ['plan', 'suscripcion', 'sesiones', 'perfil', 'configuracion']) {
      expect(seGuarda([clave])).toBe(false);
    }
  });

  it('una clave nueva no cae adentro por accidente: hay que agregarla a mano', () => {
    expect(seGuarda(['algo-que-todavia-no-existe'])).toBe(false);
  });

  it('una clave vacía o rara no rompe', () => {
    expect(seGuarda([])).toBe(false);
    expect(seGuarda([undefined])).toBe(false);
    expect(seGuarda([{ objeto: true }])).toBe(false);
  });
});
