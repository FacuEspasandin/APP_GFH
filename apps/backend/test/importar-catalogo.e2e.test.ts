import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { importar, porQueSeDescarta, type ProductoDeEntrada } from '../prisma/importar-catalogo';

/**
 * El importador contra la base de verdad.
 *
 * Las dos propiedades que lo hacen seguro —simulacro por defecto e
 * idempotencia— no se pueden comprobar leyendo el código: hay que correrlo dos
 * veces y mirar. Y la tercera —que no pisa lo curado— es la que más importa,
 * porque el día que falle nadie se va a enterar mirando el buscador.
 *
 * Todo lo que crea lleva el prefijo `TEST-IMPORT` y se borra al final.
 */

const prisma = new PrismaClient();
const CODIGO = 'TEST-IMPORT-001';
const PA_NUEVO = 'Principio Activo De Prueba Zzz';

const FILA: ProductoDeEntrada = {
  codigoExterno: CODIGO,
  nombreComercial: 'Producto De Prueba',
  laboratorio: 'Laboratorio De Prueba',
  formaFarmaceutica: 'comprimido',
  dosisTexto: '10 mg',
  presentacion: 'caja x 20',
  condicionVenta: 'RECETA',
  principiosActivos: [{ nombre: PA_NUEVO, codigoATC: 'Z99ZZ99' }],
};

function archivoCon(filas: ProductoDeEntrada[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'gfh-catalogo-'));
  const f = path.join(dir, 'catalogo.json');
  writeFileSync(f, JSON.stringify(filas));
  return f;
}

/** Lo curado: si alguno de estos números se mueve, el importador se pasó de la raya. */
async function curado() {
  const [alertas, renales, alternativas, grupos] = await Promise.all([
    prisma.alertaCondicionFarmaco.count(),
    prisma.ajusteRenalFarmaco.count(),
    prisma.alternativaTerapeutica.count(),
    prisma.grupoAlergenico.count(),
  ]);
  return { alertas, renales, alternativas, grupos };
}

async function limpiar() {
  const p = await prisma.productoComercial.findFirst({ where: { codigoApiExterna: CODIGO } });
  if (p) {
    await prisma.productoComercialPrincipioActivo.deleteMany({ where: { productoComercialId: p.id } });
    await prisma.productoComercial.delete({ where: { id: p.id } });
  }
  await prisma.principioActivo.deleteMany({ where: { nombre: PA_NUEVO } });
}

describe('importar catálogo comercial', () => {
  let antes: Awaited<ReturnType<typeof curado>>;

  beforeAll(async () => {
    await limpiar();
    antes = await curado();
  }, 60_000);

  afterAll(async () => {
    await limpiar();
    await prisma.$disconnect();
  });

  it('el simulacro no escribe nada', async () => {
    const informe = await importar(archivoCon([FILA]), false, 'prueba');

    expect(informe.altas).toHaveLength(1);
    expect(informe.principiosNuevos).toContain(PA_NUEVO);

    // Y en la base no pasó nada.
    expect(await prisma.productoComercial.count({ where: { codigoApiExterna: CODIGO } })).toBe(0);
    expect(await prisma.principioActivo.count({ where: { nombre: PA_NUEVO } })).toBe(0);
  });

  it('con --aplicar carga el producto y su principio activo', async () => {
    await importar(archivoCon([FILA]), true, 'prueba');

    const p = await prisma.productoComercial.findFirst({
      where: { codigoApiExterna: CODIGO },
      include: { principiosActivos: { include: { principioActivo: true } } },
    });

    expect(p).not.toBeNull();
    expect(p!.presentacion).toBe('caja x 20');
    expect(p!.condicionVenta).toBe('RECETA');
    expect(p!.vigente).toBe(true);
    expect(p!.esGenerico).toBe(false);
    expect(p!.origenDato).toBe('prueba');
    expect(p!.importadoAt).not.toBeNull();

    expect(p!.principiosActivos).toHaveLength(1);
    expect(p!.principiosActivos[0]!.principioActivo.codigoATC).toBe('Z99ZZ99');
  });

  it('correrlo de nuevo no cambia nada', async () => {
    // La propiedad que permite reimportar cada actualización sin pensarlo.
    const informe = await importar(archivoCon([FILA]), true, 'prueba');

    expect(informe.altas).toEqual([]);
    expect(informe.cambios).toEqual([]);
    expect(informe.sinCambios).toBe(1);
    expect(informe.principiosNuevos).toEqual([]);
  });

  it('un cambio se detecta campo por campo', async () => {
    const informe = await importar(
      archivoCon([{ ...FILA, presentacion: 'caja x 60', vigente: false }]),
      true,
      'prueba',
    );

    expect(informe.cambios).toHaveLength(1);
    expect(informe.cambios[0]!.campos).toEqual(['presentacion', 'vigente']);
    expect(informe.discontinuados).toEqual(['Producto De Prueba']);

    const p = await prisma.productoComercial.findFirst({ where: { codigoApiExterna: CODIGO } });
    expect(p!.vigente).toBe(false);
  });

  it('el ATC cargado a mano no se pisa', async () => {
    // Sólo se completa lo que falta. El importador no es autoridad sobre un
    // dato que alguien puso a propósito.
    await importar(archivoCon([{ ...FILA, principiosActivos: [{ nombre: PA_NUEVO, codigoATC: 'OTRO99' }] }]), true, 'prueba');

    const pa = await prisma.principioActivo.findFirst({ where: { nombre: PA_NUEVO } });
    expect(pa!.codigoATC).toBe('Z99ZZ99');
  });

  it('no toca nada de lo curado', async () => {
    // La que más importa: alertas, ajustes, alternativas y grupos alergénicos
    // se revisan a mano y el importador no tiene autoridad sobre ellos.
    expect(await curado()).toEqual(antes);
  });

  it('descarta lo que no se puede usar, y dice por qué', () => {
    const base = { codigoExterno: 'X', nombreComercial: 'Y', principiosActivos: [{ nombre: 'Z' }] };

    expect(porQueSeDescarta(base as ProductoDeEntrada)).toBeNull();
    expect(porQueSeDescarta({ ...base, codigoExterno: '  ' } as ProductoDeEntrada)).toMatch(/codigoExterno/);
    expect(porQueSeDescarta({ ...base, nombreComercial: '' } as ProductoDeEntrada)).toMatch(/nombreComercial/);
    expect(porQueSeDescarta({ ...base, principiosActivos: [] } as ProductoDeEntrada)).toMatch(/principios activos/);
    expect(
      porQueSeDescarta({ ...base, condicionVenta: 'INVENTADA' } as unknown as ProductoDeEntrada),
    ).toMatch(/condicionVenta/);
  });
});
