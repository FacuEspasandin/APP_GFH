/**
 * El test que protege la lección más cara de GFH: **el número de consultas no
 * puede crecer con la cantidad de fármacos**.
 *
 * No usa base: reemplaza el cliente de Prisma por un doble que cuenta llamadas.
 * Lo que se verifica no es el resultado de la query sino su CANTIDAD y su
 * forma — que `medicoId` esté en el where, y que los catálogos se pidan con un
 * `IN` y no de a uno.
 */

import { describe, expect, it } from 'vitest';

import { RepositorioCockpitPrisma } from './repositorio-cockpit-prisma';

interface Llamada {
  modelo: string;
  metodo: string;
  args: any;
}

/** Genera un paciente con N prescripciones, cada una con 1 principio activo. */
function prismaFalso(cantidadFarmacos: number) {
  const llamadas: Llamada[] = [];
  const registrar = (modelo: string, metodo: string, resultado: unknown) => (args: any) => {
    llamadas.push({ modelo, metodo, args });
    return Promise.resolve(resultado);
  };

  const prescripciones = Array.from({ length: cantidadFarmacos }, (_, i) => ({
    id: `presc-${i}`,
    esFarmacoLibre: false,
    nombreLibre: null,
    productoComercialId: `prod-${i}`,
    dosis: '1 comp',
    frecuencia: 'cada 12 h',
    via: 'ORAL',
    productoComercial: {
      nombreComercial: `Producto ${i}`,
      principiosActivos: [
        {
          principioActivo: {
            id: `pa-${i}`,
            nombre: `Fármaco ${i}`,
            gruposAlergenicos: [],
          },
        },
      ],
    },
  }));

  const cliente = {
    paciente: {
      findFirst: registrar('paciente', 'findFirst', {
        id: 'pac-1',
        medicoId: 'med-1',
        nombre: 'Ana',
        apellido: 'Pérez',
        fechaNacimiento: new Date('1950-03-02T00:00:00Z'),
        sexo: 'F',
        pesoKg: null,
        alturaCm: null,
        creatininaMgDl: null,
        clcrMlMin: null,
        clcrOrigen: null,
        clcrMedidoAt: null,
        childPughClase: null,
        childPughOrigen: null,
        semanaGestacion: null,
        estaLactando: null,
      }),
    },
    prescripcion: { findMany: registrar('prescripcion', 'findMany', prescripciones) },
    condicionPaciente: { findMany: registrar('condicionPaciente', 'findMany', []) },
    alergia: { findMany: registrar('alergia', 'findMany', []) },
    configuracionUsuario: { findUnique: registrar('configuracionUsuario', 'findUnique', null) },
    ajusteRenalFarmaco: { findMany: registrar('ajusteRenalFarmaco', 'findMany', []) },
    alertaCondicionFarmaco: { findMany: registrar('alertaCondicionFarmaco', 'findMany', []) },
    grupoAlergenico: { findMany: registrar('grupoAlergenico', 'findMany', []) },
    interaccionCurada: { findMany: registrar('interaccionCurada', 'findMany', []) },
  };

  return { cliente, llamadas };
}

const HOY = () => new Date('2026-08-09T12:00:00Z');

describe('número fijo de consultas (motor §4.6, §5.5, §8.5)', () => {
  it('con 3 y con 30 fármacos hace exactamente la misma cantidad de consultas', async () => {
    const pocos = prismaFalso(3);
    const muchos = prismaFalso(30);

    await new RepositorioCockpitPrisma(pocos.cliente as any, HOY).cargarContexto('med-1', 'pac-1');
    await new RepositorioCockpitPrisma(muchos.cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    expect(muchos.llamadas.length).toBe(pocos.llamadas.length);
  });

  it('son 9 consultas, y ninguna se repite por fármaco', async () => {
    const { cliente, llamadas } = prismaFalso(12);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    expect(llamadas).toHaveLength(9);

    // Ningún modelo se consulta dos veces: si alguno aparece repetido, es que
    // hay un bucle con await adentro.
    const modelos = llamadas.map((l) => l.modelo);
    expect(new Set(modelos).size).toBe(modelos.length);
  });

  it('los catálogos se piden con un IN, no de a un fármaco por vez', async () => {
    const { cliente, llamadas } = prismaFalso(12);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    const ajustes = llamadas.find((l) => l.modelo === 'ajusteRenalFarmaco')!;
    expect(ajustes.args.where.principioActivoId.in).toHaveLength(12);
  });

  it('sin prescripciones no consulta el catálogo clínico', async () => {
    const { cliente, llamadas } = prismaFalso(0);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    expect(llamadas.find((l) => l.modelo === 'ajusteRenalFarmaco')).toBeUndefined();
    expect(llamadas.find((l) => l.modelo === 'alertaCondicionFarmaco')).toBeUndefined();
  });
});

describe('aislamiento por medicoId (regla no negociable 3)', () => {
  it('toda consulta de datos de paciente lleva medicoId en el where', async () => {
    const { cliente, llamadas } = prismaFalso(5);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    const deDatosDePaciente = ['paciente', 'prescripcion', 'condicionPaciente', 'alergia'];
    for (const modelo of deDatosDePaciente) {
      const llamada = llamadas.find((l) => l.modelo === modelo)!;
      expect(llamada.args.where.medicoId, `${modelo} sin medicoId en el where`).toBe('med-1');
    }
  });

  it('el catálogo clínico NO lleva medicoId: es compartido y sin dueño', async () => {
    const { cliente, llamadas } = prismaFalso(5);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    for (const modelo of ['ajusteRenalFarmaco', 'alertaCondicionFarmaco', 'grupoAlergenico']) {
      const llamada = llamadas.find((l) => l.modelo === modelo);
      expect(llamada?.args?.where?.medicoId).toBeUndefined();
    }
  });

  it('un paciente de otro médico devuelve null, no un error distinto', async () => {
    const { cliente } = prismaFalso(0);
    cliente.paciente.findFirst = () => Promise.resolve(null) as any;

    const r = await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('otro', 'pac-1');
    expect(r).toBeNull();
  });
});

describe('condiciones sintéticas entran al IN de las alertas', () => {
  it('un paciente de 76 años dispara la búsqueda de alertas de ADULTO_MAYOR', async () => {
    // Sin esto, las reglas de Beers no se consultarían nunca: ADULTO_MAYOR no
    // es una fila de CondicionPaciente.
    const { cliente, llamadas } = prismaFalso(2);
    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    const alertas = llamadas.find((l) => l.modelo === 'alertaCondicionFarmaco')!;
    expect(alertas.args.where.condicionClinica.codigo.in).toContain('ADULTO_MAYOR');
  });

  it('respeta el umbral configurado por el médico', async () => {
    const { cliente, llamadas } = prismaFalso(2);
    cliente.configuracionUsuario.findUnique = (() =>
      Promise.resolve({ umbralAdultoMayor: 80 })) as any;

    await new RepositorioCockpitPrisma(cliente as any, HOY).cargarContexto('med-1', 'pac-1');

    // La paciente tiene 76: con umbral 80 ya no es adulto mayor.
    const alertas = llamadas.find((l) => l.modelo === 'alertaCondicionFarmaco');
    expect(alertas?.args.where.condicionClinica.codigo.in ?? []).not.toContain('ADULTO_MAYOR');
  });
});
