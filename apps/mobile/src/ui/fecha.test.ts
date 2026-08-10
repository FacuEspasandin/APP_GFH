import { describe, expect, it } from 'vitest';

import { aplicarMascara, aTexto, diasDelMes, diaSemanaLunes, validarFecha } from './fecha';

const HOY = new Date(Date.UTC(2026, 7, 9)); // 9/8/2026

describe('máscara dd/mm/aaaa', () => {
  it('pone las barras solas a medida que se escribe', () => {
    expect(aplicarMascara('1')).toBe('1');
    expect(aplicarMascara('12')).toBe('12/');
    expect(aplicarMascara('120')).toBe('12/0');
    expect(aplicarMascara('1204')).toBe('12/04/');
    expect(aplicarMascara('12041948')).toBe('12/04/1948');
  });

  it('ignora las barras que teclea el usuario', () => {
    // Si no, "12/" + "/" dejaría "12//" y el campo se desalinea. La barra
    // final se agrega igual, porque con 4 dígitos ya toca el año.
    expect(aplicarMascara('12/04/1948')).toBe('12/04/1948');
    expect(aplicarMascara('12//04')).toBe('12/04/');
  });

  it('descarta cualquier cosa que no sea dígito', () => {
    expect(aplicarMascara('1a2b')).toBe('12/');
    expect(aplicarMascara('12 04')).toBe('12/04/');
  });

  it('no deja escribir más de 8 dígitos', () => {
    expect(aplicarMascara('120419489999')).toBe('12/04/1948');
  });

  it('borrar sobre una barra se come también el dígito de antes', () => {
    // El campo muestra "12/04/" y el usuario borra: llega "12/04". Sin comerse
    // un dígito, la máscara vuelve a poner la barra y el cursor queda trabado.
    expect(aplicarMascara('12/04', '12/04/')).toBe('12/0');
  });

  it('borrar en el medio de un grupo no se come nada de más', () => {
    expect(aplicarMascara('12/0', '12/04')).toBe('12/0');
    expect(aplicarMascara('1', '12')).toBe('1');
  });
});

describe('validación mientras se escribe', () => {
  it('no marca error con el campo incompleto', () => {
    expect(validarFecha('', HOY).error).toBeNull();
    expect(validarFecha('1', HOY).error).toBeNull();
    expect(validarFecha('12/0', HOY).error).toBeNull();
  });

  it('avisa del día apenas es imposible, sin esperar el resto', () => {
    expect(validarFecha('35', HOY).error).toContain('día');
    expect(validarFecha('00', HOY).error).toContain('día');
  });

  it('el mes no puede pasar de 12', () => {
    expect(validarFecha('12/13', HOY).error).toContain('mes');
    expect(validarFecha('12/00', HOY).error).toContain('mes');
    expect(validarFecha('12/12', HOY).error).toBeNull();
  });

  it('acepta una fecha real', () => {
    const r = validarFecha('12/04/1948', HOY);
    expect(r.valida).toBe(true);
    expect(r.fecha?.toISOString().slice(0, 10)).toBe('1948-04-12');
  });
});

describe('bordes del calendario', () => {
  it('febrero de un año bisiesto tiene 29', () => {
    expect(diasDelMes(2, 2024)).toBe(29);
    expect(validarFecha('29/02/2024', HOY).valida).toBe(true);
  });

  it('febrero de un año común tiene 28', () => {
    expect(diasDelMes(2, 2023)).toBe(28);
    expect(validarFecha('29/02/2023', HOY).error).toContain('28 días');
  });

  it('los siglos no bisiestos también', () => {
    // 1900 no es bisiesto aunque sea divisible por 4.
    expect(diasDelMes(2, 1900)).toBe(28);
    expect(diasDelMes(2, 2000)).toBe(29);
  });

  it('rechaza el 31 en un mes de 30', () => {
    expect(validarFecha('31/04/1990', HOY).error).toContain('30 días');
    expect(validarFecha('30/04/1990', HOY).valida).toBe(true);
  });
});

describe('rangos con sentido clínico', () => {
  it('no admite una fecha futura', () => {
    expect(validarFecha('10/08/2026', HOY).error).toContain('futura');
    expect(validarFecha('09/08/2026', HOY).valida).toBe(true);
  });

  it('no admite más de 120 años atrás', () => {
    expect(validarFecha('01/01/1905', HOY).error).toContain('1906');
    expect(validarFecha('01/01/1906', HOY).valida).toBe(true);
  });
});

describe('formato de salida', () => {
  it('devuelve dd/mm/aaaa con ceros a la izquierda', () => {
    expect(aTexto(new Date(Date.UTC(1948, 3, 5)))).toBe('05/04/1948');
  });

  it('ida y vuelta sin perder el día', () => {
    const original = '05/04/1948';
    expect(aTexto(validarFecha(original, HOY).fecha!)).toBe(original);
  });
});

describe('grilla del calendario', () => {
  it('la semana arranca en lunes', () => {
    // 1/4/1948 fue jueves → índice 3 con lunes en 0.
    expect(diaSemanaLunes(new Date(Date.UTC(1948, 3, 1)))).toBe(3);
    // 9/8/2026 es domingo → 6.
    expect(diaSemanaLunes(new Date(Date.UTC(2026, 7, 9)))).toBe(6);
  });
});
