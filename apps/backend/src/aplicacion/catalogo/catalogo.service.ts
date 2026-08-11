import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { normalizar } from '@gfh/shared-types';

import { interaccionesDe } from '../../dominio/clinico/interacciones';
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

  async buscarProductos(consulta: string, limite = 30) {
    const texto = normalizar(consulta);
    if (texto.length < 2) return [];

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
              },
            },
          },
        },
      },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    const pas = producto.principiosActivos.map((x) => x.principioActivo);

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
      })),
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
      /** Sin proveedor de monografías integrado. NUNCA se nombra al proveedor
       *  en la UI (regla no negociable 9). */
      monografia: null as null,
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
    if (texto.length < 2) return [];
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

    return {
      codigoATC: pa.codigoATC,
      motivoSinDatos: null,
      niveles,
      mismaClase: await this.mismaClase(pa.grupoTerapeutico, pa.id),
    };
  }

  private async mismaClase(grupoTerapeutico: string | null, excluirId: string) {
    if (!grupoTerapeutico) return [];
    return this.prisma.principioActivo.findMany({
      where: { grupoTerapeutico, id: { not: excluirId } },
      orderBy: { nombre: 'asc' },
      take: 30,
      select: { id: true, nombre: true, tieneAjusteRenal: true },
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
