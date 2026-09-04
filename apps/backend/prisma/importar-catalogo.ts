/**
 * Carga un catálogo comercial de un proveedor externo.
 *
 *   tsx prisma/importar-catalogo.ts <archivo.json>              → simulacro
 *   tsx prisma/importar-catalogo.ts <archivo.json> --aplicar    → escribe
 *
 * El formato de entrada está en `CATALOGO.md`. Es NUESTRO formato, no el del
 * proveedor: cuando llegue el volcado real se escribe un adaptador que lo
 * traduzca, y este script no cambia. Sin esa separación, el día que el
 * proveedor mueva una columna hay que tocar la lógica de fusión.
 *
 * Tres reglas que gobiernan todo lo de abajo:
 *
 *   1. **No pisa lo curado.** Toca `producto_comercial` y el vínculo con
 *      principio activo, y nada más. Las 507 alertas por condición, los 635
 *      ajustes renales, las 271 alternativas y las reglas de interacción se
 *      revisan a mano y un importador no tiene autoridad sobre ellas.
 *
 *   2. **Simulacro por defecto.** Un script que escribe en cuanto se lo
 *      invoca es un script que alguien corre por error contra producción. Hay
 *      que pedir `--aplicar` a propósito.
 *
 *   3. **Idempotente.** Correrlo dos veces seguidas deja la segunda en cero
 *      cambios. Es lo que permite reimportar cada vez que llega una
 *      actualización sin pensarlo.
 */

import { readFileSync } from 'node:fs';

import { PrismaClient, type CondicionVenta, type EstadoProducto } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

const prisma = new PrismaClient();

// --- el formato de entrada ---------------------------------------------------

interface PrincipioDeEntrada {
  nombre: string;
  /** «B01AC06». Sólo se escribe si el principio activo todavía no lo tiene. */
  codigoATC?: string;
  /** Los cuatro que siguen se completan igual que codigoATC: sólo si el
   *  principio activo todavía no lo tiene — un dato cargado a mano no se pisa. */
  codFtm?: string;
  capitulo?: string;
  accionTerapeutica?: string;
  definicionCorta?: string;
}

interface ProductoDeEntrada {
  /** Clave estable del proveedor. Es por lo que se reconoce una fila entre
   *  importaciones; sin ella no hay forma de saber si esto es alta o cambio. */
  codigoExterno: string;
  nombreComercial: string;
  laboratorio?: string | null;
  formaFarmaceutica?: string | null;
  dosisTexto?: string | null;
  presentacion?: string | null;
  condicionVenta?: CondicionVenta;
  /** `false` = salió del mercado. Ausente se toma como vigente. */
  vigente?: boolean;
  /** El motivo fino de `vigente` (ver `EstadoProducto` en el schema) —
   *  ninguna pantalla lo necesita hoy, se guarda para cuando haga falta. */
  estadoProveedor?: EstadoProducto | null;
  codigoBarras?: string | null;
  registroMsp?: string | null;
  principiosActivos: PrincipioDeEntrada[];
}

const CONDICIONES: readonly CondicionVenta[] = [
  'VENTA_LIBRE',
  'CONTROL_MEDICO_RECOMENDADO',
  'RECETA',
  'RECETA_CONTROLADA',
  'PSICOFARMACO',
  'ESTUPEFACIENTE',
  'DESCONOCIDA',
];

/**
 * Valida una fila y devuelve por qué se descarta, o `null` si sirve.
 *
 * Se descarta la fila entera y no se corrige a medias: un producto sin nombre o
 * sin principio activo no es un dato incompleto, es un dato que no se puede
 * usar, y cargarlo llenaría el buscador de entradas que el motor no puede
 * evaluar.
 */
function porQueSeDescarta(p: ProductoDeEntrada): string | null {
  if (!p.codigoExterno?.trim()) return 'sin codigoExterno';
  if (!p.nombreComercial?.trim()) return 'sin nombreComercial';
  if (!Array.isArray(p.principiosActivos) || p.principiosActivos.length === 0) {
    return 'sin principios activos';
  }
  if (p.principiosActivos.some((pa) => !pa.nombre?.trim())) return 'principio activo sin nombre';
  if (p.condicionVenta && !CONDICIONES.includes(p.condicionVenta)) {
    return `condicionVenta desconocida: ${p.condicionVenta}`;
  }
  return null;
}

// --- el informe --------------------------------------------------------------

interface Informe {
  leidos: number;
  descartados: Array<{ codigo: string; motivo: string }>;
  altas: string[];
  cambios: Array<{ codigo: string; campos: string[] }>;
  sinCambios: number;
  discontinuados: string[];
  principiosNuevos: string[];
  /** Cuenta campos, no fármacos: un fármaco puede completar varios a la vez
   *  (codigoATC, codFtm, capitulo, accionTerapeutica, definicionCorta). */
  camposFarmacoCompletados: number;
}

function vacio(): Informe {
  return {
    leidos: 0,
    descartados: [],
    altas: [],
    cambios: [],
    sinCambios: 0,
    discontinuados: [],
    principiosNuevos: [],
    camposFarmacoCompletados: 0,
  };
}

// --- el trabajo --------------------------------------------------------------

/** Los campos comerciales, para comparar lo que hay con lo que llega. */
function comerciales(p: ProductoDeEntrada) {
  return {
    nombreComercial: p.nombreComercial.trim(),
    nombreNormalizado: normalizar(p.nombreComercial),
    laboratorio: p.laboratorio?.trim() ?? null,
    formaFarmaceutica: p.formaFarmaceutica?.trim() ?? null,
    dosisTexto: p.dosisTexto?.trim() ?? null,
    presentacion: p.presentacion?.trim() ?? null,
    condicionVenta: p.condicionVenta ?? ('DESCONOCIDA' as CondicionVenta),
    vigente: p.vigente ?? true,
    estadoProveedor: p.estadoProveedor ?? null,
    codigoBarras: p.codigoBarras?.trim() ?? null,
    registroMsp: p.registroMsp?.trim() ?? null,
  };
}

async function importar(archivo: string, aplicar: boolean, origen: string): Promise<Informe> {
  const crudo: unknown = JSON.parse(readFileSync(archivo, 'utf8'));
  if (!Array.isArray(crudo)) throw new Error('El archivo tiene que ser un array de productos.');

  const informe = vacio();
  informe.leidos = crudo.length;

  const entrada = crudo as ProductoDeEntrada[];
  const validos: ProductoDeEntrada[] = [];
  for (const p of entrada) {
    const motivo = porQueSeDescarta(p);
    if (motivo) informe.descartados.push({ codigo: p?.codigoExterno ?? '(sin código)', motivo });
    else validos.push(p);
  }

  // Todo lo que ya está, en dos consultas y no en dos por producto.
  const existentes = await prisma.productoComercial.findMany({
    where: { codigoApiExterna: { in: validos.map((p) => p.codigoExterno) } },
    select: {
      id: true,
      codigoApiExterna: true,
      nombreComercial: true,
      nombreNormalizado: true,
      laboratorio: true,
      formaFarmaceutica: true,
      dosisTexto: true,
      presentacion: true,
      condicionVenta: true,
      vigente: true,
      estadoProveedor: true,
      codigoBarras: true,
      registroMsp: true,
    },
  });
  const porCodigo = new Map(existentes.map((p) => [p.codigoApiExterna!, p]));

  const principios = await prisma.principioActivo.findMany({
    select: {
      id: true,
      nombreNormalizado: true,
      codigoATC: true,
      codFtm: true,
      capitulo: true,
      accionTerapeutica: true,
      definicionCorta: true,
    },
  });
  const porNombre = new Map(principios.map((pa) => [pa.nombreNormalizado, pa]));

  const ahora = new Date();

  for (const p of validos) {
    // --- los principios activos primero: el producto los necesita -----------
    const ids: string[] = [];
    for (const pa of p.principiosActivos) {
      const clave = normalizar(pa.nombre);
      let existente = porNombre.get(clave);

      if (!existente) {
        /*
         * Se crea, y se avisa fuerte.
         *
         * Un principio activo nuevo entra SIN tablas de ajuste, sin alertas y
         * sin interacciones. El motor lo evalúa igual y no encuentra nada — y
         * la ficha lo muestra como «sin datos», no como «ok». Eso es correcto
         * (regla 5), pero significa que cada alta de acá es contenido clínico
         * que alguien tiene que cargar después.
         */
        informe.principiosNuevos.push(pa.nombre.trim());
        if (aplicar) {
          const creado = await prisma.principioActivo.create({
            data: {
              nombre: pa.nombre.trim(),
              nombreNormalizado: clave,
              ...(pa.codigoATC ? { codigoATC: pa.codigoATC.trim() } : {}),
              ...(pa.codFtm ? { codFtm: pa.codFtm.trim() } : {}),
              ...(pa.capitulo ? { capitulo: pa.capitulo.trim() } : {}),
              ...(pa.accionTerapeutica ? { accionTerapeutica: pa.accionTerapeutica.trim() } : {}),
              ...(pa.definicionCorta ? { definicionCorta: pa.definicionCorta.trim() } : {}),
            },
            select: {
              id: true,
              nombreNormalizado: true,
              codigoATC: true,
              codFtm: true,
              capitulo: true,
              accionTerapeutica: true,
              definicionCorta: true,
            },
          });
          existente = creado;
          porNombre.set(clave, creado);
        } else {
          // En simulacro no hay id que enlazar; el conteo alcanza.
          continue;
        }
      } else {
        // Sólo se completa lo que falta: un dato cargado a mano gana siempre,
        // campo por campo — una actualización real puede traer unos sí y
        // otros no.
        const faltantes: Record<string, string> = {};
        if (pa.codigoATC && !existente.codigoATC) faltantes.codigoATC = pa.codigoATC.trim();
        if (pa.codFtm && !existente.codFtm) faltantes.codFtm = pa.codFtm.trim();
        if (pa.capitulo && !existente.capitulo) faltantes.capitulo = pa.capitulo.trim();
        if (pa.accionTerapeutica && !existente.accionTerapeutica) {
          faltantes.accionTerapeutica = pa.accionTerapeutica.trim();
        }
        if (pa.definicionCorta && !existente.definicionCorta) {
          faltantes.definicionCorta = pa.definicionCorta.trim();
        }

        const campos = Object.keys(faltantes);
        if (campos.length > 0) {
          informe.camposFarmacoCompletados += campos.length;
          if (aplicar) {
            await prisma.principioActivo.update({
              where: { id: existente.id },
              data: faltantes,
            });
          }
        }
      }

      ids.push(existente.id);
    }

    // --- el producto ---------------------------------------------------------
    const datos = comerciales(p);
    const ya = porCodigo.get(p.codigoExterno);

    if (!ya) {
      informe.altas.push(`${datos.nombreComercial}${datos.laboratorio ? ` · ${datos.laboratorio}` : ''}`);
      if (aplicar) {
        await prisma.productoComercial.create({
          data: {
            ...datos,
            codigoApiExterna: p.codigoExterno,
            esGenerico: false,
            importadoAt: ahora,
            origenDato: origen,
            principiosActivos: { create: ids.map((id) => ({ principioActivoId: id })) },
          },
        });
      }
      continue;
    }

    const distintos = (Object.keys(datos) as Array<keyof typeof datos>).filter(
      (k) => ya[k] !== datos[k],
    );

    if (distintos.length === 0) {
      informe.sinCambios++;
      continue;
    }

    informe.cambios.push({ codigo: p.codigoExterno, campos: distintos });
    if (ya.vigente && datos.vigente === false) informe.discontinuados.push(ya.nombreComercial);

    if (aplicar) {
      await prisma.productoComercial.update({
        where: { id: ya.id },
        data: { ...datos, importadoAt: ahora, origenDato: origen },
      });
    }
  }

  return informe;
}

// --- salida ------------------------------------------------------------------

function imprimir(i: Informe, aplicar: boolean, origen: string): void {
  const lista = (xs: string[], tope = 10) =>
    xs.slice(0, tope).map((x) => `    · ${x}`).join('\n') +
    (xs.length > tope ? `\n    … y ${xs.length - tope} más` : '');

  console.log(`\n${aplicar ? 'IMPORTACIÓN' : 'SIMULACRO'} · origen «${origen}»`);
  console.log('─'.repeat(58));
  console.log(`  leídos              ${i.leidos}`);
  console.log(`  altas               ${i.altas.length}`);
  console.log(`  actualizados        ${i.cambios.length}`);
  console.log(`  sin cambios         ${i.sinCambios}`);
  console.log(`  descartados         ${i.descartados.length}`);

  if (i.principiosNuevos.length > 0) {
    console.log(`\n  PRINCIPIOS ACTIVOS NUEVOS · ${i.principiosNuevos.length}`);
    console.log('  Entran sin tablas de ajuste, sin alertas y sin interacciones.');
    console.log('  La ficha los va a mostrar como «sin datos», que es correcto —');
    console.log('  pero es contenido clínico que alguien tiene que cargar.');
    console.log(lista(i.principiosNuevos));
  }

  if (i.discontinuados.length > 0) {
    console.log(`\n  SALEN DEL MERCADO · ${i.discontinuados.length}`);
    console.log('  Dejan de estar vigentes. Si alguno está en el tratamiento de');
    console.log('  un paciente, la prescripción NO se toca: sólo el catálogo.');
    console.log(lista(i.discontinuados));
  }

  if (i.camposFarmacoCompletados > 0) {
    console.log(`\n  campos de fármaco completados: ${i.camposFarmacoCompletados}`);
  }

  if (i.descartados.length > 0) {
    console.log(`\n  DESCARTADOS · ${i.descartados.length}`);
    console.log(lista(i.descartados.map((d) => `${d.codigo} — ${d.motivo}`)));
  }

  console.log(
    aplicar
      ? '\n  Escrito. Lo curado —alertas, ajustes, alternativas, interacciones— no se tocó.'
      : '\n  No se escribió nada. Volvé a correrlo con --aplicar.',
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith('--'));
  const aplicar = args.includes('--aplicar');
  const origen = args.find((a) => a.startsWith('--origen='))?.slice(9) ?? 'externo';

  if (!archivo) {
    console.error('Uso: tsx prisma/importar-catalogo.ts <archivo.json> [--aplicar] [--origen=nombre]');
    process.exit(1);
  }

  const informe = await importar(archivo, aplicar, origen);
  imprimir(informe, aplicar, origen);
}

void main()
  .catch((e: unknown) => {
    console.error('\nFalló:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

export { importar, porQueSeDescarta, type ProductoDeEntrada };
