import { describe, expect, it } from 'vitest';

import {
  cupoAgotado,
  decidirEntrada,
  detalleDeAcceso,
  gastaConsulta,
  rutaHerramienta,
  rutaNuevoPaciente,
  textoCupo,
  type EstadoDelPlan,
} from './plan-gratis';
import { HERRAMIENTAS } from './herramientas';

const plan = (p: Partial<EstadoDelPlan> = {}): EstadoDelPlan => ({
  vigente: false,
  pacientes: 0,
  limitePacientes: 0,
  puedeCrearPaciente: false,
  consultas: { usadas: 0, total: 10, restantes: 10, avisar: false },
  ...p,
});

const pago = (): EstadoDelPlan => ({
  vigente: true,
  pacientes: 12,
  limitePacientes: null,
  puedeCrearPaciente: true,
  consultas: null,
});

describe('entrada al formulario de crear paciente', () => {
  it('sin suscripción va al paywall ANTES de que se escriba nada', () => {
    // Dejar llenar doce campos para recién ahí pedir que pague es cobrarle el
    // trabajo dos veces: la segunda cuando vuelva a escribir todo.
    expect(decidirEntrada(plan(), false)).toBe('paywall');
  });

  it('mientras no se sabe, espera: aparecer y desaparecer es peor que tardar', () => {
    expect(decidirEntrada(undefined, false)).toBe('esperar');
  });

  it('si la consulta del plan falla, deja pasar', () => {
    // El backend aplica el límite igual. Trabar por un dato de facturación que
    // no llegó sería inventar un muro que quizá no existe.
    expect(decidirEntrada(undefined, true)).toBe('formulario');
  });

  it('la suscripción vigente nunca queda en paywall', () => {
    expect(decidirEntrada(pago(), false)).toBe('formulario');
  });
});

describe('el acceso desde la lista', () => {
  it('sin suscripción lleva al paywall, y le dice por qué se abrió', () => {
    expect(rutaNuevoPaciente(plan())).toBe('/paywall?motivo=paciente');
  });

  it('con suscripción lleva al formulario', () => {
    expect(rutaNuevoPaciente(pago())).toBe('/crear-paciente');
  });

  it('sin saber todavía, no manda al paywall por las dudas', () => {
    expect(rutaNuevoPaciente(undefined)).toBe('/crear-paciente');
  });

  it('avisa antes de tocar, no después', () => {
    expect(detalleDeAcceso(plan())).toBe('Incluido en la suscripción');
    expect(detalleDeAcceso(pago())).toBeUndefined();
    expect(detalleDeAcceso(undefined)).toBeUndefined();
  });
});

describe('las herramientas sueltas', () => {
  const buscar = (clave: string) => HERRAMIENTAS.find((h) => h.clave === clave)!;

  // El catálogo vive en `herramientas.ts`; acá se prueba sólo el precio.
  it('las dos calculadoras entran gratis: son fórmulas publicadas', () => {
    expect(buscar('clcr').cruza).toBe(false);
    expect(buscar('child-pugh').cruza).toBe(false);
    expect(rutaHerramienta(buscar('clcr'), plan())).toBe('/herramientas/clcr');
  });

  it('las que cruzan mandan al paywall sin suscripción', () => {
    expect(rutaHerramienta(buscar('interacciones'), plan())).toBe('/paywall?motivo=herramienta');
    expect(rutaHerramienta(buscar('renal'), plan())).toBe('/paywall?motivo=herramienta');
  });

  it('con suscripción, todas abren su propia pantalla', () => {
    for (const h of HERRAMIENTAS) expect(rutaHerramienta(h, pago())).toBe(h.ruta);
  });

  it('mientras no se sabe el plan, no se manda a pagar', () => {
    // Un parpadeo al paywall en cada arranque sería peor que un 403 raro.
    expect(rutaHerramienta(buscar('renal'), undefined)).toBe('/herramientas/renal');
  });
});

describe('el contador de consultas', () => {
  const conCupo = (usadas: number, avisar = true) =>
    plan({ consultas: { usadas, total: 10, restantes: 10 - usadas, avisar } });

  it('no se muestra hasta que el backend lo pide', () => {
    // Un contador en 1/10 convierte una consulta en una transacción.
    expect(textoCupo(conCupo(2, false))).toBeNull();
  });

  it('cuando queda poco, dice cuánto', () => {
    expect(textoCupo(conCupo(6))).toBe('Te quedan 4 de 10 consultas');
  });

  it('en singular no dice «quedan 1»', () => {
    expect(textoCupo(conCupo(9))).toBe('Te queda 1 de 10 consultas');
  });

  it('agotado lo dice en pasado, sin número', () => {
    expect(textoCupo(conCupo(10))).toBe('Usaste tus consultas gratis');
    expect(cupoAgotado(conCupo(10))).toBe(true);
  });

  it('con suscripción no hay nada que contar', () => {
    expect(textoCupo(pago())).toBeNull();
    expect(cupoAgotado(pago())).toBe(false);
  });
});

describe('qué gasta cupo', () => {
  it('la primera vez sí', () => {
    expect(gastaConsulta(plan(), 'renal', [])).toBe(true);
  });

  it('volver a la misma no', () => {
    // Si ir y volver quemara el cupo, el límite se sentiría tramposo — y el
    // backend tampoco la cobra dos veces.
    expect(gastaConsulta(plan(), 'renal', ['renal'])).toBe(false);
  });

  it('al que paga nunca', () => {
    expect(gastaConsulta(pago(), 'renal', [])).toBe(false);
  });
});
