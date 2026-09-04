import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { normalizar, restriccionesDe, seccionesDe } from '@gfh/shared-types';

import {
  agruparInteracciones,
  interaccionesDe,
} from '../../dominio/clinico/interacciones';
 import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
 import { PrismaService } from '../../infraestructura/prisma/prisma.service';

/**
 * Lecturas del catálogo clínico. Sin `medicoId`: es compartido y sin dueño.
 *
 * El Buscador y la carga de tratamiento operan a nivel de PRODUCTO COMERCIAL
 * (regla no negociable 10). El motor resuelve a principio activo puertas
 * adentro.
 */
@Injectable()
export class CatalogoService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogoInteraccionesService)
    private readonly catalogoInteracciones: CatalogoInteraccionesService,
  ) {}

  /**
   * Búsqueda del lado del servidor.
   *
   * La app ya no la usa para productos —se bajó el catálogo entero y busca en
   * el teléfono—, pero sigue acá y probada porque es el camino para cuando el
   * catálogo no entre más. Desde una letra, no dos: el corte en dos era para
   * ahorrar peticiones y con el índice trigram ya no hace falta.
   */
  async buscarProductos(consulta: string, limite = 30) {
    const texto = normalizar(consulta);
    if (texto.length < 1) return [];

    const productos = await this.prisma.productoComercial.findMany({
      where: { nombreNormalizado: { contains: texto } },
      orderBy: [{ esGenerico: 'asc' }, { nombreComercial: 'asc' }],
      take: limite,
      include: {
        principiosActivos: {
          include: {
            principioActivo: {
              select: { id: true, nombre: true, tieneAjusteRenal: true, tieneAjusteHepatico: true },
            },
          },
        },
      },
    });

    return productos.map((p) => this.aResumen(p));
  }

  /**
   * Cuántos productos hay en total.
   *
   * Va aparte y no dentro de la lista: la lista se pide una vez por página y
   * el total no cambia entre páginas, así que meterlo en cada respuesta sería
   * contar la tabla entera cada vez que alguien baja el scroll.
   */
  async conteoProductos(): Promise<{ productos: number }> {
    return { productos: await this.prisma.productoComercial.count() };
  }

  /**
   * El catálogo entero, de una, para que el teléfono busque sin red.
   *
   * Son 638 productos y 163 KB. La alternativa —una consulta por tecla— cuesta
   * ~390 ms cada una, y medido contra esta misma base da igual escribir «i»
   * (542 coincidencias) que «pirac» (2): el tiempo es la ida y vuelta a São
   * Paulo, no la consulta. Con el catálogo en el teléfono, cada tecla vale cero
   * y el buscador anda sin señal.
   *
   * Reemplaza a las dieciséis peticiones paginadas que la pestaña ya hacía para
   * el listado A-Z, así que además baja el tráfico.
   *
   * Esto deja de servir cuando el catálogo sea un vademécum de verdad —a partir
   * de unos pocos miles de productos ya no entra—. Para ese día está el índice
   * trigram sobre `nombreNormalizado` y `buscarProductos`, que siguen acá.
   */
  async indiceProductos() {
    const productos = await this.prisma.productoComercial.findMany({
      orderBy: [{ esGenerico: 'asc' }, { nombreComercial: 'asc' }],
      include: {
        principiosActivos: {
          include: {
            principioActivo: {
              select: { id: true, nombre: true, tieneAjusteRenal: true, tieneAjusteHepatico: true },
            },
          },
        },
      },
    });
    return productos.map((p) => this.aResumen(p));
  }

  /** Lo mismo para los principios activos: 631 filas, 91 KB. Lo piden sólo las
   *  pantallas que lo usan, y no el arranque de la app. */
  async indicePrincipiosActivos() {
    return this.prisma.principioActivo.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        grupoTerapeutico: true,
        tieneAjusteRenal: true,
        tieneAjusteHepatico: true,
        codigoATC: true,
      },
    });
  }

  /** Catálogo completo A-Z, paginado. */
  async listarProductos(desplazamiento = 0, limite = 40) {
    const productos = await this.prisma.productoComercial.findMany({
      orderBy: [{ esGenerico: 'asc' }, { nombreComercial: 'asc' }],
      skip: desplazamiento,
      take: limite,
      include: {
        principiosActivos: {
          include: {
            principioActivo: {
              select: { id: true, nombre: true, tieneAjusteRenal: true, tieneAjusteHepatico: true },
            },
          },
        },
      },
    });
    return productos.map((p) => this.aResumen(p));
  }

  /**
   * Ficha de fármaco. La monografía viene de una API externa que todavía no
   * está integrada; se devuelve `monografia: null` y la UI muestra el estado
   * "no disponible" (pantalla 5.9) en vez de inventar contenido.
   */
  async fichaProducto(productoId: string) {
    const producto = await this.prisma.productoComercial.findUnique({
      where: { id: productoId },
      include: {
        principiosActivos: {
          include: {
            principioActivo: {
              include: {
                ajustesRenales: { include: { rangos: { orderBy: { orden: 'asc' } } } },
                ajustesHepaticos: { include: { rangos: true } },
                monografia: true,
              },
            },
          },
        },
      },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    const pas = producto.principiosActivos.map((x) => x.principioActivo);

    // Embarazo y lactancia: el dato SIEMPRE estuvo en el catálogo —81 alertas
    // de embarazo y 10 de lactancia— pero la ficha no lo pedía, así que los dos
    // marcadores de la pantalla estaban apagados a la fuerza y mentían.
    const alertas = await this.prisma.alertaCondicionFarmaco.findMany({
      where: {
        principioActivoId: { in: pas.map((p) => p.id) },
        condicionClinica: { codigo: { in: ['EMBARAZO', 'LACTANCIA'] } },
      },
      include: {
        condicionClinica: { select: { codigo: true } },
        principioActivo: { select: { nombre: true } },
      },
    });

    const porCondicion = (codigo: string) =>
      alertas
        .filter((a) => a.condicionClinica.codigo === codigo)
        .map((a) => ({
          principioActivo: a.principioActivo.nombre,
          severidad: a.severidad,
          texto: a.texto,
          semanaMin: a.semanaMin,
          semanaMax: a.semanaMax,
          estadoValidacion: a.estadoValidacion,
        }));

    // El genérico de cada componente — un producto sintético por principio
    // activo (ver comentario en el modelo) — es a donde lleva tocar un
    // fármaco en Composición: la ficha nunca cuelga de un PrincipioActivo
    // solo, siempre de un producto (regla no negociable 8).
    const genericos = await this.prisma.productoComercial.findMany({
      where: {
        esGenerico: true,
        principiosActivos: { some: { principioActivoId: { in: pas.map((p) => p.id) } } },
      },
      select: { id: true, principiosActivos: { select: { principioActivoId: true } } },
    });
    const genericoPorPa = new Map<string, string>();
    for (const g of genericos) {
      for (const rel of g.principiosActivos) genericoPorPa.set(rel.principioActivoId, g.id);
    }

    return {
      id: producto.id,
      nombreComercial: producto.nombreComercial,
      esGenerico: producto.esGenerico,
      laboratorio: producto.laboratorio,
      formaFarmaceutica: producto.formaFarmaceutica,
      dosisTexto: producto.dosisTexto,
      principiosActivos: pas.map((pa) => ({
        id: pa.id,
        nombre: pa.nombre,
        grupoTerapeutico: pa.grupoTerapeutico,
        codigoATC: pa.codigoATC,
        // Null cuando el propio producto YA ES el genérico de ese componente
        // (nada a donde ir que no sea esta misma ficha) o cuando el catálogo
        // no tiene un genérico cargado para él todavía.
        productoGenericoId:
          genericoPorPa.get(pa.id) === producto.id ? null : (genericoPorPa.get(pa.id) ?? null),
      })),

      /**
       * La monografía, partida en secciones y sin las vacías.
       *
       * Va en la ficha LIBRE y no detrás del cupo: lo que se paga es el motor
       * —en qué trimestre, cuánto ajustar, con qué interactúa ESTE paciente—,
       * no el texto descriptivo, que cualquier vademécum ya da. Cobrar por
       * leer sería cobrar por lo único que no calculamos nosotros.
       *
       * Se arma por PRINCIPIO ACTIVO: en una asociación cada componente trae
       * la suya y el médico elige cuál abrir.
       */
      monografias: monografiasDe(pas),
      // Los chips salen de CUALQUIER componente que tenga tabla.
      tieneAjusteRenal: pas.some((pa) => pa.tieneAjusteRenal),
      tieneAjusteHepatico: pas.some((pa) => pa.tieneAjusteHepatico),
      tablasRenales: pas.flatMap((pa) =>
        pa.ajustesRenales.map((a) => ({
          principioActivo: pa.nombre,
          via: a.viaAdministracion,
          dosisFrNormal: a.dosisFrNormal,
          metodoAjuste: a.metodoAjuste,
          suplementoHd: a.suplementoHd,
          requiereRevision: a.requiereRevision,
          estadoValidacion: a.estadoValidacion,
          rangos: a.rangos.map((r) => ({
            rangoTexto: r.rangoTexto,
            textoRecomendacion: r.textoRecomendacion,
            tipo: r.tipo,
          })),
        })),
      ),
      // Una fila por (fármaco, clase) — flat, como espera `peldanosHepaticos`
      // del lado de la app. Un combinado con dos componentes con tabla propia
      // simplemente aporta más filas; el peldaño de cada clase se pinta con la
      // primera que encuentra, igual que el resto de la ficha no distingue
      // componente en la vista resumida.
      tablasHepaticas: pas.flatMap((pa) =>
        pa.ajustesHepaticos.flatMap((a) =>
          a.rangos.map((r) => ({
            principioActivo: pa.nombre,
            via: a.viaAdministracion,
            dosisFuncionNormal: a.dosisFuncionNormal,
            clase: r.clase,
            texto: r.textoRecomendacion,
            severidad: r.tipo,
            estadoValidacion: a.estadoValidacion,
            requiereRevision: a.requiereRevision,
          })),
        ),
      ),
      // Interacciones conocidas del fármaco, generales: acá no hay paciente,
      // así que no hay severidad instanciada contra nadie.
      //
      // Deduplicadas: un producto con dos principios activos de la misma
      // familia —Bactrim es sulfametoxazol + trimetoprima— matchea la misma
      // regla dos veces y la ficha listaba "Metotrexato · Contraindicado" dos
      // veces seguidas. Para el médico es UNA interacción del producto.
      interaccionesConocidas: unicasPorFarmaco(
        pas.flatMap((pa) =>
          interaccionesDe(pa.nombre, this.catalogoInteracciones.obtener()).map((i) => ({
            ...i,
            principioActivo: pa.nombre,
          })),
        ),
      ),
      /**
       * Las mismas interacciones, agrupadas por regla y familia. Litio tiene 26
       * y las 26 comparten el mismo texto: en tres grupos se leen, en veintiséis
       * renglones no.
       *
       * Sólo va en el DETALLE, no en la ficha: la ficha la mira cualquiera y el
       * detalle consume cupo.
       */
      gruposInteraccion: agruparInteracciones(
        unicasPorFarmaco(
          pas.flatMap((pa) => interaccionesDe(pa.nombre, this.catalogoInteracciones.obtener())),
        ),
        this.catalogoInteracciones.listas(),
      ),
      /** Restricciones que no son tabla de dosis sino alerta por condición. */
      embarazo: porCondicion('EMBARAZO'),
      lactancia: porCondicion('LACTANCIA'),
      /** Sin proveedor de monografías integrado. NUNCA se nombra al proveedor
       *  en la UI (regla no negociable 9). */
      monografia: null as null,
    };
  }

  /**
   * La ficha que ve cualquiera, pague o no.
   *
   * Trae lo que un vademécum gratuito ya da —composición, presentación, familia
   * alergénica— más el ESTADO de cada restricción y una glosa de una línea:
   * «Baja hasta el 25 %», «2 alertas». Alcanza para saber si hay algo que mirar,
   * que es lo que hace que valga la pena entrar.
   *
   * Lo que NO trae es el detalle: los tramos con su recomendación, el texto de
   * cada alerta, con qué fármacos interactúa. Eso sale por
   * `restriccionesDetalle`, que descuenta cupo. Si viniera todo acá el límite no
   * se podría aplicar: la app ya tendría las cinco respuestas y esconderlas
   * sería maquillaje.
   */
  async fichaLibre(id: string) {
    const f = await this.fichaProducto(id);

    const {
      tablasRenales,
      tablasHepaticas: _tablasHepaticas,
      embarazo,
      lactancia,
      interaccionesConocidas,
      gruposInteraccion,
      ...libre
    } = f;

    return {
      ...libre,
      /** Las cuatro tarjetas, resueltas acá con la misma función que antes
       *  corría en la app. */
      restricciones: restriccionesDe({
        embarazo,
        lactancia,
        tablasRenales,
        tieneAjusteHepatico: f.tieneAjusteHepatico,
      }),
      /**
       * De las interacciones sólo el conteo y la peor severidad: es lo que
       * dibuja la fila de la ficha. Los nombres son el detalle.
       */
      interacciones: {
        total: interaccionesConocidas.length,
        peorSeveridad: gruposInteraccion[0]?.severidad ?? null,
      },
    };
  }

  /**
   * Interacciones conocidas del fármaco, listadas de forma general: acá no hay
   * paciente, así que no hay severidad instanciada contra nadie.
   */
  async condiciones() {
    return this.prisma.condicionClinica.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, codigo: true, nombre: true, descripcion: true },
    });
  }

  async gruposAlergenicos() {
    return this.prisma.grupoAlergenico.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, codigo: true, nombre: true, nivelCruce: true, sinonimos: true },
    });
  }

  async buscarPrincipiosActivos(consulta: string, limite = 30) {
    const texto = normalizar(consulta);
    if (texto.length < 1) return [];
    return this.prisma.principioActivo.findMany({
      where: { nombreNormalizado: { contains: texto } },
      orderBy: { nombre: 'asc' },
      take: limite,
      select: {
        id: true,
        nombre: true,
        grupoTerapeutico: true,
        tieneAjusteRenal: true,
        tieneAjusteHepatico: true,
      },
    });
  }

  /**
   * "Similares" por jerarquía ATC. ABIERTO: `codigoATC` no existe en el
   * catálogo de GFH, así que hoy esto devuelve vacío salvo que se siembre
   * contra el catálogo ATC/DDD de la OMS. Se devuelve el motivo para que la UI
   * lo diga en vez de mostrar una lista vacía sin explicación.
   */
  async similares(principioActivoId: string) {
    const pa = await this.prisma.principioActivo.findUnique({
      where: { id: principioActivoId },
      select: { id: true, nombre: true, codigoATC: true, grupoTerapeutico: true },
    });
    if (!pa) throw new NotFoundException('Principio activo no encontrado.');

    if (!pa.codigoATC) {
      return {
        codigoATC: null,
        motivoSinDatos: 'El catálogo todavía no tiene códigos ATC cargados.',
        niveles: [],
        mismaClase: await this.mismaClase(pa.grupoTerapeutico, pa.id),
      };
    }

    // Cada nivel de la jerarquía sale de cortar el string por prefijo.
    const cortes = [1, 3, 4, 5, 7].filter((n) => n <= pa.codigoATC!.length);
    const niveles = await Promise.all(
      cortes.map(async (n) => {
        const prefijo = pa.codigoATC!.slice(0, n);
        return {
          prefijo,
          cantidad: await this.prisma.principioActivo.count({
            where: { codigoATC: { startsWith: prefijo } },
          }),
        };
      }),
    );

    // El nivel 5 (subgrupo químico, ej. J01CA) es el que de verdad sirve como
    // "esto es intercambiable con esto" — los niveles 1/3/4 son demasiado
    // anchos para listar (todo el grupo anatómico), sólo cuentan.
    const prefijoSubgrupo = pa.codigoATC.slice(0, 5);
    const mismoSubgrupo =
      prefijoSubgrupo.length === 5
        ? await this.prisma.principioActivo.findMany({
            where: { codigoATC: { startsWith: prefijoSubgrupo }, id: { not: pa.id } },
            orderBy: { nombre: 'asc' },
            take: 30,
            select: { id: true, nombre: true, tieneAjusteRenal: true, tieneAjusteHepatico: true },
          })
        : [];

    return {
      codigoATC: pa.codigoATC,
      motivoSinDatos: null,
      niveles,
      mismoSubgrupo,
      mismaClase: await this.mismaClase(pa.grupoTerapeutico, pa.id),
    };
  }

  /**
   * Otras dosis/formas de la misma marca — "Klaricid 500" y "Klaricid 250" son
   * dos filas de catálogo sin relación explícita hoy; se agrupan por
   * (nombreNormalizado, laboratorio), que ya es lo que las distingue de una
   * marca DISTINTA (el `@@unique` de la tabla usa esas mismas columnas).
   *
   * Con el catálogo actual (631 genéricos, uno por principio activo) esto casi
   * siempre devuelve una lista de un solo elemento — recién va a tener
   * contenido real cuando se cargue un catálogo comercial con variantes de
   * verdad. No es un bug: es que todavía no hay más de una presentación
   * cargada para ninguna marca.
   */
  async presentaciones(productoId: string) {
    const producto = await this.prisma.productoComercial.findUnique({
      where: { id: productoId },
      select: { nombreNormalizado: true, laboratorio: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    const hermanos = await this.prisma.productoComercial.findMany({
      where: { nombreNormalizado: producto.nombreNormalizado, laboratorio: producto.laboratorio },
      orderBy: [{ dosisTexto: 'asc' }, { formaFarmaceutica: 'asc' }],
      select: { id: true, nombreComercial: true, dosisTexto: true, formaFarmaceutica: true, esGenerico: true },
    });

    return hermanos.map((h) => ({ ...h, actual: h.id === productoId }));
  }

  private async mismaClase(grupoTerapeutico: string | null, excluirId: string) {
    if (!grupoTerapeutico) return [];
    return this.prisma.principioActivo.findMany({
      where: { grupoTerapeutico, id: { not: excluirId } },
      orderBy: { nombre: 'asc' },
      take: 30,
      select: { id: true, nombre: true, tieneAjusteRenal: true, tieneAjusteHepatico: true },
    });
  }

  private aResumen(p: {
    id: string;
    nombreComercial: string;
    esGenerico: boolean;
    laboratorio: string | null;
    formaFarmaceutica: string | null;
    dosisTexto: string | null;
    principiosActivos: Array<{
      principioActivo: {
        id: string;
        nombre: string;
        tieneAjusteRenal: boolean;
        tieneAjusteHepatico: boolean;
      };
    }>;
  }) {
    return {
      id: p.id,
      nombreComercial: p.nombreComercial,
      esGenerico: p.esGenerico,
      laboratorio: p.laboratorio,
      formaFarmaceutica: p.formaFarmaceutica,
      dosisTexto: p.dosisTexto,
      principiosActivos: p.principiosActivos.map((x) => x.principioActivo.nombre),
      tieneAjusteRenal: p.principiosActivos.some((x) => x.principioActivo.tieneAjusteRenal),
      tieneAjusteHepatico: p.principiosActivos.some((x) => x.principioActivo.tieneAjusteHepatico),
    };
  }
}

/**
 * Una entrada por fármaco con el que interactúa, quedándose con la más grave.
 *
 * Se compara por nombre y no por regla: dos reglas distintas —una por cada
 * principio activo del producto— describen el mismo choque para quien lo va a
 * recetar. Se conserva la peor porque perder la contraindicada y mostrar la
 * alta sería una rebaja silenciosa de la severidad.
 */
/**
 * Las monografías de un producto, una por principio activo que tenga texto.
 *
 * El fármaco sin monografía NO aparece en la lista, ni siquiera vacío: la
 * pantalla dibuja lo que recibe, y una entrada vacía le haría poner el índice
 * de secciones de un fármaco del que no sabemos nada.
 *
 * En una asociación pueden venir dos, y van las dos: cada componente tiene su
 * propio texto y fusionarlos perdería de cuál habla cada frase.
 */
export function monografiasDe<
  T extends { nombre: string; monografia?: Parameters<typeof seccionesDe>[0] },
>(pas: readonly T[]) {
  return pas.flatMap((pa) => {
    const secciones = seccionesDe(pa.monografia);
    return secciones.length === 0 ? [] : [{ principioActivo: pa.nombre, secciones }];
  });
}

const PESO_SEVERIDAD: Record<string, number> = { CONTRAINDICADA: 0, ALTA: 1, INFORMATIVA: 3 };

export function unicasPorFarmaco<T extends { conNombre: string; severidad: string }>(
  interacciones: readonly T[],
): T[] {
  const porNombre = new Map<string, T>();

  for (const i of interacciones) {
    const clave = i.conNombre.toLowerCase();
    const previa = porNombre.get(clave);
    const peor =
      previa === undefined ||
      (PESO_SEVERIDAD[i.severidad] ?? 3) < (PESO_SEVERIDAD[previa.severidad] ?? 3);
    if (peor) porNombre.set(clave, i);
  }

  return [...porNombre.values()];
}
