import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  cliente,
  crearMedico,
  darSuscripcion,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * El historial del paciente.
 *
 * Lo que estos tests protegen no es la pantalla sino la propiedad que la hace
 * útil: que el rastro exista aunque lo que describe ya no exista. Un fármaco
 * borrado, una dosis pisada, un Clcr recalculado — todo eso desaparecía sin
 * dejar nada, y el historial sólo sirve si sobrevive a eso.
 */
describe('historial del paciente', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };

  const NUEVO = {
    nombre: 'Historia',
    apellido: 'Clínica',
    fechaNacimiento: '1948-03-07T00:00:00.000Z',
    sexo: 'F',
    pesoKg: 60,
    creatininaMgDl: 1.1,
  };

  const crearPaciente = async () => {
    const r = await api.post('/pacientes', NUEVO, medico.token);
    return (r.cuerpo!.data as { id: string }).id;
  };

  const historial = async (pacienteId: string) => {
    const r = await api.get(`/pacientes/${pacienteId}/historial`, medico.token);
    expect(r.status).toBe(200);
    return r.cuerpo!.data as {
      eventos: {
        tipo: string;
        titulo: string;
        detalle: string | null;
        cambios: { campo: string; antes: string | null; despues: string | null }[] | null;
        createdAt: string;
      }[];
      hayMas: boolean;
    };
  };

  /** Un producto cualquiera del catálogo, para poder prescribir de verdad. */
  const unProducto = async () => {
    const producto = await ctx.prisma.productoComercial.findFirst({
      where: { principiosActivos: { some: {} } },
      select: { id: true, nombreComercial: true },
    });
    if (!producto) throw new Error('El catálogo está vacío: corré el seed.');
    return producto;
  };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    await darSuscripcion(ctx.prisma, medico.id);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('arranca con el alta del paciente', async () => {
    const id = await crearPaciente();

    const { eventos } = await historial(id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]!.tipo).toBe('PACIENTE_CREADO');
    expect(eventos[0]!.titulo).toBe('Paciente creado');
    // El Clcr inicial va en el detalle: es el número del que cuelga el ajuste.
    expect(eventos[0]!.detalle).toMatch(/Clcr inicial/);
  });

  it('registra el fármaco agregado con su pauta', async () => {
    const id = await crearPaciente();
    const producto = await unProducto();

    await api.post(
      `/pacientes/${id}/prescripciones`,
      { productoComercialId: producto.id, dosis: '10 mg', frecuencia: '1 vez al día', via: 'ORAL' },
      medico.token,
    );

    const { eventos } = await historial(id);
    expect(eventos[0]!.tipo).toBe('FARMACO_AGREGADO');
    expect(eventos[0]!.titulo).toBe(`${producto.nombreComercial} agregado`);
    expect(eventos[0]!.detalle).toBe('10 mg · 1 vez al día · vía oral');
  });

  it('un fármaco BORRADO deja igual su línea, con la pauta que tenía', async () => {
    // Es el agujero que motivó todo esto: el borrado es físico, la fila
    // desaparece, y sin evento no quedaba forma de saber que ese paciente
    // alguna vez tomó eso.
    const id = await crearPaciente();
    const producto = await unProducto();

    const creada = await api.post(
      `/pacientes/${id}/prescripciones`,
      { productoComercialId: producto.id, dosis: '5 mg', frecuencia: 'cada 12 h', via: 'ORAL' },
      medico.token,
    );
    const prescripcionId = (creada.cuerpo!.data as { id: string }).id;

    const borrado = await api.delete(`/prescripciones/${prescripcionId}`, medico.token);
    expect(borrado.status).toBe(204);

    // La prescripción ya no está.
    expect(
      await ctx.prisma.prescripcion.findUnique({ where: { id: prescripcionId } }),
    ).toBeNull();

    // El rastro sí.
    const { eventos } = await historial(id);
    expect(eventos[0]!.tipo).toBe('FARMACO_QUITADO');
    expect(eventos[0]!.titulo).toBe(`${producto.nombreComercial} quitado`);
    expect(eventos[0]!.detalle).toBe('Estaba en 5 mg · cada 12 h · vía oral.');
  });

  it('cambiar la dosis guarda el valor anterior', async () => {
    const id = await crearPaciente();
    const producto = await unProducto();

    const creada = await api.post(
      `/pacientes/${id}/prescripciones`,
      { productoComercialId: producto.id, dosis: '10 mg', frecuencia: '1 vez al día', via: 'ORAL' },
      medico.token,
    );
    const prescripcionId = (creada.cuerpo!.data as { id: string }).id;

    await api.patch(`/prescripciones/${prescripcionId}`, { dosis: '5 mg' }, medico.token);

    const { eventos } = await historial(id);
    expect(eventos[0]!.tipo).toBe('FARMACO_EDITADO');
    expect(eventos[0]!.cambios).toEqual([{ campo: 'Dosis', antes: '10 mg', despues: '5 mg' }]);
  });

  it('suspender y editar la pauta a la vez son dos líneas, no una', async () => {
    // Se leen distinto: suspender un anticoagulante no es lo mismo que
    // corregirle la dosis, y un único «editado» las mezclaría.
    const id = await crearPaciente();
    const producto = await unProducto();

    const creada = await api.post(
      `/pacientes/${id}/prescripciones`,
      { productoComercialId: producto.id, dosis: '10 mg', frecuencia: '1 vez al día', via: 'ORAL' },
      medico.token,
    );
    const prescripcionId = (creada.cuerpo!.data as { id: string }).id;

    await api.patch(
      `/prescripciones/${prescripcionId}`,
      { estado: 'SUSPENDIDO', dosis: '2.5 mg' },
      medico.token,
    );

    const { eventos } = await historial(id);
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toContain('FARMACO_SUSPENDIDO');
    expect(tipos).toContain('FARMACO_EDITADO');
  });

  it('guardar sin cambiar nada NO ensucia el historial', async () => {
    const id = await crearPaciente();
    const producto = await unProducto();

    const creada = await api.post(
      `/pacientes/${id}/prescripciones`,
      { productoComercialId: producto.id, dosis: '10 mg', frecuencia: '1 vez al día', via: 'ORAL' },
      medico.token,
    );
    const prescripcionId = (creada.cuerpo!.data as { id: string }).id;

    const antes = (await historial(id)).eventos.length;
    await api.patch(`/prescripciones/${prescripcionId}`, { dosis: '10 mg' }, medico.token);

    expect((await historial(id)).eventos.length).toBe(antes);
  });

  it('editar la identidad y los datos renales son eventos separados', async () => {
    const id = await crearPaciente();

    await api.patch(
      `/pacientes/${id}`,
      { apellido: 'Clínica Pérez', creatininaMgDl: 1.8 },
      medico.token,
    );

    const { eventos } = await historial(id);
    const porTipo = new Map(eventos.map((e) => [e.tipo, e]));

    expect(porTipo.get('PACIENTE_EDITADO')?.cambios).toEqual([
      { campo: 'Apellido', antes: 'Clínica', despues: 'Clínica Pérez' },
    ]);

    // El Clcr entra aunque el médico no lo haya escrito: lo recalculó el
    // sistema, y verlo bajar explica las alertas que aparecen después.
    const renal = porTipo.get('DATOS_RENALES');
    expect(renal?.cambios?.map((c) => c.campo)).toEqual(['Creatinina', 'Clcr']);
    expect(renal?.cambios?.[0]).toEqual({
      campo: 'Creatinina',
      antes: '1.1 mg/dL',
      despues: '1.8 mg/dL',
    });
  });

  it('el embarazo queda registrado con la semana', async () => {
    const id = await crearPaciente();

    await api.patch(`/pacientes/${id}`, { semanaGestacion: 24 }, medico.token);

    const { eventos } = await historial(id);
    expect(eventos[0]!.tipo).toBe('EMBARAZO_LACTANCIA');
    expect(eventos[0]!.cambios).toEqual([
      { campo: 'Semana de gestación', antes: null, despues: '24 semanas' },
    ]);
    expect(eventos[0]!.detalle).toMatch(/semana 24/);
  });

  it('viene del más nuevo al más viejo', async () => {
    const id = await crearPaciente();
    await api.patch(`/pacientes/${id}`, { apellido: 'Primera' }, medico.token);
    await api.patch(`/pacientes/${id}`, { apellido: 'Segunda' }, medico.token);

    const { eventos } = await historial(id);
    const fechas = eventos.map((e) => new Date(e.createdAt).getTime());
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    expect(eventos[eventos.length - 1]!.tipo).toBe('PACIENTE_CREADO');
  });

  it('el historial de otro médico no se ve', async () => {
    const id = await crearPaciente();

    const otro = await crearMedico(api);
    medicos.push(otro.id);

    const r = await api.get(`/pacientes/${id}/historial`, otro.token);
    // Sin filas propias devuelve vacío, no las ajenas.
    expect(r.cuerpo!.data.eventos).toEqual([]);
  });

  it('pagina hacia atrás sin repetir', async () => {
    const id = await crearPaciente();
    for (let i = 0; i < 4; i += 1) {
      await api.patch(`/pacientes/${id}`, { apellido: `Vuelta ${i}` }, medico.token);
    }

    const primera = await api.get(`/pacientes/${id}/historial?limite=3`, medico.token);
    const todos = (primera.cuerpo!.data as { eventos: { createdAt: string }[] }).eventos;
    const corte = todos[1]!.createdAt;

    const segunda = await api.get(
      `/pacientes/${id}/historial?antesDe=${encodeURIComponent(corte)}`,
      medico.token,
    );
    const siguientes = (segunda.cuerpo!.data as { eventos: { createdAt: string }[] }).eventos;

    expect(siguientes.every((e) => new Date(e.createdAt) < new Date(corte))).toBe(true);
  });
});
