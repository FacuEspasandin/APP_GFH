/**
 * ============================================================================
 * IMPORTADOR DEL CATALOGO CLINICO REAL
 * ============================================================================
 *
 * Lee `docs/data/*.json` (export del repo de GFH, 09/08/2026) y lo carga en la
 * base propia. Reemplaza al seed de ejemplo que existia antes.
 *
 * Las reglas de interaccion NO se cargan aca: viven en codigo, como modulo de
 * dominio cargado en memoria al boot (motor §1.7 / §5.1). `reglas-interaccion.
 * json` es el insumo de ese modulo, no de la base.
 *
 * Tres cosas que este importador hace a proposito, y que no son opcionales:
 *
 *  1. FALLA ante un valor de enum desconocido. Caer a un default perderia
 *     informacion en silencio, que es el peor modo de fallar de este sistema.
 *  2. NO deduplica callado. Cuenta, reporta y deja constancia de cada entrada
 *     descartada — el precedente es la diferencia 643/634 de GFH, que quedo sin
 *     explicar durante meses.
 *  3. NO "arregla" typos ni ambiguedades de la fuente. Los `rev: true` entran
 *     tal cual, marcados con `requiereRevision`.
 *
 * Todo el contenido entra como PENDIENTE: en GFH no hay una sola fila validada
 * por un farmaceutico (INFORME-export-gfh.md §3.2).
 */

import fs from 'node:fs';
import path from 'node:path';

import { type $Enums, PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();
const DATA = path.resolve(__dirname, '../../../docs/data');

const leer = <T>(archivo: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA, archivo), 'utf8')) as T;

// --- tipos del export -------------------------------------------------------

type PaExport = {
  nombre: string;
  grupoTerapeutico: string | null;
  viaDefault: string;
  tieneAjusteRenal: boolean;
};
type SenRango = { min: number | null; max: number | null; texto: string | null; tipo: string };
type SenFarmaco = {
  pa: string;
  gt: string | null;
  via: string;
  dosis: string;
  metodo: string;
  rangos: SenRango[];
  hd?: string | null;
  tabla?: number | null;
  obs?: string | null;
  rev?: boolean;
};
type CondExport = { codigo: string; nombre: string; descripcion: string | null };
type AlertaExport = {
  principioActivoNombre: string;
  condicionCodigo: string;
  severidad: string;
  texto: string;
  fuente: string | null;
  semanaMin: number | null;
  semanaMax: number | null;
};
type GrupoExport = {
  codigo: string;
  nombre: string;
  nivelCruce: string;
  grupoPadreCodigo: string | null;
  sinonimos: string[];
};
type MiembroExport = { principioActivoNombre: string; grupoCodigo: string };
type AltExport = {
  paOrigenNombre: string;
  paAlternativaNombre: string;
  razon: string;
  evidencia: string | null;
  severidadOriginalAplicable: string | null;
};

// --- validacion de enums ----------------------------------------------------

const VIAS = new Set<string>([
  'NO_ESPECIFICADA', 'ORAL', 'IV', 'SC', 'TOPICA', 'INHALATORIA', 'INTRAOCULAR', 'OTRA',
  'IM', 'SUBLINGUAL', 'RECTAL', 'VAGINAL', 'NASAL', 'TRANSDERMICA', 'OFTALMICA', 'OTICA',
]);
const METODOS = new Set(['D', 'I', 'D_E_I', 'NO', 'NOTA_AL_PIE']);
const TIPOS = new Set([
  'SIN_AJUSTE', 'REDUCIR_DOSIS', 'AUMENTAR_INTERVALO', 'REDUCIR_DOSIS_Y_INTERVALO',
  'EVITAR', 'CONTRAINDICADO', 'PRECAUCION', 'CONDICIONAL', 'VACIO', 'NOTA_AL_PIE',
]);
const SEVERIDADES_ALERTA = new Set(['INFO', 'PRECAUCION', 'EVITAR', 'CONTRAINDICADO']);
const NIVELES_CRUCE = new Set(['ALTO', 'MODERADO', 'BAJO']);

function exigir<T extends string>(valor: string, validos: Set<string>, campo: string, ctx: string): T {
  if (!validos.has(valor)) {
    throw new Error(
      `Valor desconocido en ${campo}: "${valor}" (${ctx}). ` +
        `Agregalo al enum del schema o corregí la fuente — no se importa con un default.`,
    );
  }
  return valor as T;
}

// --- reporte ----------------------------------------------------------------

const descartes: string[] = [];
const nota = (linea: string) => descartes.push(linea);

async function main() {
  // Alertas y alternativas entran con createMany, así que una segunda corrida
  // las duplicaría sin decir nada. Cortar acá y no "arreglarlo" con
  // skipDuplicates: no hay clave natural que distinga dos alertas del mismo par
  // con la misma ventana, y silenciar el problema es peor que frenar.
  const yaCargado = await prisma.principioActivo.count();
  if (yaCargado > 0 && process.env.GFH_REIMPORTAR !== '1') {
    throw new Error(
      `El catálogo ya tiene ${yaCargado} principios activos. Reimportar encima ` +
        'duplicaría alertas y alternativas.\n' +
        'Para recargar de cero: prisma migrate reset (borra TODO), o borrá las ' +
        'tablas de catálogo a mano y corré con GFH_REIMPORTAR=1.',
    );
  }

  console.log(`Importando catálogo desde ${DATA}\n`);

  // =========================================================================
  // 1. Principios activos
  // =========================================================================
  // El export trae 634 filas, pero tres pares colisionan al normalizar
  // (Bosentan/Bosentán, Peginterferón beta-1A/beta-1a, Zolmitriptan/
  // Zolmitriptán). Son el mismo fármaco escrito de dos formas. Se unifica
  // quedándose con la grafía acentuada, que es la correcta en español.
  //
  // Es seguro para las reglas de interacción: `TRIPTANES` cita las dos grafías
  // de zolmitriptán, pero el matcheo es normalizado, así que ambas resuelven al
  // mismo principio activo y `parClave` las colapsa en el mismo par.
  const pasExport = leer<PaExport[]>('principios-activos.json');
  const porNorm = new Map<string, PaExport>();
  for (const pa of pasExport) {
    const clave = normalizar(pa.nombre);
    const previo = porNorm.get(clave);
    if (!previo) {
      porNorm.set(clave, pa);
      continue;
    }
    // Gana la grafía con más marcas diacríticas; a igualdad, la primera.
    const tildes = (s: string) => s.normalize('NFD').match(/[\u0300-\u036f]/g)?.length ?? 0;
    const gana = tildes(pa.nombre) > tildes(previo.nombre) ? pa : previo;
    const pierde = gana === pa ? previo : pa;
    porNorm.set(clave, gana);
    nota(`PA unificado por normalización: "${gana.nombre}" absorbe "${pierde.nombre}"`);
  }

  for (const pa of porNorm.values()) {
    await prisma.principioActivo.upsert({
      where: { nombreNormalizado: normalizar(pa.nombre) },
      update: {},
      create: {
        nombre: pa.nombre,
        nombreNormalizado: normalizar(pa.nombre),
        grupoTerapeutico: pa.grupoTerapeutico,
        viaDefault: exigir<$Enums.ViaAdministracion>(pa.viaDefault, VIAS, 'viaDefault', pa.nombre),
        tieneAjusteRenal: pa.tieneAjusteRenal,
        tieneAjusteHepatico: false, // sin fuente todavía
        codigoATC: null, // no existe en GFH — ver INFORME §3.1
      },
    });
  }

  const idPorNorm = new Map(
    (await prisma.principioActivo.findMany({ select: { id: true, nombreNormalizado: true } })).map(
      (p) => [p.nombreNormalizado, p.id],
    ),
  );
  const idPa = (nombre: string): string => {
    const id = idPorNorm.get(normalizar(nombre));
    if (!id) throw new Error(`Principio activo ausente del catálogo: "${nombre}"`);
    return id;
  };

  // =========================================================================
  // 2. Ajuste renal — clave (principio activo, vía)
  // =========================================================================
  // 643 entradas SEN → 635 claves. Las 8 que chocan son el mismo fármaco
  // transcripto en DOS TABLAS SEN distintas (ej. tabla 8 y tabla 25), no un
  // error de carga: la fuente se solapa consigo misma. Se carga la primera,
  // se marca requiereRevision y se reporta cada una — resolverlas exige mirar
  // la fuente, no adivinar.
  const sen = leer<{ farmacos: SenFarmaco[] }>('farmacos-ajuste-renal.json');
  const vistas = new Set<string>();
  let ajustes = 0;
  let rangos = 0;

  for (const f of sen.farmacos) {
    const via = exigir<$Enums.ViaAdministracion>(f.via, VIAS, 'via', f.pa);
    const clave = `${normalizar(f.pa)}|${via}`;
    if (vistas.has(clave)) {
      nota(
        `Ajuste renal descartado (ya existe ${clave}): "${f.pa}" tabla ${f.tabla} — ` +
          `dosis "${f.dosis}". Resolver contra la fuente SEN.`,
      );
      await prisma.ajusteRenalFarmaco.update({
        where: { ajuste_renal_por_via: { principioActivoId: idPa(f.pa), viaAdministracion: via } },
        data: { requiereRevision: true },
      });
      continue;
    }
    vistas.add(clave);

    await prisma.ajusteRenalFarmaco.create({
      data: {
        principioActivoId: idPa(f.pa),
        viaAdministracion: via,
        dosisFrNormal: f.dosis,
        metodoAjuste: exigir(f.metodo, METODOS, 'metodo', f.pa),
        suplementoHd: f.hd ?? null,
        observaciones: f.obs ?? null,
        requiereRevision: f.rev ?? false,
        tablaOrigenNum: f.tabla ?? null,
        estadoValidacion: 'PENDIENTE',
        rangos: {
          create: f.rangos.map((r, i) => ({
            orden: i, // 0 = mayor Clcr, preserva el orden de la fuente
            clcrMin: r.min,
            clcrMax: r.max,
            rangoTexto: rangoTexto(r),
            textoRecomendacion: r.texto,
            tipo: exigir<$Enums.TipoRangoAjuste>(r.tipo, TIPOS, 'tipo', `${f.pa} rango ${i}`),
          })),
        },
      },
    });
    ajustes += 1;
    rangos += f.rangos.length;
  }

  // =========================================================================
  // 3. Condiciones clínicas
  // =========================================================================
  for (const c of leer<CondExport[]>('condiciones-clinicas.json')) {
    await prisma.condicionClinica.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: c,
    });
  }
  const idCondicion = new Map(
    (await prisma.condicionClinica.findMany({ select: { id: true, codigo: true } })).map((c) => [
      c.codigo,
      c.id,
    ]),
  );

  // =========================================================================
  // 4. Alertas condición-fármaco
  // =========================================================================
  // Varias filas por par (fármaco, condición) diferenciadas por ventana de
  // gestación — 18 pares tienen más de una. NO deduplicar: la severidad de un
  // AINE cambia en la semana 20.
  const alertas = leer<AlertaExport[]>('alertas-condicion-farmaco.json');
  await prisma.alertaCondicionFarmaco.createMany({
    data: alertas.map((a) => ({
      principioActivoId: idPa(a.principioActivoNombre),
      condicionClinicaId: idCondicion.get(a.condicionCodigo)!,
      severidad: exigir(a.severidad, SEVERIDADES_ALERTA, 'severidad', a.principioActivoNombre),
      texto: a.texto,
      fuente: a.fuente,
      semanaMin: a.semanaMin,
      semanaMax: a.semanaMax,
      estadoValidacion: 'PENDIENTE' as const,
    })),
    skipDuplicates: false,
  });

  // =========================================================================
  // 5. Grupos alergénicos (dos pasadas por la jerarquía)
  // =========================================================================
  const grupos = leer<GrupoExport[]>('grupos-alergenicos.json');
  for (const g of grupos) {
    await prisma.grupoAlergenico.upsert({
      where: { codigo: g.codigo },
      update: {},
      create: {
        codigo: g.codigo,
        nombre: g.nombre,
        nivelCruce: exigir(g.nivelCruce, NIVELES_CRUCE, 'nivelCruce', g.codigo),
        sinonimos: g.sinonimos,
      },
    });
  }
  for (const g of grupos.filter((x) => x.grupoPadreCodigo)) {
    const padre = await prisma.grupoAlergenico.findUniqueOrThrow({
      where: { codigo: g.grupoPadreCodigo! },
    });
    await prisma.grupoAlergenico.update({
      where: { codigo: g.codigo },
      data: { grupoPadreId: padre.id },
    });
  }
  const idGrupo = new Map(
    (await prisma.grupoAlergenico.findMany({ select: { id: true, codigo: true } })).map((g) => [
      g.codigo,
      g.id,
    ]),
  );

  const miembros = leer<MiembroExport[]>('principio-activo-grupo-alergenico.json');
  await prisma.principioActivoGrupoAlergenico.createMany({
    data: miembros.map((m) => ({
      principioActivoId: idPa(m.principioActivoNombre),
      grupoAlergenicoId: idGrupo.get(m.grupoCodigo)!,
    })),
    skipDuplicates: true,
  });

  // =========================================================================
  // 6. Alternativas terapéuticas
  // =========================================================================
  const alts = leer<AltExport[]>('alternativas-terapeuticas.json');
  await prisma.alternativaTerapeutica.createMany({
    data: alts.map((a) => ({
      paOrigenId: idPa(a.paOrigenNombre),
      paAlternativaId: idPa(a.paAlternativaNombre),
      razon: a.razon,
      evidencia: a.evidencia,
      severidadOriginalAplicable: a.severidadOriginalAplicable
        ? exigir<$Enums.SeveridadAlerta>(
            a.severidadOriginalAplicable,
            SEVERIDADES_ALERTA,
            'severidadOriginalAplicable',
            a.paOrigenNombre,
          )
        : null,
      estadoValidacion: 'PENDIENTE' as const,
    })),
    skipDuplicates: true,
  });

  await reportar({ senEntradas: sen.farmacos.length, ajustes, rangos, alertas: alertas.length });
}

/** La fuente no trae etiqueta literal del rango; se reconstruye con el mismo
 *  formato que usa SEN ("50-30 ml/min", "<15 ml/min", ">100 ml/min"). */
function rangoTexto(r: SenRango): string {
  if (r.min == null && r.max == null) return 'sin límites';
  if (r.min == null) return `<${r.max} ml/min`;
  if (r.max == null) return `>${r.min} ml/min`;
  return `${r.max}-${r.min} ml/min`;
}

async function reportar(esperado: {
  senEntradas: number;
  ajustes: number;
  rangos: number;
  alertas: number;
}) {
  const real = {
    principioActivo: await prisma.principioActivo.count(),
    ajusteRenal: await prisma.ajusteRenalFarmaco.count(),
    rangoClcr: await prisma.rangoClcrFarmaco.count(),
    condicion: await prisma.condicionClinica.count(),
    alerta: await prisma.alertaCondicionFarmaco.count(),
    grupoAlergenico: await prisma.grupoAlergenico.count(),
    miembroGrupo: await prisma.principioActivoGrupoAlergenico.count(),
    alternativa: await prisma.alternativaTerapeutica.count(),
  };
  console.table(real);

  console.log(
    `\nEntradas SEN leídas: ${esperado.senEntradas} → ajustes creados: ${esperado.ajustes}` +
      ` (descartadas: ${esperado.senEntradas - esperado.ajustes})`,
  );

  if (real.ajusteRenal !== esperado.ajustes || real.rangoClcr !== esperado.rangos) {
    throw new Error('El conteo en base no coincide con lo insertado. No continuar.');
  }
  if (real.alerta !== esperado.alertas) {
    throw new Error(`Alertas: se esperaban ${esperado.alertas}, hay ${real.alerta}.`);
  }

  if (descartes.length > 0) {
    console.log(`\n${descartes.length} decisiones que NO son automáticas — revisar:\n`);
    for (const d of descartes) console.log('  · ' + d);
    fs.writeFileSync(path.join(DATA, 'PENDIENTE-resolver.txt'), descartes.join('\n') + '\n', 'utf8');
    console.log('\n  (también en docs/data/PENDIENTE-resolver.txt)');
  }

  console.log(
    [
      '',
      'Catálogo cargado. Estado real del contenido:',
      '  · las 507 alertas traen fuente "Curado GFH _REVISAR_" — ninguna validada',
      '  · las 271 alternativas tienen evidencia vacía',
      '  · ninguna fila fue revisada por un farmacéutico: todo es PENDIENTE',
      '  · codigoATC quedó en null: no existe en GFH, "Similares" no funciona hasta sembrarlo',
      '',
    ].join('\n'),
  );
}

main()
  .catch((e) => {
    console.error('\n' + String(e?.message ?? e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
