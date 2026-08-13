import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { gradoKdigo, parClave, RANGO_POR_TIPO_AJUSTE , calcularChildPugh, GLOSA_CLASE } from '@gfh/shared-types';

import { elegirRango } from '../../dominio/clinico/ajuste-renal';
import { evaluarAlergias, type GrupoAlergenico } from '../../dominio/clinico/alergias';
import { calcularClcr, DatoClinicoInvalido } from '@gfh/shared-types';
import { aplicaEnSemana } from '../../dominio/clinico/condiciones';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type {
  HerramientaCondicionAlergiaDto,
  HerramientaHepaticaDto,
  HerramientaInteraccionesDto,
  HerramientaRenalDto,
} from '../../presentacion/dto/tratamiento.dto';

/**
 * Las cuatro herramientas standalone.
 *
 * NO generan entidades y NO escriben nada (modelo §5): llaman a los mismos
 * motores que el cockpit, pero sin paciente. Se pierden al salir de la
 * pantalla, por decisión de producto.
 *
 * Como no persisten, acá no hay `medicoId` que aislar — es puro cálculo sin
 * estado. Los endpoints siguen requiriendo sesión: el acceso al catálogo es
 * parte de lo que se paga.
 */
@Injectable()
export class HerramientasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogoInteraccionesService) private readonly catalogo: CatalogoInteraccionesService,
  ) {}

  /** Herramienta 1: todos los pares de una lista libre de N fármacos. */
  async interacciones(dto: HerramientaInteraccionesDto) {
    const pas = await this.prisma.principioActivo.findMany({
      where: { id: { in: dto.principioActivoIds } },
      select: { id: true, nombre: true },
    });

    const catalogo = this.catalogo.obtener();
    const pares: Array<{
      a: string;
      b: string;
      severidad: string;
      texto: string;
    }> = [];

    // n fármacos → n(n−1)/2 pares. 12 fármacos son 66.
    for (let i = 0; i < pas.length; i += 1) {
      for (let j = i + 1; j < pas.length; j += 1) {
        const uno = pas[i]!;
        const otro = pas[j]!;
        const entrada = catalogo.get(parClave(uno.nombre, otro.nombre));
        if (!entrada) continue;
        pares.push({
          a: uno.nombre,
          b: otro.nombre,
          severidad: entrada.severidad,
          texto: entrada.texto,
        });
      }
    }

    const peso: Record<string, number> = { CONTRAINDICADA: 0, ALTA: 1, INFORMATIVA: 2 };
    pares.sort((x, y) => (peso[x.severidad] ?? 9) - (peso[y.severidad] ?? 9));

    return {
      farmacos: pas.map((p) => p.nombre),
      totalPares: (pas.length * (pas.length - 1)) / 2,
      conInteraccion: pares.length,
      pares,
    };
  }

  /** Herramienta 2: un fármaco candidato contra condiciones y alergias sueltas. */
  async condicionAlergia(dto: HerramientaCondicionAlergiaDto) {
    const [pa, alertas, grupos] = await Promise.all([
      this.prisma.principioActivo.findUnique({
        where: { id: dto.principioActivoId },
        include: { gruposAlergenicos: { select: { grupoAlergenicoId: true } } },
      }),
      this.prisma.alertaCondicionFarmaco.findMany({
        where: {
          principioActivoId: dto.principioActivoId,
          ...(dto.condicionIds?.length ? { condicionClinicaId: { in: dto.condicionIds } } : {}),
        },
        include: { condicionClinica: { select: { id: true, nombre: true, codigo: true } } },
      }),
      this.prisma.grupoAlergenico.findMany(),
    ]);

    if (!pa) throw new BadRequestException('Principio activo desconocido.');

    const alertasAplicables = alertas
      .filter((a) => aplicaEnSemana(a.semanaMin, a.semanaMax, dto.semanaGestacion ?? null))
      .map((a) => ({
        condicion: a.condicionClinica.nombre,
        severidad: a.severidad,
        texto: a.texto,
        estadoValidacion: a.estadoValidacion,
      }));

    const mapaGrupos = new Map<string, GrupoAlergenico>(
      grupos.map((g) => [
        g.id,
        {
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          nivelCruce: g.nivelCruce,
          grupoPadreId: g.grupoPadreId,
          sinonimos: g.sinonimos,
        },
      ]),
    );

    const coincidencias = evaluarAlergias(
      {
        principioActivoId: pa.id,
        gruposIds: pa.gruposAlergenicos.map((g) => g.grupoAlergenicoId),
      },
      (dto.grupoAlergenicoIds ?? []).map((gid, i) => ({
        id: `tmp-${i}`,
        severidad: dto.severidadAlergia ?? 'MODERADA',
        principioActivoId: null,
        grupoAlergenicoId: gid,
      })),
      mapaGrupos,
    );

    return {
      farmaco: pa.nombre,
      alertasCondicion: alertasAplicables,
      alergias: coincidencias.map((c) => ({
        tipo: c.tipo,
        rango: c.rango,
        grupo: c.grupoNombre,
        bloquea: c.bloquea,
        requiereConfirmacion: c.requiereConfirmacion,
      })),
      // Sin semana registrada la alerta se mantiene; la UI puede pedir el dato.
      semanaNoRegistrada:
        dto.semanaGestacion === undefined &&
        alertas.some((a) => a.semanaMin !== null || a.semanaMax !== null),
    };
  }

  /** Herramienta 3: N fármacos contra un Clcr, directo o calculado. */
  async ajusteRenal(dto: HerramientaRenalDto) {
    let clcr = dto.clcrMlMin ?? null;
    let origen: 'INGRESADO_MANUAL' | 'CALCULADO_COCKCROFT' | null =
      dto.clcrMlMin !== undefined ? 'INGRESADO_MANUAL' : null;

    if (
      clcr === null &&
      dto.edadAnios !== undefined &&
      dto.pesoKg !== undefined &&
      dto.creatininaMgDl !== undefined &&
      dto.sexo !== undefined
    ) {
      try {
        clcr = calcularClcr({
          edadAnios: dto.edadAnios,
          pesoKg: dto.pesoKg,
          creatininaMgDl: dto.creatininaMgDl,
          sexo: dto.sexo,
        });
        origen = 'CALCULADO_COCKCROFT';
      } catch (e) {
        if (e instanceof DatoClinicoInvalido) throw new BadRequestException(e.message);
        throw e;
      }
    }

    if (clcr === null) {
      throw new BadRequestException(
        'Falta el Clcr, o los cuatro datos para calcularlo (edad, peso, creatinina y sexo).',
      );
    }

    const ajustes = await this.prisma.ajusteRenalFarmaco.findMany({
      where: { principioActivoId: { in: dto.principioActivoIds } },
      include: {
        rangos: { orderBy: { orden: 'asc' } },
        principioActivo: { select: { id: true, nombre: true } },
      },
    });

    const porFarmaco = new Map<string, (typeof ajustes)[number][]>();
    for (const a of ajustes) {
      porFarmaco.set(a.principioActivoId, [...(porFarmaco.get(a.principioActivoId) ?? []), a]);
    }

    const resultados = dto.principioActivoIds.map((paId) => {
      const deEsteFarmaco = porFarmaco.get(paId);
      if (!deEsteFarmaco || deEsteFarmaco.length === 0) {
        // Sin tabla = sin datos. No es un error y no se inventa una dosis.
        return { principioActivoId: paId, nombre: null, sinDatos: true };
      }

      // Sin vía indicada se usa la genérica, que es la de 590 de las 635 filas.
      const ajuste =
        deEsteFarmaco.find((a) => a.viaAdministracion === 'NO_ESPECIFICADA') ?? deEsteFarmaco[0]!;
      const elegido = elegirRango(
        ajuste.rangos.map((r) => ({
          id: r.id,
          orden: r.orden,
          clcrMin: r.clcrMin,
          clcrMax: r.clcrMax,
          rangoTexto: r.rangoTexto,
          textoRecomendacion: r.textoRecomendacion,
          tipo: r.tipo,
        })),
        clcr!,
      );

      return {
        principioActivoId: paId,
        nombre: ajuste.principioActivo.nombre,
        sinDatos: false,
        via: ajuste.viaAdministracion,
        dosisFrNormal: ajuste.dosisFrNormal,
        metodoAjuste: ajuste.metodoAjuste,
        suplementoHd: ajuste.suplementoHd,
        requiereRevision: ajuste.requiereRevision,
        rango: elegido?.rango.rangoTexto ?? null,
        recomendacion: elegido?.rango.textoRecomendacion ?? null,
        tipo: elegido?.rango.tipo ?? null,
        rangoGravedad: elegido
          ? (RANGO_POR_TIPO_AJUSTE[elegido.rango.tipo as keyof typeof RANGO_POR_TIPO_AJUSTE] ?? null)
          : null,
        porEncimaDelTecho: elegido?.motivo === 'POR_ENCIMA_DEL_TECHO',
      };
    });

    return { clcrMlMin: clcr, clcrOrigen: origen, gradoKdigo: gradoKdigo(clcr), resultados };
  }

  /**
   * Herramienta 4: ajuste hepático.
   *
   * No hay fuente de datos: GFH no tiene tablas hepáticas y la clasificación
   * clínica todavía no está confirmada. Se responde explícitamente "sin datos"
   * en vez de devolver una lista vacía que se lea como "no hay problema".
   */
  /**
   * Child-Pugh sin paciente. No guarda nada: las herramientas sueltas son
   * descartables a propósito (modelo §5).
   *
   * `disponible: false` sigue significando lo mismo que antes —no hay tabla de
   * ajuste por fármaco— pero ahora la clase sí se calcula. Pasar de «no se
   * puede evaluar» a «clase B, sin tabla todavía» es la diferencia entre una
   * pantalla muerta y una que sirve.
   */
  ajusteHepatico(dto: HerramientaHepaticaDto) {
    const r = calcularChildPugh({
      bilirrubinaMgDl: dto.bilirrubinaMgDl,
      albuminaGDl: dto.albuminaGDl,
      inr: dto.inr,
      ascitis: dto.ascitis,
      encefalopatia: dto.encefalopatia,
    });

    return {
      ...r,
      glosa: r.clase === null ? null : GLOSA_CLASE[r.clase],
      /** La tabla de ajuste por fármaco: sigue sin existir. */
      tablaDisponible: false,
      motivo:
        'La clase se calcula, pero todavía no hay tabla de ajuste por fármaco contra la cual evaluarla.',
      resultados: [],
    };
  }
}
