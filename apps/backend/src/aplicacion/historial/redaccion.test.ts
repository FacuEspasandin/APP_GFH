import { describe, expect, it } from 'vitest';

import {
  conUnidad,
  diferencias,
  fecha,
  nombreFarmaco,
  pauta,
  resumenDeCambios,
  viaLegible,
} from './redaccion';

/**
 * Lo que el médico va a leer dentro de dos años.
 *
 * Estos tests fijan sobre todo una cosa: que un evento sólo exista cuando pasó
 * algo. Un historial que registra «editado» cada vez que alguien abre una
 * pantalla y la cierra deja de servir para lo único que sirve.
 */
describe('redacción del historial', () => {
  describe('nombre del fármaco', () => {
    it('usa el nombre comercial cuando hay producto', () => {
      expect(
        nombreFarmaco({
          esFarmacoLibre: false,
          nombreLibre: null,
          producto: { nombreComercial: 'Coumadin' },
        }),
      ).toBe('Coumadin');
    });

    it('usa el texto libre cuando el fármaco no está en el catálogo', () => {
      expect(
        nombreFarmaco({ esFarmacoLibre: true, nombreLibre: 'Jarabe de la farmacia', producto: null }),
      ).toBe('Jarabe de la farmacia');
    });

    it('no deja la línea vacía si el fármaco libre vino sin nombre', () => {
      expect(nombreFarmaco({ esFarmacoLibre: true, nombreLibre: '  ', producto: null })).toBe(
        'Fármaco sin nombre',
      );
    });

    it('sobrevive a que el producto ya no exista', () => {
      // Pasa de verdad: el evento se escribe con el nombre resuelto, pero si
      // alguien llama a esto con la relación en null la línea no puede quedar
      // en blanco.
      expect(nombreFarmaco({ esFarmacoLibre: false, nombreLibre: null, producto: null })).toBe(
        'Fármaco',
      );
    });
  });

  describe('pauta', () => {
    it('arma dosis, frecuencia y vía', () => {
      expect(pauta({ dosis: '10 mg', frecuencia: '1 vez al día', via: 'ORAL' })).toBe(
        '10 mg · 1 vez al día · vía oral',
      );
    });

    it('omite la vía cuando no está especificada', () => {
      // «vía no especificada» ocupa una línea para no decir nada.
      expect(pauta({ dosis: '5 mg', frecuencia: 'cada 8 h', via: 'NO_ESPECIFICADA' })).toBe(
        '5 mg · cada 8 h',
      );
    });

    it('no deja separadores colgando si falta la frecuencia', () => {
      expect(pauta({ dosis: '5 mg', frecuencia: '', via: null })).toBe('5 mg');
    });
  });

  describe('vía', () => {
    it('traduce las siglas del enum', () => {
      expect(viaLegible('IV')).toBe('vía intravenosa');
      expect(viaLegible('SC')).toBe('vía subcutánea');
      expect(viaLegible('IM')).toBe('vía intramuscular');
    });

    it('devuelve null para NO_ESPECIFICADA', () => {
      expect(viaLegible('NO_ESPECIFICADA')).toBeNull();
    });
  });

  describe('diferencias', () => {
    it('ignora los campos que no vinieron en el PATCH', () => {
      // `undefined` significa «no se tocó», que no es lo mismo que «se borró».
      const r = diferencias([
        { campo: 'Nombre', antes: 'Ana', despues: undefined },
        { campo: 'Apellido', antes: 'Rodríguez', despues: 'Rodríguez Pérez' },
      ]);
      expect(r).toEqual([{ campo: 'Apellido', antes: 'Rodríguez', despues: 'Rodríguez Pérez' }]);
    });

    it('ignora los campos que vinieron con el mismo valor', () => {
      // Abrir editar y guardar sin tocar nada no es un hecho clínico.
      expect(diferencias([{ campo: 'Dosis', antes: '10 mg', despues: '10 mg' }])).toEqual([]);
    });

    it('registra cuando un dato se borra', () => {
      expect(diferencias([{ campo: 'Documento', antes: '4.123.456-7', despues: null }])).toEqual([
        { campo: 'Documento', antes: '4.123.456-7', despues: null },
      ]);
    });

    it('registra cuando un dato se carga por primera vez', () => {
      expect(diferencias([{ campo: 'Peso', antes: null, despues: 60 }])).toEqual([
        { campo: 'Peso', antes: null, despues: '60' },
      ]);
    });

    it('escribe los booleanos como los lee un médico', () => {
      expect(diferencias([{ campo: 'Lactancia', antes: null, despues: true }])).toEqual([
        { campo: 'Lactancia', antes: null, despues: 'Sí' },
      ]);
      expect(diferencias([{ campo: 'Lactancia', antes: true, despues: false }])).toEqual([
        { campo: 'Lactancia', antes: 'Sí', despues: 'No' },
      ]);
    });

    it('no confunde false con «sin dato»', () => {
      // El bug clásico: `!valor` trata false y null igual, y en lactancia son
      // dos cosas distintas — «se preguntó y no» versus «nunca se preguntó».
      expect(diferencias([{ campo: 'Lactancia', antes: false, despues: null }])).toEqual([
        { campo: 'Lactancia', antes: 'No', despues: null },
      ]);
    });

    it('aplica el formato antes de comparar', () => {
      // 1.10 y 1.1 son el mismo número: no hubo cambio.
      const r = diferencias([
        {
          campo: 'Creatinina',
          antes: 1.1,
          despues: 1.1,
          formato: (v) => conUnidad(v, 'mg/dL'),
        },
      ]);
      expect(r).toEqual([]);
    });
  });

  describe('con unidad', () => {
    it('no arrastra ceros de más', () => {
      expect(conUnidad(1.1, 'mg/dL')).toBe('1.1 mg/dL');
      expect(conUnidad(60, 'kg')).toBe('60 kg');
      expect(conUnidad(26.499, 'mL/min')).toBe('26.5 mL/min');
    });

    it('acepta los Decimal de Prisma, que llegan como string', () => {
      expect(conUnidad('1.80', 'mg/dL')).toBe('1.8 mg/dL');
    });
  });

  describe('fecha', () => {
    it('va en día/mes/año', () => {
      expect(fecha(new Date('1948-03-07T00:00:00.000Z'))).toBe('07/03/1948');
    });
  });

  describe('resumen de cambios', () => {
    it('no dice nada si no cambió nada', () => {
      expect(resumenDeCambios([])).toBeNull();
    });

    it('enumera hasta dos y cuenta el resto', () => {
      const c = (campo: string) => ({ campo, antes: 'a', despues: 'b' });
      expect(resumenDeCambios([c('Dosis')])).toBe('Cambió dosis.');
      expect(resumenDeCambios([c('Dosis'), c('Vía')])).toBe('Cambiaron dosis y vía.');
      expect(resumenDeCambios([c('Dosis'), c('Vía'), c('Indicación')])).toBe(
        'Cambiaron dosis, vía y 1 campo más.',
      );
      expect(resumenDeCambios([c('A'), c('B'), c('C'), c('D')])).toBe(
        'Cambiaron a, b y 2 campos más.',
      );
    });
  });
});
