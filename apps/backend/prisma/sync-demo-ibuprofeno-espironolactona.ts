/**
 * Sincroniza con la base DOS correcciones puntuales del catálogo, sin pasar por
 * el seed (que hace deleteMany de TODAS las alertas) ni por importar-catalogo:
 *
 *   1. Ibuprofeno en embarazo antes de la semana 28: agrega la fila EVITAR con
 *      semanaMax 27 (igual que Naproxeno). Sin ella, con 12 o 24 semanas no
 *      alerta y la ausencia se lee como seguridad (regla 5).
 *   2. Errata «Espirolactona» → «Espironolactona»: UPDATE de `nombre` y
 *      `nombreNormalizado` del PrincipioActivo, y de lo que depende de ese nombre
 *      en la base (el producto genérico y las curaciones de interacción).
 *
 *   tsx prisma/sync-demo-ibuprofeno-espironolactona.ts            → simulacro
 *   tsx prisma/sync-demo-ibuprofeno-espironolactona.ts --aplicar  → escribe
 *
 * Garantías:
 *   - Simulacro por defecto: sólo LEE la base. No escribe ni siquiera el backup.
 *   - Con --aplicar, antes de escribir deja en `prisma/backups/` un JSON con las
 *     filas que va a tocar (estado previo).
 *   - Sólo UPDATE y un CREATE. No borra nada. Todo en una transacción.
 *   - Idempotente: la segunda corrida no encuentra nada que hacer.
 *   - No toca pacientes, prescripciones, alergias ni otras alertas.
 *
 * ORDEN DE DESPLIEGUE (importante): el backend carga `reglas-interaccion.json`
 * en memoria al arrancar, y las reglas se enlazan al catálogo POR NOMBRE. Si la
 * base dice «Espironolactona» y el backend desplegado todavía trae
 * «Espirolactona» (o al revés), las interacciones de ese fármaco desaparecen en
 * silencio. Por eso: desplegar el backend con los JSON renombrados y correr
 * `--aplicar` en la misma ventana, y reiniciar/redeplegar el backend si ya
 * estaba arriba con el JSON viejo.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient, type Prisma } from '@prisma/client';
import { normalizar, parClave } from '@gfh/shared-types';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

const DATA = join(__dirname, '..', '..', '..', 'docs', 'data');
const BACKUPS = join(__dirname, 'backups');

const NOMBRE_VIEJO = 'Espirolactona';
const NOMBRE_NUEVO = 'Espironolactona';

interface AlertaFuente {
  principioActivoNombre: string;
  condicionCodigo: string;
  severidad: 'INFO' | 'PRECAUCION' | 'EVITAR' | 'CONTRAINDICADO';
  texto: string;
  fuente: string | null;
  semanaMin: number | null;
  semanaMax: number | null;
}

/** La fila sale del JSON de catálogo (la misma que lee el seed), no se
 *  duplica acá: así el script y el catálogo no pueden divergir. */
function filaIbuprofenoDeLaFuente(): AlertaFuente {
  const todas = JSON.parse(
    readFileSync(join(DATA, 'alertas-condicion-farmaco.json'), 'utf8'),
  ) as AlertaFuente[];
  const fila = todas.find(
    (a) =>
      a.principioActivoNombre === 'Ibuprofeno' &&
      a.condicionCodigo === 'EMBARAZO' &&
      a.semanaMin === null &&
      a.semanaMax === 27,
  );
  if (!fila) {
    throw new Error(
      'docs/data/alertas-condicion-farmaco.json no trae la fila Ibuprofeno/EMBARAZO con semanaMax 27. ' +
        'Cargala en el catálogo primero.',
    );
  }
  return fila;
}

const linea = (t = '') => console.log(t);

async function main() {
  linea(`\n${APLICAR ? 'APLICAR' : 'SIMULACRO'} · sync ibuprofeno embarazo + errata espironolactona`);
  linea('─'.repeat(64));

  const fuente = filaIbuprofenoDeLaFuente();

  // ---------------------------------------------------------------- lecturas
  const ibuprofeno = await prisma.principioActivo.findUnique({
    where: { nombreNormalizado: normalizar('Ibuprofeno') },
    select: { id: true, nombre: true },
  });
  const embarazo = await prisma.condicionClinica.findUnique({
    where: { codigo: 'EMBARAZO' },
    select: { id: true, codigo: true },
  });
  if (!ibuprofeno) throw new Error('No existe el principio activo Ibuprofeno en la base.');
  if (!embarazo) throw new Error('No existe la condición EMBARAZO en la base.');

  const alertasIbuEmbarazo = await prisma.alertaCondicionFarmaco.findMany({
    where: { principioActivoId: ibuprofeno.id, condicionClinicaId: embarazo.id },
    orderBy: { semanaMin: 'asc' },
  });
  const alertaMismaVentana = alertasIbuEmbarazo.find(
    (a) => a.semanaMin === null && a.semanaMax === 27,
  );

  const paViejo = await prisma.principioActivo.findUnique({
    where: { nombreNormalizado: normalizar(NOMBRE_VIEJO) },
  });
  const paNuevo = await prisma.principioActivo.findUnique({
    where: { nombreNormalizado: normalizar(NOMBRE_NUEVO) },
  });

  // Genéricos (un producto sintético por PA, con el nombre del PA) que siguen
  // llamándose con la grafía vieja. Las MARCAS no se tocan: no son el nombre del PA.
  const genericosViejos = paViejo
    ? await prisma.productoComercial.findMany({
        where: {
          esGenerico: true,
          principiosActivos: { some: { principioActivoId: paViejo.id } },
          OR: [{ nombreComercial: NOMBRE_VIEJO }, { nombreNormalizado: normalizar(NOMBRE_VIEJO) }],
        },
      })
    : [];

  // Curaciones de interacción: la clave embebe los nombres normalizados.
  const claveViejaNorm = normalizar(NOMBRE_VIEJO);
  const curadasConNombreViejo = (
    await prisma.interaccionCurada.findMany({ where: { parClave: { contains: claveViejaNorm } } })
  ).filter((c) => c.parClave.split('|').includes(claveViejaNorm));

  // ------------------------------------------------------------------ plan
  type Accion = { que: string; detalle: string; ejecutar: () => Prisma.PrismaPromise<unknown> };
  const acciones: Accion[] = [];
  const avisos: string[] = [];
  let abortar: string | null = null;

  // (a) alerta de Ibuprofeno
  if (!alertaMismaVentana) {
    acciones.push({
      que: 'CREATE alerta_condicion_farmaco',
      detalle: `Ibuprofeno / EMBARAZO / ${fuente.severidad} / semanas ${fuente.semanaMin ?? '-'}..${fuente.semanaMax} (estadoValidacion PENDIENTE)`,
      ejecutar: () =>
        prisma.alertaCondicionFarmaco.create({
          data: {
            principioActivoId: ibuprofeno.id,
            condicionClinicaId: embarazo.id,
            severidad: fuente.severidad,
            texto: fuente.texto,
            fuente: fuente.fuente,
            semanaMin: fuente.semanaMin,
            semanaMax: fuente.semanaMax,
            estadoValidacion: 'PENDIENTE',
          },
        }),
    });
  } else if (
    alertaMismaVentana.severidad !== fuente.severidad ||
    alertaMismaVentana.texto !== fuente.texto ||
    alertaMismaVentana.fuente !== fuente.fuente
  ) {
    acciones.push({
      que: 'UPDATE alerta_condicion_farmaco',
      detalle: `fila ${alertaMismaVentana.id}: severidad/texto/fuente alineados con el catálogo`,
      ejecutar: () =>
        prisma.alertaCondicionFarmaco.update({
          where: { id: alertaMismaVentana.id },
          data: { severidad: fuente.severidad, texto: fuente.texto, fuente: fuente.fuente },
        }),
    });
  }

  // (b) renombrar el PA
  if (paViejo && paNuevo) {
    abortar =
      `Existen los dos principios activos («${paViejo.nombre}» y «${paNuevo.nombre}»). ` +
      'Renombrar chocaría contra el @unique: hay que fusionarlos a mano. No se hace nada.';
  } else if (paViejo) {
    acciones.push({
      que: 'UPDATE principio_activo',
      detalle: `id ${paViejo.id}: nombre «${paViejo.nombre}» → «${NOMBRE_NUEVO}», nombreNormalizado «${paViejo.nombreNormalizado}» → «${normalizar(NOMBRE_NUEVO)}»`,
      ejecutar: () =>
        prisma.principioActivo.update({
          where: { id: paViejo.id },
          data: { nombre: NOMBRE_NUEVO, nombreNormalizado: normalizar(NOMBRE_NUEVO) },
        }),
    });
  } else if (!paNuevo) {
    avisos.push(`No existe ni «${NOMBRE_VIEJO}» ni «${NOMBRE_NUEVO}» en la base: nada que renombrar.`);
  }

  // (c) lo que depende del nombre
  for (const g of genericosViejos) {
    acciones.push({
      que: 'UPDATE producto_comercial (genérico)',
      detalle: `id ${g.id}: nombreComercial «${g.nombreComercial}» → «${NOMBRE_NUEVO}», nombreNormalizado → «${normalizar(NOMBRE_NUEVO)}»`,
      ejecutar: () =>
        prisma.productoComercial.update({
          where: { id: g.id },
          data: { nombreComercial: NOMBRE_NUEVO, nombreNormalizado: normalizar(NOMBRE_NUEVO) },
        }),
    });
  }

  const clavesExistentes = new Set((await prisma.interaccionCurada.findMany({ select: { parClave: true } })).map((c) => c.parClave));
  for (const c of curadasConNombreViejo) {
    const otro = c.parClave.split('|').find((x) => x !== claveViejaNorm) ?? claveViejaNorm;
    const nueva = parClave(NOMBRE_NUEVO, otro);
    if (clavesExistentes.has(nueva)) {
      abortar = `La curación «${c.parClave}» pasaría a «${nueva}», que ya existe. No se hace nada.`;
      continue;
    }
    acciones.push({
      que: 'UPDATE interaccion_curada',
      detalle: `id ${c.id}: parClave «${c.parClave}» → «${nueva}»`,
      ejecutar: () => prisma.interaccionCurada.update({ where: { id: c.id }, data: { parClave: nueva } }),
    });
  }

  // ---------------------------------------------------------------- informe
  linea('\nEstado actual de la base');
  linea(`  Ibuprofeno / EMBARAZO · alertas hoy: ${alertasIbuEmbarazo.length}`);
  for (const a of alertasIbuEmbarazo) {
    linea(`    · ${a.severidad.padEnd(15)} semanas ${a.semanaMin ?? '-'}..${a.semanaMax ?? '-'}`);
  }
  linea(`  PA «${NOMBRE_VIEJO}»: ${paViejo ? `sí (id ${paViejo.id})` : 'no'}`);
  linea(`  PA «${NOMBRE_NUEVO}»: ${paNuevo ? `sí (id ${paNuevo.id})` : 'no'}`);
  linea(`  genéricos con grafía vieja: ${genericosViejos.length}`);
  linea(`  curaciones de interacción con grafía vieja: ${curadasConNombreViejo.length}`);

  linea('\nQué haría');
  if (acciones.length === 0) linea('  Nada: la base ya está al día (idempotente).');
  for (const a of acciones) linea(`  · ${a.que}\n      ${a.detalle}`);
  for (const v of avisos) linea(`  ! ${v}`);
  if (abortar) {
    linea(`\n  ABORTA: ${abortar}`);
    process.exitCode = 1;
    return;
  }

  if (!APLICAR) {
    linea('\nNo se escribió nada (ni la base ni el backup). Volvé a correrlo con --aplicar.');
    return;
  }
  if (acciones.length === 0) return;

  // ----------------------------------------------------------------- backup
  mkdirSync(BACKUPS, { recursive: true });
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const archivo = join(BACKUPS, `sync-demo-ibuprofeno-espironolactona-${marca}.json`);
  writeFileSync(
    archivo,
    JSON.stringify(
      {
        _lea_esto:
          'Estado PREVIO de las filas que tocó sync-demo-ibuprofeno-espironolactona.ts. ' +
          'La alerta de Ibuprofeno se agrega (para deshacer: borrar esa fila). ' +
          'Para deshacer el renombre: volver nombre/nombreNormalizado a los valores de acá.',
        fecha: new Date().toISOString(),
        alertasIbuprofenoEmbarazo: alertasIbuEmbarazo,
        principioActivoViejo: paViejo,
        genericos: genericosViejos,
        interaccionesCuradas: curadasConNombreViejo,
        alertaQueSeAgrega: alertaMismaVentana ? null : fuente,
      },
      null,
      2,
    ),
    'utf8',
  );
  linea(`\nBackup escrito: ${archivo}`);

  // ------------------------------------------------------------------ aplicar
  await prisma.$transaction(acciones.map((a) => a.ejecutar()));
  linea(`Aplicado: ${acciones.length} cambio(s) en una transacción.`);

  // Verificación: re-leer.
  const despues = await prisma.alertaCondicionFarmaco.count({
    where: {
      principioActivoId: ibuprofeno.id,
      condicionClinicaId: embarazo.id,
      semanaMin: null,
      semanaMax: 27,
    },
  });
  const paOk = await prisma.principioActivo.findUnique({
    where: { nombreNormalizado: normalizar(NOMBRE_NUEVO) },
    select: { nombre: true },
  });
  linea(`Verificación · alerta Ibuprofeno ventana ..27: ${despues} fila(s) · PA «${paOk?.nombre ?? '(no existe)'}»`);
}

void main()
  .catch((e: unknown) => {
    console.error('\nFalló:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
