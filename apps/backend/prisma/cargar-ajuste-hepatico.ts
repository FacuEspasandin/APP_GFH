/**
 * Carga la tabla de ajuste hepático por clase Child-Pugh, por fármaco.
 *
 *   tsx prisma/cargar-ajuste-hepatico.ts            → simulacro
 *   tsx prisma/cargar-ajuste-hepatico.ts --aplicar   → escribe
 *
 * Hermano de `cargar-monografias-texto.ts`, mismo patrón:
 *   1. Simulacro por defecto.
 *   2. Idempotente: upsert por (principioActivoId, vía) y por (ajuste, clase),
 *      así que correrlo dos veces con la misma fuente deja la segunda igual.
 *
 * A diferencia del renal (`prisma/seed.ts`, sección 2, tablas SEN publicadas),
 * esta fuente NO es un catálogo publicado y numerado: es texto de fichas
 * técnicas reales (`prisma/datos/monografias-texto.json`) categorizado por
 * clase a mano — por eso vive aparte del seed general y no adentro de él, y
 * por eso cada fila trae `rev: true` en el JSON de origen.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type $Enums, PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

const VIAS: $Enums.ViaAdministracion[] = [
  'NO_ESPECIFICADA',
  'ORAL',
  'IV',
  'SC',
  'TOPICA',
  'INHALATORIA',
  'INTRAOCULAR',
  'OTRA',
  'IM',
  'SUBLINGUAL',
  'RECTAL',
  'VAGINAL',
];
const METODOS: $Enums.MetodoAjuste[] = ['D', 'I', 'D_E_I', 'NO', 'NOTA_AL_PIE'];
const TIPOS: $Enums.TipoRangoAjuste[] = [
  'SIN_AJUSTE',
  'REDUCIR_DOSIS',
  'AUMENTAR_INTERVALO',
  'REDUCIR_DOSIS_Y_INTERVALO',
  'EVITAR',
  'CONTRAINDICADO',
  'PRECAUCION',
  'CONDICIONAL',
  'VACIO',
  'NOTA_AL_PIE',
];
const CLASES: $Enums.ChildPughClase[] = ['A', 'B', 'C'];

function exigir<T extends string>(valor: string, permitidos: T[], campo: string, contexto: string): T {
  if (!permitidos.includes(valor as T)) {
    throw new Error(`Valor desconocido en "${campo}" (${contexto}): "${valor}". Permitidos: ${permitidos.join(', ')}`);
  }
  return valor as T;
}

interface RangoDeEntrada {
  clase: string;
  tipo: string;
  texto: string | null;
}
interface FarmacoDeEntrada {
  pa: string;
  via: string;
  dosisFuncionNormal: string;
  metodo: string;
  rangos: RangoDeEntrada[];
  obs?: string | null;
  rev?: boolean;
}

async function main() {
  const ruta = join(__dirname, '..', '..', '..', 'docs', 'data', 'farmacos-ajuste-hepatico.json');
  const { farmacos } = JSON.parse(readFileSync(ruta, 'utf8')) as { farmacos: FarmacoDeEntrada[] };

  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} · ${farmacos.length} fármacos\n`);

  let nuevos = 0;
  let actualizados = 0;
  let rangos = 0;
  const noEncontrados: string[] = [];

  for (const f of farmacos) {
    const pa = await prisma.principioActivo.findUnique({
      where: { nombreNormalizado: normalizar(f.pa) },
      select: { id: true, tieneAjusteHepatico: true },
    });
    if (!pa) {
      noEncontrados.push(f.pa);
      continue;
    }

    const via = exigir<$Enums.ViaAdministracion>(f.via, VIAS, 'via', f.pa);
    const existente = await prisma.ajusteHepaticoFarmaco.findUnique({
      where: { ajuste_hepatico_por_via: { principioActivoId: pa.id, viaAdministracion: via } },
      select: { id: true },
    });
    if (existente) actualizados++;
    else nuevos++;
    rangos += f.rangos.length;

    if (!APLICAR) continue;

    const metodoAjuste = exigir<$Enums.MetodoAjuste>(f.metodo, METODOS, 'metodo', f.pa);
    const ajuste = await prisma.ajusteHepaticoFarmaco.upsert({
      where: { ajuste_hepatico_por_via: { principioActivoId: pa.id, viaAdministracion: via } },
      create: {
        principioActivoId: pa.id,
        viaAdministracion: via,
        dosisFuncionNormal: f.dosisFuncionNormal,
        metodoAjuste,
        observaciones: f.obs ?? null,
        requiereRevision: f.rev ?? false,
        fuenteOrigen: 'Ficha técnica transcripta, categorizada por clase Child-Pugh',
        estadoValidacion: 'PENDIENTE',
      },
      update: {
        dosisFuncionNormal: f.dosisFuncionNormal,
        metodoAjuste,
        observaciones: f.obs ?? null,
        requiereRevision: f.rev ?? false,
      },
      select: { id: true },
    });

    for (const r of f.rangos) {
      const clase = exigir<$Enums.ChildPughClase>(r.clase, CLASES, 'clase', `${f.pa} rango`);
      const tipo = exigir<$Enums.TipoRangoAjuste>(r.tipo, TIPOS, 'tipo', `${f.pa} clase ${clase}`);
      await prisma.rangoChildPughFarmaco.upsert({
        where: { ajusteHepaticoFarmacoId_clase: { ajusteHepaticoFarmacoId: ajuste.id, clase } },
        create: { ajusteHepaticoFarmacoId: ajuste.id, clase, tipo, textoRecomendacion: r.texto },
        update: { tipo, textoRecomendacion: r.texto },
      });
    }

    if (!pa.tieneAjusteHepatico) {
      await prisma.principioActivo.update({
        where: { id: pa.id },
        data: { tieneAjusteHepatico: true },
      });
    }
  }

  console.log('fármacos nuevos       ' + nuevos);
  console.log('fármacos actualizados ' + actualizados);
  console.log('filas de rango        ' + rangos);
  if (noEncontrados.length) {
    console.log('\nno están en el catálogo: ' + noEncontrados.join(', '));
  }
  if (!APLICAR) console.log('\nNada se escribió. Volvé a correr con --aplicar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
