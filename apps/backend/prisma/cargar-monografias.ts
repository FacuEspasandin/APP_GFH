/**
 * Carga en el catálogo los datos derivados de las fichas del proveedor.
 *
 *   tsx prisma/cargar-monografias.ts            → simulacro
 *   tsx prisma/cargar-monografias.ts --aplicar  → escribe
 *
 * Lo que entra es `prisma/datos/monografias-muestra.json`. NO es el texto de
 * las monografías: son las filas que salen de leerlas. La prosa no se guarda
 * en ningún lado.
 *
 * Cuatro reglas, las mismas que sigue el importador de catálogo:
 *
 *   1. **Simulacro por defecto.** Hay que pedir `--aplicar` a propósito.
 *   2. **No pisa lo aprobado.** Una fila en APROBADO no la toca nadie más que
 *      una persona. Si existe, se saltea y se avisa.
 *   3. **Idempotente.** Correrlo dos veces deja la segunda en cero cambios.
 *      Las alertas se reconocen por `fuente = 'MONOGRAFIA'`; el ajuste renal,
 *      por `fuenteDato = MONOGRAFIA`.
 *   4. **Lo que no mapea se avisa, no se fuerza.** Un código de condición que
 *      no está entre los 27 no genera fila: sale por consola y se cuenta.
 *
 * El ajuste renal REEMPLAZA al de SEN para ese fármaco, porque el esquema
 * permite una sola tabla por (principio activo, vía) y la monografía trae
 * umbrales por fármaco en vez de las tres bandas fijas. Sólo se reemplaza
 * donde la ficha trae números o afirma que no hace falta ajuste; los demás
 * fármacos conservan SEN sin que este script los toque.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PrismaClient,
  type MetodoAjuste,
  type SeveridadAlerta,
  type TipoRangoAjuste,
} from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

// --- el formato de entrada ---------------------------------------------------

interface AlertaDeEntrada {
  codigo: string;
  severidad: SeveridadAlerta;
  texto: string;
  semanaMin?: number;
  semanaMax?: number;
}

interface RangoDeEntrada {
  clcrMin: number | null;
  clcrMax: number | null;
  rangoTexto: string;
  tipo: TipoRangoAjuste;
  textoRecomendacion: string | null;
}

interface RenalDeEntrada {
  dosisFrNormal: string;
  /** `true` cuando la ficha AFIRMA que no hace falta ajustar. */
  sinAjuste?: boolean;
  texto?: string;
  metodoAjuste?: MetodoAjuste;
  rangos?: RangoDeEntrada[];
}

interface FarmacoDeEntrada {
  nombre: string;
  codigoATC?: string;
  embarazo?: Omit<AlertaDeEntrada, 'codigo'>;
  lactancia?: Omit<AlertaDeEntrada, 'codigo'>;
  condiciones?: AlertaDeEntrada[];
  renal?: RenalDeEntrada;
}

const MARCA = 'MONOGRAFIA';

// --- el recuento -------------------------------------------------------------

const cuenta = {
  atcNuevos: 0,
  atcYaEstaban: 0,
  alertas: 0,
  alertasReemplazadas: 0,
  renalNuevo: 0,
  renalQuePisaSen: 0,
  sinMapear: [] as string[],
  aprobadasIntactas: 0,
  farmacosNoEncontrados: [] as string[],
};

async function main() {
  const ruta = join(__dirname, 'datos', 'monografias-muestra.json');
  const entrada = JSON.parse(readFileSync(ruta, 'utf8')) as { farmacos: FarmacoDeEntrada[] };

  const condiciones = await prisma.condicionClinica.findMany({ select: { id: true, codigo: true } });
  const porCodigo = new Map(condiciones.map((c) => [c.codigo, c.id]));

  console.log(
    `${APLICAR ? 'APLICANDO' : 'SIMULACRO'} · ${entrada.farmacos.length} fármacos · ` +
      `${condiciones.length} condiciones en el catálogo\n`,
  );

  for (const f of entrada.farmacos) {
    const pa = await prisma.principioActivo.findUnique({
      where: { nombre: f.nombre },
      select: { id: true, nombre: true, codigoATC: true },
    });
    if (!pa) {
      cuenta.farmacosNoEncontrados.push(f.nombre);
      continue;
    }

    // --- codigoATC: sólo se escribe si está vacío -----------------------------
    if (f.codigoATC) {
      if (pa.codigoATC) cuenta.atcYaEstaban++;
      else {
        cuenta.atcNuevos++;
        if (APLICAR) {
          await prisma.principioActivo.update({
            where: { id: pa.id },
            data: { codigoATC: f.codigoATC },
          });
        }
      }
    }

    // --- alertas ---------------------------------------------------------------
    const alertas: AlertaDeEntrada[] = [
      ...(f.embarazo ? [{ ...f.embarazo, codigo: 'EMBARAZO' }] : []),
      ...(f.lactancia ? [{ ...f.lactancia, codigo: 'LACTANCIA' }] : []),
      ...(f.condiciones ?? []),
    ];

    const aEscribir: Array<AlertaDeEntrada & { condicionClinicaId: string }> = [];
    for (const a of alertas) {
      const id = porCodigo.get(a.codigo);
      if (!id) {
        cuenta.sinMapear.push(`${f.nombre} → ${a.codigo}`);
        continue;
      }
      aEscribir.push({ ...a, condicionClinicaId: id });
    }

    // Idempotencia: se borran las de esta misma fuente que NO estén aprobadas.
    const previas = await prisma.alertaCondicionFarmaco.findMany({
      where: { principioActivoId: pa.id, fuente: MARCA },
      select: { id: true, estadoValidacion: true, condicionClinicaId: true },
    });
    const aprobadas = new Set(
      previas.filter((p) => p.estadoValidacion === 'APROBADO').map((p) => p.condicionClinicaId),
    );
    cuenta.aprobadasIntactas += aprobadas.size;

    const finales = aEscribir.filter((a) => !aprobadas.has(a.condicionClinicaId));
    cuenta.alertas += finales.length;
    cuenta.alertasReemplazadas += previas.length - aprobadas.size;

    if (APLICAR) {
      await prisma.alertaCondicionFarmaco.deleteMany({
        where: { principioActivoId: pa.id, fuente: MARCA, estadoValidacion: { not: 'APROBADO' } },
      });
      for (const a of finales) {
        await prisma.alertaCondicionFarmaco.create({
          data: {
            principioActivoId: pa.id,
            condicionClinicaId: a.condicionClinicaId,
            severidad: a.severidad,
            texto: a.texto,
            fuente: MARCA,
            semanaMin: a.semanaMin ?? null,
            semanaMax: a.semanaMax ?? null,
          },
        });
      }
    }

    // --- ajuste renal ----------------------------------------------------------
    if (f.renal) {
      const previo = await prisma.ajusteRenalFarmaco.findUnique({
        where: {
          ajuste_renal_por_via: { principioActivoId: pa.id, viaAdministracion: 'NO_ESPECIFICADA' },
        },
        select: { id: true, fuenteDato: true, estadoValidacion: true },
      });

      if (previo?.estadoValidacion === 'APROBADO') {
        cuenta.aprobadasIntactas++;
      } else {
        if (previo?.fuenteDato === 'SEN') cuenta.renalQuePisaSen++;
        cuenta.renalNuevo++;

        const rangos: RangoDeEntrada[] = f.renal.sinAjuste
          ? [
              {
                clcrMin: null,
                clcrMax: null,
                rangoTexto: 'Cualquier Clcr',
                tipo: 'SIN_AJUSTE',
                textoRecomendacion: '100 %',
              },
            ]
          : (f.renal.rangos ?? []);

        if (APLICAR) {
          if (previo) await prisma.ajusteRenalFarmaco.delete({ where: { id: previo.id } });
          await prisma.ajusteRenalFarmaco.create({
            data: {
              principioActivoId: pa.id,
              viaAdministracion: 'NO_ESPECIFICADA',
              dosisFrNormal: f.renal.dosisFrNormal,
              metodoAjuste: f.renal.sinAjuste ? 'NO' : (f.renal.metodoAjuste ?? 'D'),
              observaciones: f.renal.texto ?? null,
              fuenteDato: 'MONOGRAFIA',
              rangos: {
                create: rangos.map((r, i) => ({
                  orden: i,
                  clcrMin: r.clcrMin,
                  clcrMax: r.clcrMax,
                  rangoTexto: r.rangoTexto,
                  textoRecomendacion: r.textoRecomendacion,
                  tipo: r.tipo,
                })),
              },
            },
          });
          await prisma.principioActivo.update({
            where: { id: pa.id },
            data: { tieneAjusteRenal: true },
          });
        }
      }
    }
  }

  console.log('codigoATC escritos          ' + cuenta.atcNuevos);
  console.log('codigoATC que ya estaban    ' + cuenta.atcYaEstaban);
  console.log('alertas escritas            ' + cuenta.alertas);
  console.log('alertas reemplazadas        ' + cuenta.alertasReemplazadas);
  console.log('tablas renales escritas     ' + cuenta.renalNuevo);
  console.log('  de ellas, pisan una SEN   ' + cuenta.renalQuePisaSen);
  console.log('filas aprobadas intactas    ' + cuenta.aprobadasIntactas);

  if (cuenta.sinMapear.length) {
    console.log('\nno mapeadas (' + cuenta.sinMapear.length + ') — el código no está entre los 27:');
    for (const s of cuenta.sinMapear) console.log('  ' + s);
  }
  if (cuenta.farmacosNoEncontrados.length) {
    console.log('\nfármacos que no existen en el catálogo:');
    for (const s of cuenta.farmacosNoEncontrados) console.log('  ' + s);
  }
  if (!APLICAR) console.log('\nNada se escribió. Volvé a correr con --aplicar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
