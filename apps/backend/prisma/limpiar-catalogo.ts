/**
 * Achica el catálogo a lo que sabemos que es real.
 *
 * El catálogo de 631 fármacos nunca se curó para lo que hace GFH Móvil: se
 * heredó completo de la tabla renal SEN (Nefrología al día), pensada para
 * cubrir CUALQUIER fármaco que un nefrólogo pueda necesitar dosificar —
 * oncología, antirretrovirales, enfermedad rara incluidos. Nada de eso se
 * revisó nunca contra una ficha real.
 *
 * Se queda un fármaco si:
 *   1. Tiene ficha técnica transcripta (`monografias-texto.json`, ~30) — lo
 *      único con acceso de prueba real.
 *   2. Lo nombra una regla de interacción (`reglas-interaccion.json`).
 *   3. Tiene una alerta condición-fármaco cargada (`alertas-condicion-
 *      farmaco.json`) — dato heredado del export original de GFH, no
 *      inventado ni scrapeado en esta sesión.
 *   4. Aparece en Alternativas Terapéuticas (`alternativas-terapeuticas.
 *      json`), origen o alternativa — mismo motivo que el punto 3.
 *
 * El resto sale: es la tabla SEN cruda, sin ningún dato propio encima.
 * Decisión tomada con el usuario el 2026-09-03 — ver conversación de esa
 * sesión para el detalle de cómo se llegó a estos cuatro criterios.
 *
 * Salvaguardas:
 *   - Aborta si algún fármaco a sacar tiene prescripción real, alergia de
 *     paciente, interacción ya detectada o monografía — no debería pasar
 *     nunca dado los criterios de arriba, pero se verifica antes de tocar
 *     nada por si el estado de la base cambió desde que se decidió la lista.
 *   - Antes de borrar, vuelca a un JSON con fecha todo lo que se va a perder
 *     de la base (el fármaco, su tabla renal, su tabla hepática si tiene, su
 *     producto genérico) — Supabase free no tiene point-in-time recovery, así
 *     que este archivo ES la única forma de recuperar algo si hace falta.
 *   - Reescribe los JSON fuente (`principios-activos.json`,
 *     `farmacos-ajuste-renal.json`, `principio-activo-grupo-alergenico.json`)
 *     para que un reseed futuro no resucite lo que se sacó. Son archivos con
 *     git: el respaldo de ESOS ya existe en el historial.
 *
 *   tsx prisma/limpiar-catalogo.ts            → simulacro (no escribe nada)
 *   tsx prisma/limpiar-catalogo.ts --aplicar   → backup + borra + reescribe
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

const DATA = join(__dirname, '..', '..', '..', 'docs', 'data');
const leerData = <T>(archivo: string): T => JSON.parse(readFileSync(join(DATA, archivo), 'utf8')) as T;
const DATOS_BACKEND = join(__dirname, 'datos');

// --- 1. calcular qué se queda, solo a partir de los JSON fuente -------------

function calcularConservar(): Set<string> {
  const monografias = JSON.parse(
    readFileSync(join(DATOS_BACKEND, 'monografias-texto.json'), 'utf8'),
  ) as { farmacos: Array<{ nombre: string }> };
  const reglas = leerData<{
    reglas: Array<{ aResuelta?: string[]; bResuelta?: string[] }>;
    paresExtra?: Array<{ aResuelta?: string[]; bResuelta?: string[] }>;
  }>('reglas-interaccion.json');
  const alertas = leerData<Array<{ principioActivoNombre: string }>>('alertas-condicion-farmaco.json');
  const alternativas = leerData<Array<{ paOrigenNombre: string; paAlternativaNombre: string }>>(
    'alternativas-terapeuticas.json',
  );

  const conservar = new Set<string>();
  for (const f of monografias.farmacos) conservar.add(f.nombre);
  for (const r of [...reglas.reglas, ...(reglas.paresExtra ?? [])]) {
    for (const n of [...(r.aResuelta ?? []), ...(r.bResuelta ?? [])]) conservar.add(n);
  }
  for (const a of alertas) conservar.add(a.principioActivoNombre);
  for (const a of alternativas) {
    conservar.add(a.paOrigenNombre);
    conservar.add(a.paAlternativaNombre);
  }
  return conservar;
}

interface PaExport {
  nombre: string;
  grupoTerapeutico: string | null;
  viaDefault: string;
  tieneAjusteRenal: boolean;
  codigoATC?: string | null;
}
interface RenalExport {
  pa: string;
  [k: string]: unknown;
}
interface MiembroExport {
  principioActivoNombre: string;
  grupoCodigo: string;
}

async function main() {
  const conservar = calcularConservar();

  const todosPa = leerData<PaExport[]>('principios-activos.json');
  const aSacar = todosPa.filter((p) => !conservar.has(p.nombre));
  const aConservar = todosPa.filter((p) => conservar.has(p.nombre));

  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} · limpieza de catálogo\n`);
  console.log(`principios-activos.json: ${todosPa.length} filas`);
  console.log(`  conservar: ${aConservar.length}`);
  console.log(`  sacar:     ${aSacar.length}\n`);

  const renal = leerData<{ farmacos: RenalExport[] }>('farmacos-ajuste-renal.json');
  const renalASacar = renal.farmacos.filter((f) => !conservar.has(f.pa));
  console.log(`farmacos-ajuste-renal.json: ${renal.farmacos.length} filas, sacar ${renalASacar.length}`);

  const miembrosGrupo = leerData<MiembroExport[]>('principio-activo-grupo-alergenico.json');
  const miembrosASacar = miembrosGrupo.filter((m) => !conservar.has(m.principioActivoNombre));
  console.log(`principio-activo-grupo-alergenico.json: ${miembrosGrupo.length} filas, sacar ${miembrosASacar.length}`);

  // --- 2. resolver contra la base real: ids + salvaguardas ------------------
  const nombresASacarNorm = new Set(aSacar.map((p) => normalizar(p.nombre)));
  const pasEnBase = await prisma.principioActivo.findMany({
    select: { id: true, nombre: true, nombreNormalizado: true },
  });
  const idsASacar = pasEnBase.filter((p) => nombresASacarNorm.has(p.nombreNormalizado)).map((p) => p.id);

  console.log(`\nEncontrados en la base: ${idsASacar.length} de ${aSacar.length} a sacar.`);
  if (idsASacar.length !== aSacar.length) {
    const nombresEnBase = new Set(pasEnBase.map((p) => p.nombreNormalizado));
    const noEncontrados = aSacar.filter((p) => !nombresEnBase.has(normalizar(p.nombre)));
    console.log('  (ya no estaban en la base, no pasa nada):', noEncontrados.map((p) => p.nombre).join(', '));
  }

  const [prescripciones, alergiasPac, interacciones, monografiasDb, alternativasDb] = await Promise.all([
    prisma.prescripcion.count({
      where: { productoComercial: { principiosActivos: { some: { principioActivoId: { in: idsASacar } } } } },
    }),
    prisma.alergia.count({ where: { principioActivoId: { in: idsASacar } } }),
    prisma.interaccionDetectada.count({
      where: { OR: [{ principioActivoAId: { in: idsASacar } }, { principioActivoBId: { in: idsASacar } }] },
    }),
    prisma.monografiaFarmaco.count({ where: { principioActivoId: { in: idsASacar } } }),
    prisma.alternativaTerapeutica.count({
      where: { OR: [{ paOrigenId: { in: idsASacar } }, { paAlternativaId: { in: idsASacar } }] },
    }),
  ]);

  console.log('\nSalvaguardas (todo debería ser 0):');
  console.log({ prescripciones, alergiasPac, interacciones, monografias: monografiasDb, alternativas: alternativasDb });

  if (prescripciones + alergiasPac + interacciones + monografiasDb + alternativasDb > 0) {
    throw new Error(
      'ABORTADO: hay dato real enganchado a un fármaco que se iba a sacar. ' +
        'Revisar antes de seguir — no se tocó nada.',
    );
  }

  if (!APLICAR) {
    console.log('\nNada se escribió. Volvé a correr con --aplicar.');
    return;
  }

  // --- 3. backup: todo lo que se va a perder de la base ---------------------
  const backupData = await prisma.principioActivo.findMany({
    where: { id: { in: idsASacar } },
    include: {
      ajustesRenales: { include: { rangos: true } },
      ajustesHepaticos: { include: { rangos: true } },
      productos: { include: { productoComercial: true } },
    },
  });

  const backupDir = join(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const fecha = new Date().toISOString().slice(0, 10);
  const backupPath = join(backupDir, `catalogo-limpieza-${fecha}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        _lea_esto: [
          'Respaldo de los principios activos sacados del catálogo el ' + fecha + '.',
          'Supabase free no tiene point-in-time recovery — este archivo es la',
          'única forma de recuperar algo de acá si hace falta. No borrar.',
        ],
        fecha,
        cantidad: backupData.length,
        farmacos: backupData,
      },
      null,
      1,
    ),
  );
  console.log(`\nBackup escrito: ${backupPath} (${backupData.length} fármacos)`);

  // --- 4. borrar en orden seguro (ProductoComercialPrincipioActivo.principioActivo es Restrict) ---
  const productosGenericos = await prisma.productoComercial.findMany({
    where: { esGenerico: true, principiosActivos: { some: { principioActivoId: { in: idsASacar } } } },
    select: { id: true },
  });
  const idsProductos = productosGenericos.map((p) => p.id);

  const junction = await prisma.productoComercialPrincipioActivo.deleteMany({
    where: { OR: [{ principioActivoId: { in: idsASacar } }, { productoComercialId: { in: idsProductos } }] },
  });
  const productosBorrados = await prisma.productoComercial.deleteMany({ where: { id: { in: idsProductos } } });
  const pasBorrados = await prisma.principioActivo.deleteMany({ where: { id: { in: idsASacar } } });

  console.log('\nBorrado de la base:');
  console.log({ junction: junction.count, productos: productosBorrados.count, principiosActivos: pasBorrados.count });

  // --- 5. reescribir los JSON fuente -----------------------------------------
  writeFileSync(join(DATA, 'principios-activos.json'), JSON.stringify(aConservar, null, 1) + '\n');
  writeFileSync(
    join(DATA, 'farmacos-ajuste-renal.json'),
    JSON.stringify({ ...renal, farmacos: renal.farmacos.filter((f) => conservar.has(f.pa)) }, null, 1) + '\n',
  );
  writeFileSync(
    join(DATA, 'principio-activo-grupo-alergenico.json'),
    JSON.stringify(
      miembrosGrupo.filter((m) => conservar.has(m.principioActivoNombre)),
      null,
      1,
    ) + '\n',
  );
  console.log('\nJSON fuente reescritos: principios-activos.json, farmacos-ajuste-renal.json, principio-activo-grupo-alergenico.json');

  const restante = await prisma.principioActivo.count();
  console.log(`\nCatálogo final: ${restante} principios activos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
