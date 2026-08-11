import { describe, expect, it } from 'vitest';

import {
  familiaDe,
  hora,
  leerCambio,
  MOTIVO_DE_VACIO,
  porDia,
  tituloDeDia,
  type Evento,
  type TipoEvento,
} from './historial';

const evento = (id: string, createdAt: string, tipo: TipoEvento = 'PACIENTE_EDITADO'): Evento => ({
  id,
  tipo,
  titulo: 'Algo pasó',
  detalle: null,
  cambios: null,
  createdAt,
});

describe('historial', () => {
  describe('familia del evento', () => {
    it('separa las bajas de lo demás', () => {
      expect(familiaDe('FARMACO_SUSPENDIDO')).toBe('baja');
      expect(familiaDe('FARMACO_QUITADO')).toBe('baja');
      expect(familiaDe('ALERGIA_QUITADA')).toBe('baja');
    });

    it('agrupa el tratamiento aparte de los datos del paciente', () => {
      expect(familiaDe('FARMACO_AGREGADO')).toBe('tratamiento');
      expect(familiaDe('ALTERNATIVA_ACEPTADA')).toBe('tratamiento');
      expect(familiaDe('DATOS_RENALES')).toBe('paciente');
      expect(familiaDe('EMBARAZO_LACTANCIA')).toBe('paciente');
    });

    it('reactivar es tratamiento, no baja', () => {
      // Volver a poner un fármaco es lo contrario de sacarlo.
      expect(familiaDe('FARMACO_REACTIVADO')).toBe('tratamiento');
    });

    it('un tipo que la app no conoce no pierde la línea', () => {
      // El backend puede agregar tipos antes de que se actualice la app; la
      // línea tiene que seguir apareciendo, con el marcador neutro.
      expect(familiaDe('ALGO_NUEVO' as TipoEvento)).toBe('paciente');
    });
  });

  describe('título del día', () => {
    const hoy = new Date(2026, 7, 11, 15, 0); // 11 de agosto de 2026

    it('dice Hoy y Ayer', () => {
      expect(tituloDeDia(new Date(2026, 7, 11, 9, 0), hoy)).toBe('Hoy');
      expect(tituloDeDia(new Date(2026, 7, 10, 23, 30), hoy)).toBe('Ayer');
    });

    it('escribe la fecha sin el año cuando es el corriente', () => {
      expect(tituloDeDia(new Date(2026, 7, 3), hoy)).toBe('3 de agosto');
      expect(tituloDeDia(new Date(2026, 0, 28), hoy)).toBe('28 de enero');
    });

    it('agrega el año cuando es otro', () => {
      expect(tituloDeDia(new Date(2025, 11, 24), hoy)).toBe('24 de diciembre de 2025');
    });

    it('«ayer» no depende de las horas sino del día', () => {
      // 23:30 de ayer a 00:30 de hoy es una hora de diferencia, pero son días
      // distintos y el encabezado tiene que decir Ayer.
      const madrugada = new Date(2026, 7, 11, 0, 30);
      expect(tituloDeDia(new Date(2026, 7, 10, 23, 30), madrugada)).toBe('Ayer');
    });
  });

  describe('agrupado por día', () => {
    const hoy = new Date(2026, 7, 11, 15, 0);

    it('corta cuando cambia el día', () => {
      const dias = porDia(
        [
          evento('a', new Date(2026, 7, 11, 9, 42).toISOString()),
          evento('b', new Date(2026, 7, 11, 9, 38).toISOString()),
          evento('c', new Date(2026, 7, 3, 10, 12).toISOString()),
        ],
        hoy,
      );

      expect(dias.map((d) => d.titulo)).toEqual(['Hoy', '3 de agosto']);
      expect(dias[0]!.eventos.map((e) => e.id)).toEqual(['a', 'b']);
      expect(dias[1]!.eventos.map((e) => e.id)).toEqual(['c']);
    });

    it('respeta el orden que vino y no reordena', () => {
      // El backend ya ordena por fecha desc. Reordenar acá sería duplicar la
      // regla en dos lugares y arriesgarse a que se contradigan.
      const dias = porDia(
        [
          evento('nuevo', new Date(2026, 7, 11, 18, 0).toISOString()),
          evento('viejo', new Date(2026, 7, 11, 8, 0).toISOString()),
        ],
        hoy,
      );
      expect(dias[0]!.eventos.map((e) => e.id)).toEqual(['nuevo', 'viejo']);
    });

    it('el mismo día de dos meses distintos no se junta', () => {
      const dias = porDia(
        [
          evento('a', new Date(2026, 7, 5, 10, 0).toISOString()),
          evento('b', new Date(2026, 6, 5, 10, 0).toISOString()),
        ],
        hoy,
      );
      expect(dias).toHaveLength(2);
    });

    it('sin eventos devuelve una lista vacía, no un día vacío', () => {
      expect(porDia([], hoy)).toEqual([]);
    });
  });

  describe('hora', () => {
    it('va con dos dígitos', () => {
      expect(hora(new Date(2026, 7, 11, 9, 5).toISOString())).toBe('09:05');
      expect(hora(new Date(2026, 7, 11, 18, 42).toISOString())).toBe('18:42');
    });
  });

  describe('leer un cambio', () => {
    it('un dato que se carga por primera vez no muestra un guión', () => {
      expect(leerCambio({ campo: 'Peso', antes: null, despues: '60 kg' })).toEqual({
        campo: 'Peso',
        antes: null,
        despues: '60 kg',
      });
    });

    it('un dato que se borra dice Sin dato', () => {
      expect(leerCambio({ campo: 'Documento', antes: '4.123.456-7', despues: null })).toEqual({
        campo: 'Documento',
        antes: '4.123.456-7',
        despues: 'Sin dato',
      });
    });

    it('un cambio normal deja los dos valores', () => {
      expect(leerCambio({ campo: 'Dosis', antes: '10 mg', despues: '5 mg' })).toEqual({
        campo: 'Dosis',
        antes: '10 mg',
        despues: '5 mg',
      });
    });
  });

  describe('historial vacío', () => {
    it('dice la verdad: lo anterior no se registró', () => {
      // Crear un paciente escribe su primera línea, así que un historial vacío
      // sólo puede ser un paciente anterior a la función. Decir «no pasó nada»
      // sería mentir: pasaron cosas, no se registraron.
      expect(MOTIVO_DE_VACIO).toMatch(/anterior al historial/);
      expect(MOTIVO_DE_VACIO).not.toMatch(/no pasó nada/);
    });
  });
});
