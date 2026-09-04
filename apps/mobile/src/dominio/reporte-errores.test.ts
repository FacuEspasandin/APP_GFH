import { describe, expect, it } from 'vitest';

import { limpiar, urlSinConsulta, type EventoDeError } from './reporte-errores';

/**
 * Lo que se prueba acá no es que Sentry ande: es que NO salga del teléfono un
 * dato de paciente. Si alguna de estas falla, la app está filtrando datos de
 * salud de un tercero por un stack trace.
 */

const evento = (over: Partial<EventoDeError> = {}): EventoDeError => ({ ...over });

describe('filtro de privacidad del reporte de errores', () => {
  it('del request sólo deja método y URL, nunca el cuerpo ni las cabeceras', () => {
    const r = limpiar(
      evento({
        request: {
          method: 'POST',
          url: 'https://api/pacientes',
          data: { nombre: 'Ana María', apellido: 'Rodríguez', pesoKg: 60, creatininaMgDl: 1.6 },
          headers: { authorization: 'Bearer secreto' },
        },
      }),
    );

    expect(r.request).toEqual({ method: 'POST', url: 'https://api/pacientes' });
    expect(JSON.stringify(r)).not.toContain('Rodríguez');
    expect(JSON.stringify(r)).not.toContain('secreto');
  });

  it('corta la query, que es donde viaja lo que el médico escribió', () => {
    expect(urlSinConsulta('https://api/pacientes?q=rodriguez')).toBe('https://api/pacientes');
  });

  it('reemplaza los uuid de la ruta: identifican a un paciente', () => {
    expect(urlSinConsulta('https://api/paciente/6f2b1e70-0e6a-4d3f-9c1a-6b1d2e3f4a5b/hallazgos')).toBe(
      'https://api/paciente/<id>/hallazgos',
    );
  });

  it('del usuario deja el id del médico y nada más', () => {
    const r = limpiar(evento({ user: { id: 'med-1', email: 'medico@ejemplo.com', ip_address: '1.2.3.4' } }));
    expect(r.user).toEqual({ id: 'med-1' });
  });

  it('tira las migas de toque: su etiqueta es texto de la pantalla', () => {
    const r = limpiar(
      evento({
        breadcrumbs: [
          { category: 'ui.click', message: 'Ana María Rodríguez' },
          { category: 'navigation', message: 'a /inicio' },
        ],
      }),
    );
    expect(r.breadcrumbs).toHaveLength(1);
    expect(JSON.stringify(r)).not.toContain('Rodríguez');
  });

  it('limpia también la URL que viaja en una miga de fetch', () => {
    const r = limpiar(
      evento({ breadcrumbs: [{ category: 'fetch', data: { url: 'https://api/pacientes?q=rodriguez' } }] }),
    );
    expect(r.breadcrumbs![0]!.data).toEqual({ url: 'https://api/pacientes' });
  });

  it('tira `extra` entero: lo llena cualquiera y no hay forma de saber qué metieron', () => {
    const r = limpiar(evento({ extra: { cockpit: { paciente: 'Ana María' } } }));
    expect(r.extra).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('Ana María');
  });
});
