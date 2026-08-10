/**
 * Crea un ProductoComercial "genérico" por cada PrincipioActivo.
 *
 * Por qué hace falta: toda la app entra por producto comercial —el Buscador y
 * la carga de tratamiento (regla no negociable 10)— y el catálogo de productos
 * registrados todavía no está. Sin esto, 631 principios activos con sus tablas
 * de ajuste renal, sus alertas y sus 638 pares de interacción quedan
 * inalcanzables desde la app.
 *
 * Qué NO resuelve: el médico busca "Eliquis" y no lo va a encontrar; tiene que
 * buscar "Apixabán". Cuando llegue el catálogo real conviven los dos, y este
 * script no hay que volver a correrlo salvo que se agreguen principios activos.
 *
 * Idempotente: se puede correr las veces que haga falta.
 */

import { PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();

async function main() {
  const principios = await prisma.principioActivo.findMany({
    select: { id: true, nombre: true, viaDefault: true },
    orderBy: { nombre: 'asc' },
  });

  // Los genéricos ya creados, indexados por el PA al que apuntan. Una consulta,
  // no una por fármaco.
  const yaCreados = await prisma.productoComercial.findMany({
    where: { esGenerico: true },
    select: { id: true, principiosActivos: { select: { principioActivoId: true } } },
  });
  const conGenerico = new Set(
    yaCreados.flatMap((p) => p.principiosActivos.map((x) => x.principioActivoId)),
  );

  const faltantes = principios.filter((pa) => !conGenerico.has(pa.id));

  console.log(`principios activos : ${principios.length}`);
  console.log(`ya tenían genérico : ${conGenerico.size}`);
  console.log(`a crear            : ${faltantes.length}\n`);

  if (faltantes.length === 0) {
    console.log('Nada que hacer.');
    return;
  }

  // En lotes: 631 creates de a uno son 631 viajes a la base.
  const TAMANIO_LOTE = 50;
  let creados = 0;

  for (let i = 0; i < faltantes.length; i += TAMANIO_LOTE) {
    const lote = faltantes.slice(i, i + TAMANIO_LOTE);

    await prisma.$transaction(
      lote.map((pa) =>
        prisma.productoComercial.create({
          data: {
            nombreComercial: pa.nombre,
            nombreNormalizado: normalizar(pa.nombre),
            // Sin laboratorio ni dosis: no es un producto registrado, es el
            // principio activo hecho prescriptible. La dosis la escribe el
            // médico en la prescripción.
            laboratorio: null,
            formaFarmaceutica: null,
            dosisTexto: null,
            esGenerico: true,
            principiosActivos: { create: { principioActivoId: pa.id } },
          },
        }),
      ),
    );

    creados += lote.length;
    process.stdout.write(`\r  creados ${creados}/${faltantes.length}`);
  }

  console.log('\n');
  await verificar(principios.length);
}

/**
 * Contar después de cargar, no asumir. Es la misma disciplina que el importador
 * del catálogo: si el número no coincide, hay entradas perdiéndose en silencio.
 */
async function verificar(esperado: number) {
  const genericos = await prisma.productoComercial.count({ where: { esGenerico: true } });
  const total = await prisma.productoComercial.count();

  const sinGenerico = await prisma.principioActivo.count({
    where: { productos: { none: { productoComercial: { esGenerico: true } } } },
  });

  console.table({ genericos, productosTotales: total, principiosSinGenerico: sinGenerico });

  if (genericos !== esperado || sinGenerico !== 0) {
    throw new Error(
      `Esperaba ${esperado} genéricos y 0 principios sin genérico; hay ${genericos} y ${sinGenerico}.`,
    );
  }
  console.log('Todos los principios activos son prescriptibles.\n');
}

main()
  .catch((e) => {
    console.error('\n' + String(e?.message ?? e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
