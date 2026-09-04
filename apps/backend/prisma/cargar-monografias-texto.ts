/**
 * Carga el TEXTO de las monografías, para la pantalla que se lee.
 *
 *   tsx prisma/cargar-monografias-texto.ts            → simulacro
 *   tsx prisma/cargar-monografias-texto.ts --aplicar  → escribe
 *
 * Hermano de `cargar-monografias.ts`, y lo contrario de él: aquél guarda las
 * FILAS que salen de leer la monografía —las que cruza el motor—, éste guarda
 * la PROSA, que no se cruza con nada y sólo se muestra.
 *
 * Dos reglas:
 *   1. Simulacro por defecto.
 *   2. Idempotente: es un upsert por principio activo, así que correrlo dos
 *      veces deja la segunda igual. La monografía no tiene revisión
 *      farmacéutica —no es una regla, es el texto de la fuente— así que no
 *      hay estado que respetar.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');
const MARCA = 'MONOGRAFIA';

interface MonografiaDeEntrada {
  nombre: string;
  descripcion?: string;
  usos?: string;
  posologia?: string;
  precauciones?: string;
  contraindicaciones?: string;
  reaccionesAdversas?: string;
  interacciones?: string;
  embarazo?: string;
  lactancia?: string;
}

async function main() {
  const ruta = join(__dirname, 'datos', 'monografias-texto.json');
  const { farmacos } = JSON.parse(readFileSync(ruta, 'utf8')) as {
    farmacos: MonografiaDeEntrada[];
  };

  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} · ${farmacos.length} monografías\n`);

  let escritas = 0;
  let actualizadas = 0;
  const noEncontrados: string[] = [];
  const secciones = new Map<string, number>();

  for (const f of farmacos) {
    const pa = await prisma.principioActivo.findUnique({
      where: { nombre: f.nombre },
      select: { id: true },
    });
    if (!pa) {
      noEncontrados.push(f.nombre);
      continue;
    }

    const { nombre: _nombre, ...campos } = f;
    for (const [clave, valor] of Object.entries(campos)) {
      if (valor) secciones.set(clave, (secciones.get(clave) ?? 0) + 1);
    }

    const previa = await prisma.monografiaFarmaco.findUnique({
      where: { principioActivoId: pa.id },
      select: { id: true },
    });
    if (previa) actualizadas++;
    else escritas++;

    if (APLICAR) {
      await prisma.monografiaFarmaco.upsert({
        where: { principioActivoId: pa.id },
        create: { principioActivoId: pa.id, fuente: MARCA, ...campos },
        update: { fuente: MARCA, ...campos },
      });
    }
  }

  console.log('monografías nuevas       ' + escritas);
  console.log('monografías actualizadas ' + actualizadas);
  console.log('\nsecciones con texto:');
  for (const [clave, n] of [...secciones.entries()].sort((a, b) => b[1] - a[1])) {
    console.log('  ' + clave.padEnd(20) + n);
  }
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
