/**
 * ============================================================================
 * DATOS DE DEMO PARA DESARROLLO — no son pacientes reales
 * ============================================================================
 *
 * Crea un médico de prueba, unos productos comerciales y un paciente con
 * medicación elegida para que se disparen las cuatro verificaciones a la vez.
 *
 * Los PRINCIPIOS ACTIVOS son los reales del catálogo de GFH. Los PRODUCTOS
 * COMERCIALES son inventados: GFH no los tiene (su catálogo es a nivel de
 * principio activo) y el proveedor real todavía no está integrado. Es el hueco
 * que sigue abierto — ver docs/data/README.md.
 *
 * Idempotente: se puede correr varias veces.
 */

import { PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();

const MEDICO_EMAIL = 'demo@gfh.app';
const MEDICO_PASSWORD = 'DemoGFH2026!';

/** Productos de demo sobre principios activos reales. */
const PRODUCTOS: Array<{ nombre: string; laboratorio: string; forma: string; dosis: string; pas: string[] }> = [
  { nombre: 'Coumadin', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '5 mg', pas: ['Warfarina'] },
  { nombre: 'Ibupirac', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '600 mg', pas: ['Ibuprofeno'] },
  { nombre: 'Klaricid', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '500 mg', pas: ['Claritromicina'] },
  { nombre: 'Zocor', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '20 mg', pas: ['Simvastatina'] },
  { nombre: 'Eliquis', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '5 mg', pas: ['Apixabán'] },
  // Combinado. Es EL caso que rompía el unique original de InteraccionDetectada:
  // sus dos componentes interactúan por separado con la warfarina (regla 11),
  // así que una sola prescripción genera DOS interacciones sobre el mismo par
  // de prescripciones.
  //
  // Ojo con el catálogo: SEN modela varias combinaciones como UN principio
  // activo ("Amoxicilina/Clavulánico" es una sola fila, no dos), así que no
  // sirve cualquier combo. Sulfametoxazol y Trimetoprim sí existen sueltos.
  { nombre: 'Bactrim', laboratorio: 'Demo Lab', forma: 'Comprimido', dosis: '800/160 mg', pas: ['Sulfametoxazol', 'Trimetoprim'] },
];

async function main() {
  const { HashService } = await import('../src/aplicacion/auth/hash.service');
  const passwordHash = await new HashService().hashearPassword(MEDICO_PASSWORD);

  // Upsert por nombre de usuario y no por email: así sigue siendo idempotente
  // aunque el email de demo cambie.
  const medico = await prisma.medico.upsert({
    where: { nombreUsuario: 'demo' },
    update: {
      passwordHash,
      email: MEDICO_EMAIL,
      disclaimerVersion: '1.0',
      disclaimerAceptadoAt: new Date(),
    },
    create: {
      email: MEDICO_EMAIL,
      nombreUsuario: 'demo',
      passwordHash,
      nombre: 'Médico',
      apellido: 'de Prueba',
      rol: 'PREMIUM',
      // El disclaimer se da por aceptado para que la demo no arranque con el
      // modal de primer ingreso. En la app real esto lo escribe el usuario.
      disclaimerVersion: '1.0',
      disclaimerAceptadoAt: new Date(),
      configuracion: { create: { umbralAdultoMayor: 65 } },
    },
  });

  const idPa = new Map(
    (await prisma.principioActivo.findMany({ select: { id: true, nombreNormalizado: true } })).map(
      (p) => [p.nombreNormalizado, p.id],
    ),
  );
  const pa = (n: string) => {
    const id = idPa.get(normalizar(n));
    if (!id) throw new Error(`Falta el principio activo "${n}" — ¿corriste el seed del catálogo?`);
    return id;
  };

  const productos = new Map<string, string>();
  for (const p of PRODUCTOS) {
    const producto = await prisma.productoComercial.upsert({
      where: {
        producto_unico: {
          nombreNormalizado: normalizar(p.nombre),
          laboratorio: p.laboratorio,
          dosisTexto: p.dosis,
          formaFarmaceutica: p.forma,
        },
      },
      update: {},
      create: {
        nombreComercial: p.nombre,
        nombreNormalizado: normalizar(p.nombre),
        laboratorio: p.laboratorio,
        formaFarmaceutica: p.forma,
        dosisTexto: p.dosis,
      },
    });
    productos.set(p.nombre, producto.id);
    for (const nombrePa of p.pas) {
      await prisma.productoComercialPrincipioActivo.upsert({
        where: {
          productoComercialId_principioActivoId: {
            productoComercialId: producto.id,
            principioActivoId: pa(nombrePa),
          },
        },
        update: {},
        create: { productoComercialId: producto.id, principioActivoId: pa(nombrePa) },
      });
    }
  }

  const grupo = await prisma.grupo.upsert({
    where: { medicoId_nombre: { medicoId: medico.id, nombre: 'Consultorio' } },
    update: {},
    create: { medicoId: medico.id, nombre: 'Consultorio' },
  });

  // Paciente elegido para que se disparen las cuatro verificaciones:
  //   · 78 años  → condición sintética ADULTO_MAYOR
  //   · Clcr bajo (mujer, 58 kg, creatinina 1,6) → ajuste renal
  //   · Warfarina + Ibuprofeno → interacción ALTA
  //   · Claritromicina + Simvastatina → interacción CONTRAINDICADA
  //   · Bactrim (2 componentes) + Warfarina → DOS interacciones, mismo par
  //   · alergia a Sulfametoxazol → coincidencia EXACTA sobre un componente
  await prisma.paciente.deleteMany({ where: { medicoId: medico.id, documento: 'DEMO-1' } });
  const paciente = await prisma.paciente.create({
    data: {
      medicoId: medico.id,
      grupoId: grupo.id,
      nombre: 'Ana María',
      apellido: 'Rodríguez',
      documento: 'DEMO-1',
      fechaNacimiento: new Date('1948-04-12T00:00:00Z'),
      sexo: 'F',
      alturaCm: 158,
      pesoKg: 58,
      creatininaMgDl: 1.6,
      clcrMedidoAt: new Date(),
    },
  });

  // Clcr calculado con la fórmula del motor, guardado con su origen.
  const { calcularClcr, edadEnAnios } = await import('@gfh/shared-types');
  const clcr = calcularClcr({
    edadAnios: edadEnAnios(paciente.fechaNacimiento, new Date()),
    pesoKg: 58,
    creatininaMgDl: 1.6,
    sexo: 'F',
  });
  await prisma.paciente.update({
    where: { id: paciente.id },
    data: { clcrMlMin: clcr, clcrOrigen: 'CALCULADO_COCKCROFT' },
  });

  const prescribir = (nombreProducto: string, dosis: string, frecuencia: string) =>
    prisma.prescripcion.create({
      data: {
        medicoId: medico.id,
        pacienteId: paciente.id,
        productoComercialId: productos.get(nombreProducto)!,
        dosis,
        frecuencia,
        via: 'ORAL',
        estado: 'ACTIVO',
      },
    });

  await prescribir('Coumadin', '5 mg', 'cada 24 h');
  await prescribir('Ibupirac', '600 mg', 'cada 8 h');
  await prescribir('Klaricid', '500 mg', 'cada 12 h');
  await prescribir('Zocor', '20 mg', 'cada 24 h');
  await prescribir('Bactrim', '800/160 mg', 'cada 12 h');

  // Fármaco libre: no participa de ninguna verificación, salvo la alerta
  // genérica por Clcr bajo.
  await prisma.prescripcion.create({
    data: {
      medicoId: medico.id,
      pacienteId: paciente.id,
      esFarmacoLibre: true,
      nombreLibre: 'Suplemento herbal sin identificar',
      dosis: '1 cápsula',
      frecuencia: 'cada 24 h',
      via: 'ORAL',
      estado: 'ACTIVO',
    },
  });

  const hta = await prisma.condicionClinica.findUnique({ where: { codigo: 'HTA' } });
  const ulcera = await prisma.condicionClinica.findUnique({ where: { codigo: 'ULCERA' } });
  for (const c of [hta, ulcera].filter((x) => x !== null)) {
    await prisma.condicionPaciente.upsert({
      where: { pacienteId_condicionClinicaId: { pacienteId: paciente.id, condicionClinicaId: c.id } },
      update: {},
      create: { medicoId: medico.id, pacienteId: paciente.id, condicionClinicaId: c.id, activo: true },
    });
  }

  const sulfas = await prisma.grupoAlergenico.findUnique({ where: { codigo: 'SULFAS' } });
  await prisma.alergia.create({
    data: {
      medicoId: medico.id,
      pacienteId: paciente.id,
      tipo: 'FARMACOLOGICA',
      severidad: 'MODERADA', // exacta pero no grave → no bloquea, pide confirmación
      principioActivoId: pa('Sulfametoxazol'),
      grupoAlergenicoId: sulfas?.id ?? null,
      activo: true,
    },
  });

  const puerto = process.env.PORT ?? '3333';
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  USUARIO DE PRUEBA — datos de demo, no pacientes reales   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  email       : ${MEDICO_EMAIL}`);
  console.log(`  usuario     : demo`);
  console.log(`  contraseña  : ${MEDICO_PASSWORD}\n`);
  console.log(`  medicoId    : ${medico.id}`);
  console.log(`  pacienteId  : ${paciente.id}`);
  console.log(`  Clcr        : ${clcr} mL/min (calculado)\n`);
  console.log('  1) Login:');
  console.log(`     curl -s -X POST http://127.0.0.1:${puerto}/auth/login \\`);
  console.log(`       -H "content-type: application/json" \\`);
  console.log(`       -d '{"identificador":"${MEDICO_EMAIL}","password":"${MEDICO_PASSWORD}"}'\n`);
  console.log('  2) Cockpit (con el accessToken de arriba):');
  console.log(`     curl -H "authorization: Bearer <accessToken>" \\`);
  console.log(`       http://127.0.0.1:${puerto}/pacientes/${paciente.id}/cockpit\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
