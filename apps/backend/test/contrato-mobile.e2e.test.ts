import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  buscarPrincipioActivo,
  buscarProducto,
  cliente,
  crearMedico,
  crearPaciente,
  darSuscripcion,
  levantarApp,
  type Contexto,
  type Respuesta,
} from './ayuda';

/**
 * El contrato con la app: cada caso manda el cuerpo EXACTO que arma una
 * pantalla del mobile.
 *
 * Existe por lo que pasó al arreglar la validación. Durante meses ningún
 * cuerpo se validó —`tsx` no emite la metadata que `ValidationPipe` necesita—
 * y al enchufarla de verdad, con `forbidNonWhitelisted`, cualquier campo que
 * la app mandara de más pasaba de ser ignorado en silencio a devolver 400. Un
 * arreglo del backend puede romper la app sin que se caiga un solo test del
 * backend; esto lo evita.
 *
 * La regla del archivo: si una pantalla cambia lo que envía, el caso de acá
 * cambia con ella. Copiar el cuerpo tal cual —incluidos los campos
 * opcionales— es lo que le da sentido.
 */
describe('contrato con el mobile', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; email: string; token: string };
  let paciente: string;
  let productoId: string;
  let principioActivoId: string;

  /** Cualquier cosa menos 400/422: el punto es que el cuerpo sea aceptable. */
  const aceptado = (r: Respuesta, donde: string) => {
    expect([400, 422], `${donde} → ${JSON.stringify(r.cuerpo)}`).not.toContain(r.status);
  };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    await darSuscripcion(ctx.prisma, medico.id);

    paciente = await crearPaciente(api, medico.token);
    productoId = (await buscarProducto(api, medico.token, 'Ibuprofeno')).id;
    principioActivoId = (await buscarPrincipioActivo(api, medico.token, 'Ibuprofeno')).id;
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('registro.tsx', async () => {
    const marca = `contrato${process.pid}`;
    const r = await api.post('/auth/registro', {
      nombre: 'Ana',
      apellido: 'Pérez',
      nombreUsuario: marca,
      email: `${marca}@gfh.test`,
      password: 'ContrasenaLarga1',
    });
    aceptado(r, 'registro');
    if (r.cuerpo?.data) {
      const yo = await api.get('/auth/yo', r.cuerpo.data.accessToken);
      medicos.push(yo.cuerpo!.data.id);
    }
  });

  it('disclaimer.tsx', async () => {
    aceptado(await api.post('/auth/disclaimer', { version: '1.0' }, medico.token), 'disclaimer');
  });

  it('crear-grupo.tsx', async () => {
    aceptado(
      await api.post('/grupos', { nombre: `Consultorio ${process.pid}` }, medico.token),
      'crear grupo',
    );
  });

  it('crear-paciente.tsx — con todos los opcionales puestos', async () => {
    const r = await api.post(
      '/pacientes',
      {
        nombre: 'Luis',
        apellido: 'Gómez',
        documento: '1234567-8',
        fechaNacimiento: new Date(Date.UTC(1955, 7, 3)).toISOString(),
        sexo: 'M',
        alturaCm: 174,
        pesoKg: 80,
        creatininaMgDl: 1.1,
      },
      medico.token,
    );
    aceptado(r, 'crear paciente completo');
  });

  it('crear-paciente.tsx — con todos los opcionales omitidos', async () => {
    const r = await api.post(
      '/pacientes',
      {
        nombre: 'Sin',
        apellido: 'Datos',
        fechaNacimiento: new Date(Date.UTC(1990, 0, 1)).toISOString(),
        sexo: 'F',
      },
      medico.token,
    );
    aceptado(r, 'crear paciente mínimo');
  });

  it('paciente/[id]/editar.tsx', async () => {
    const r = await api.patch(
      `/pacientes/${paciente}`,
      {
        nombre: 'Paciente',
        apellido: 'Editado',
        fechaNacimiento: new Date(Date.UTC(1948, 3, 12)).toISOString(),
        sexo: 'F',
        alturaCm: 160,
      },
      medico.token,
    );
    aceptado(r, 'editar paciente');
  });

  it('paciente/[id]/datos-renales.tsx — modo manual y modo calculado', async () => {
    aceptado(
      await api.patch(`/pacientes/${paciente}/datos-renales`, { clcrMlMin: 42 }, medico.token),
      'renales manual',
    );
    aceptado(
      await api.patch(
        `/pacientes/${paciente}/datos-renales`,
        { pesoKg: 58, creatininaMgDl: 1.6 },
        medico.token,
      ),
      'renales calculado',
    );
  });

  it('paciente/[id]/agregar-farmaco.tsx — producto del catálogo', async () => {
    const r = await api.post(
      `/pacientes/${paciente}/prescripciones`,
      {
        productoComercialId: productoId,
        dosis: '600 mg',
        frecuencia: 'cada 8 h',
        via: 'ORAL',
        indicacion: 'Dolor',
      },
      medico.token,
    );
    aceptado(r, 'agregar fármaco');
  });

  it('paciente/[id]/agregar-farmaco.tsx — fármaco libre', async () => {
    const r = await api.post(
      `/pacientes/${paciente}/prescripciones`,
      {
        esFarmacoLibre: true,
        nombreLibre: 'Preparado magistral',
        dosis: '1 aplicación',
        frecuencia: 'cada 24 h',
        via: 'TOPICA',
      },
      medico.token,
    );
    aceptado(r, 'fármaco libre');
  });

  it('prescripcion/[id].tsx', async () => {
    const cockpit = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const pr = cockpit.cuerpo!.data.prescripciones[0];
    expect(pr).toBeDefined();

    const r = await api.patch(
      `/prescripciones/${pr.id}`,
      { dosis: '400 mg', frecuencia: 'cada 12 h', via: 'ORAL', estado: 'ACTIVO' },
      medico.token,
    );
    aceptado(r, 'editar prescripción');
  });

  it('paciente/[id]/agregar-condicion.tsx', async () => {
    const condiciones = await api.get('/catalogo/condiciones', medico.token);
    const condicion = condiciones.cuerpo!.data[0];
    expect(condicion).toBeDefined();

    aceptado(
      await api.post(
        `/pacientes/${paciente}/condiciones`,
        { condicionClinicaId: condicion.id },
        medico.token,
      ),
      'agregar condición',
    );
  });

  it('paciente/[id]/agregar-alergia.tsx — a un fármaco y texto libre', async () => {
    aceptado(
      await api.post(
        `/pacientes/${paciente}/alergias`,
        { tipo: 'FARMACOLOGICA', severidad: 'LEVE', principioActivoId },
        medico.token,
      ),
      'alergia a un fármaco',
    );
    aceptado(
      await api.post(
        `/pacientes/${paciente}/alergias`,
        { tipo: 'GENERAL', severidad: 'LEVE', descripcion: 'Maní' },
        medico.token,
      ),
      'alergia de texto libre',
    );
  });

  it('paciente/[id]/foto.tsx — matchear líneas y probar la foto', async () => {
    aceptado(
      await api.post(
        `/pacientes/${paciente}/lineas/matchear`,
        { textos: ['Ibuprofeno 600 mg cada 8 horas'] },
        medico.token,
      ),
      'matchear líneas',
    );
    // El endpoint puede responder que la función no está configurada; lo que
    // no puede es rechazar el cuerpo.
    aceptado(
      await api.post(`/pacientes/${paciente}/foto`, { imagenBase64: '' }, medico.token),
      'procesar foto',
    );
  });

  it('herramientas/interacciones.tsx', async () => {
    // Dos fármacos, que es el mínimo: la pantalla deshabilita el botón con uno
    // solo, así que el cuerpo con un elemento nunca llega al backend.
    const otro = await buscarPrincipioActivo(api, medico.token, 'Warfarina');
    aceptado(
      await api.post(
        '/herramientas/interacciones',
        { principioActivoIds: [principioActivoId, otro.id] },
        medico.token,
      ),
      'herramienta interacciones',
    );
  });

  it('herramientas/renal.tsx — modo directo y modo calculado', async () => {
    aceptado(
      await api.post(
        '/herramientas/ajuste-renal',
        { principioActivoIds: [principioActivoId], clcrMlMin: 30 },
        medico.token,
      ),
      'renal directo',
    );
    aceptado(
      await api.post(
        '/herramientas/ajuste-renal',
        {
          principioActivoIds: [principioActivoId],
          edadAnios: 78,
          pesoKg: 58,
          creatininaMgDl: 1.6,
          sexo: 'F',
        },
        medico.token,
      ),
      'renal calculado',
    );
  });

  it('herramientas/condicion-alergia.tsx', async () => {
    const grupos = await api.get('/catalogo/grupos-alergenicos', medico.token);
    const condiciones = await api.get('/catalogo/condiciones', medico.token);

    aceptado(
      await api.post(
        '/herramientas/condicion-alergia',
        {
          principioActivoId,
          condicionIds: [condiciones.cuerpo!.data[0].id],
          grupoAlergenicoIds: [grupos.cuerpo!.data[0].id],
          severidadAlergia: 'LEVE',
        },
        medico.token,
      ),
      'herramienta condición/alergia',
    );
  });

  it('perfil/cuenta.tsx', async () => {
    aceptado(
      await api.patch(
        '/perfil/datos',
        { nombre: 'Médico', apellido: 'Prueba', email: medico.email },
        medico.token,
      ),
      'datos de perfil',
    );
  });

  it('perfil/password.tsx', async () => {
    const r = await api.post(
      '/auth/password',
      { actual: 'PruebaIntegracion1', nueva: 'OtraContrasena9' },
      medico.token,
    );
    aceptado(r, 'cambiar contraseña');
  });

  it('perfil/eliminar-cuenta.tsx', async () => {
    // Cuenta descartable: este cuerpo borra de verdad.
    const victima = await crearMedico(api);
    await darSuscripcion(ctx.prisma, victima.id);
    const r = await api.post(
      '/perfil/eliminar-cuenta',
      { password: 'PruebaIntegracion1' },
      victima.token,
    );
    aceptado(r, 'eliminar cuenta');
    medicos.push(victima.id);
  });
});
