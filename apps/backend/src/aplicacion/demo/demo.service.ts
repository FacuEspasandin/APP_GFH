import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { evaluarCockpit } from '../../dominio/clinico/evaluar-cockpit';
import type { ContextoCockpit } from '../../dominio/clinico/puertos';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RespuestaCockpit } from '../cockpit/cockpit.service';
import {
  CONDICIONES_DEMO,
  DATOS_DEMO,
  FARMACOS_DEMO,
  HOY_DEMO,
  ID_GRUPO_DEMO,
  ID_PACIENTE_DEMO,
  NOMBRE_GRUPO_DEMO,
  idPrescripcionDemo,
} from './paciente-demo';

/**
 * El paciente de demostración de las cuentas sin suscripción.
 *
 * Se arma UNA vez al arrancar, resolviendo los fármacos contra el catálogo real
 * y pasando el contexto por el motor real. De ahí en más responder es gratis y
 * no toca la base: es el mismo objeto para todos los usuarios gratis, porque no
 * es de nadie.
 *
 * Si el catálogo no tiene alguno de los fármacos, el demo se arma con los que
 * sí están y lo registra. No se cae la app por eso — pero un demo con menos
 * hallazgos de los esperados es una señal de que el catálogo cambió.
 */
@Injectable()
export class DemoService implements OnModuleInit {
  private readonly logger = new Logger(DemoService.name);
  private cockpit: RespuestaCockpit | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogoInteraccionesService)
    private readonly catalogo: CatalogoInteraccionesService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.cockpit = await this.construir();
      this.logger.log(
        `Paciente de demostración: ${this.cockpit.prescripciones.length} fármacos → ` +
          `${this.cockpit.hallazgos.length} hallazgos`,
      );
    } catch (error) {
      // Sin demo la app arranca igual: las cuentas gratis ven la lista vacía.
      // Es peor eso que no arrancar.
      this.logger.error('No se pudo armar el paciente de demostración', error);
    }
  }

  obtenerCockpit(): RespuestaCockpit | null {
    return this.cockpit;
  }

  /** La fila del paciente para la lista de Inicio. */
  obtenerFila() {
    if (!this.cockpit) return null;
    const p = this.cockpit.paciente;
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      edadAnios: p.edadAnios,
      clcrMlMin: p.clcrMlMin,
      clcrOrigen: p.clcrOrigen,
      grupoId: ID_GRUPO_DEMO,
      grupoNombre: NOMBRE_GRUPO_DEMO,
      conteoHallazgos: this.cockpit.hallazgos.length,
      peorRango: this.cockpit.hallazgos.reduce<number | null>(
        (peor, h) => (peor === null || h.rango < peor ? h.rango : peor),
        null,
      ),
    };
  }

  obtenerGrupo() {
    const fila = this.obtenerFila();
    if (!fila) return null;
    return {
      id: ID_GRUPO_DEMO,
      nombre: NOMBRE_GRUPO_DEMO,
      pacientes: 1,
      conteoHallazgos: fila.conteoHallazgos,
      peorRango: fila.peorRango,
    };
  }

  // --- armado ---------------------------------------------------------------

  private async construir(): Promise<RespuestaCockpit> {
    const contexto = await this.armarContexto();
    const resultado = evaluarCockpit(contexto, this.catalogo.obtener(), HOY_DEMO);

    const porPrescripcion = new Map<string, { peor: number | null; cuantos: number }>();
    for (const h of resultado.hallazgos) {
      for (const id of h.prescripcionIds) {
        const previo = porPrescripcion.get(id) ?? { peor: null, cuantos: 0 };
        porPrescripcion.set(id, {
          peor: previo.peor === null || h.rango < previo.peor ? h.rango : previo.peor,
          cuantos: previo.cuantos + 1,
        });
      }
    }

    return {
      ...resultado,
      paciente: {
        id: ID_PACIENTE_DEMO,
        nombre: DATOS_DEMO.nombre,
        apellido: DATOS_DEMO.apellido,
        edadAnios: resultado.edadAnios,
        sexo: DATOS_DEMO.sexo,
        pesoKg: DATOS_DEMO.pesoKg,
        alturaCm: DATOS_DEMO.alturaCm,
        clcrMlMin: resultado.clcrMlMin,
        clcrOrigen: resultado.clcrOrigen,
        clcrMedidoAt: null,
        creatininaMgDl: DATOS_DEMO.creatininaMgDl,
        gradoKdigo: resultado.gradoKdigo,
        childPughClase: null,
        semanaGestacion: DATOS_DEMO.semanaGestacion,
        estaLactando: DATOS_DEMO.estaLactando,
      },
      prescripciones: contexto.prescripciones.map((p) => {
        const r = porPrescripcion.get(p.id);
        return {
          id: p.id,
          nombre: p.nombreMostrado,
          dosis: p.dosis,
          frecuencia: p.frecuencia,
          via: p.via,
          esFarmacoLibre: p.esFarmacoLibre,
          espina: r?.peor ?? null,
          conteoHallazgos: r?.cuantos ?? 0,
        };
      }),
      // Las interacciones detectadas del demo NO se persisten: no hay paciente
      // en la base al que colgarlas.
      interaccionesDetectadas: [],
    };
  }

  private async armarContexto(): Promise<ContextoCockpit> {
    const nombres = [...new Set(FARMACOS_DEMO.flatMap((f) => f.pas as readonly string[]))];

    const [pas, condiciones, grupos] = await Promise.all([
      this.prisma.principioActivo.findMany({
        where: { nombre: { in: nombres } },
        include: { gruposAlergenicos: { select: { grupoAlergenicoId: true } } },
      }),
      this.prisma.condicionClinica.findMany({
        where: { codigo: { in: [...CONDICIONES_DEMO] } },
        select: { id: true, codigo: true, nombre: true },
      }),
      this.prisma.grupoAlergenico.findMany(),
    ]);

    const porNombre = new Map(pas.map((p) => [p.nombre, p]));
    const faltantes = nombres.filter((n) => !porNombre.has(n));
    if (faltantes.length > 0) {
      this.logger.warn(`El catálogo no tiene: ${faltantes.join(', ')}. El demo va sin ellos.`);
    }

    const prescripciones = FARMACOS_DEMO.flatMap((f, i) => {
      const id = idPrescripcionDemo(i + 1);
      const componentes = (f.pas as readonly string[]).flatMap((nombre) => {
        const pa = porNombre.get(nombre);
        if (!pa) return [];
        return [
          {
            prescripcionId: id,
            principioActivoId: pa.id,
            nombre: pa.nombre,
            gruposAlergenicosIds: pa.gruposAlergenicos.map((g) => g.grupoAlergenicoId),
          },
        ];
      });

      // Un producto cuyos componentes no están en el catálogo no se muestra:
      // sería una fila sin nada que evaluar.
      if (componentes.length === 0) return [];

      return [
        {
          id,
          esFarmacoLibre: false,
          nombreLibre: null,
          productoComercialId: null,
          nombreMostrado: f.comercial as string,
          dosis: f.dosis as string,
          frecuencia: f.frecuencia as string,
          via: f.via as string,
          componentes,
        },
      ];
    });

    const paIds = prescripciones.flatMap((p) => p.componentes.map((c) => c.principioActivoId));

    const [ajustes, alertas] = await Promise.all([
      this.prisma.ajusteRenalFarmaco.findMany({
        where: { principioActivoId: { in: paIds } },
        include: { rangos: { orderBy: { orden: 'asc' } } },
      }),
      this.prisma.alertaCondicionFarmaco.findMany({
        where: { principioActivoId: { in: paIds } },
        include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
      }),
    ]);

    const ajustesPorPa = new Map<string, ReturnType<typeof mapearAjuste>[]>();
    for (const a of ajustes) {
      const lista = ajustesPorPa.get(a.principioActivoId) ?? [];
      lista.push(mapearAjuste(a));
      ajustesPorPa.set(a.principioActivoId, lista);
    }

    return {
      paciente: {
        id: ID_PACIENTE_DEMO,
        medicoId: 'demo',
        nombre: DATOS_DEMO.nombre,
        apellido: DATOS_DEMO.apellido,
        fechaNacimiento: DATOS_DEMO.fechaNacimiento,
        sexo: DATOS_DEMO.sexo,
        pesoKg: DATOS_DEMO.pesoKg,
        alturaCm: DATOS_DEMO.alturaCm,
        creatininaMgDl: DATOS_DEMO.creatininaMgDl,
        clcrMlMin: null,
        clcrOrigen: null,
        clcrMedidoAt: null,
        childPughClase: null,
        childPughOrigen: null,
        semanaGestacion: DATOS_DEMO.semanaGestacion,
        estaLactando: DATOS_DEMO.estaLactando,
      },
      prescripciones,
      condicionesCargadasIds: condiciones.map((c) => c.id),
      condicionesCargadasCodigos: condiciones.map((c) => c.codigo),
      alergias: [],
      gruposAlergenicos: new Map(
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
      ),
      ajustesRenales: ajustesPorPa,
      alertas: alertas.map((a) => ({
        principioActivoId: a.principioActivoId,
        condicionId: a.condicionClinicaId,
        condicionCodigo: a.condicionClinica.codigo,
        condicionNombre: a.condicionClinica.nombre,
        severidad: a.severidad,
        texto: a.texto,
        semanaMin: a.semanaMin,
        semanaMax: a.semanaMax,
        estadoValidacion: a.estadoValidacion,
      })),
      curaciones: new Map(),
      umbralAdultoMayor: 65,
    };
  }
}

function mapearAjuste(a: {
  principioActivoId: string;
  viaAdministracion: string;
  dosisFrNormal: string;
  metodoAjuste: string;
  suplementoHd: string | null;
  requiereRevision: boolean;
  estadoValidacion: string;
  rangos: Array<{ rangoTexto: string; textoRecomendacion: string | null; tipo: string }>;
}) {
  return {
    principioActivoId: a.principioActivoId,
    viaAdministracion: a.viaAdministracion,
    dosisFrNormal: a.dosisFrNormal,
    metodoAjuste: a.metodoAjuste,
    suplementoHd: a.suplementoHd,
    requiereRevision: a.requiereRevision,
    estadoValidacion: a.estadoValidacion,
    rangos: a.rangos,
  } as never;
}
