import { Controller, Get, Inject, NotFoundException, Param, UseGuards } from '@nestjs/common';

import { PrismaService } from '../infraestructura/prisma/prisma.service';
import { RepositorioCockpitPrisma } from '../infraestructura/repositorios/repositorio-cockpit-prisma';
import { CockpitService } from '../aplicacion/cockpit/cockpit.service';
import { DemoService } from '../aplicacion/demo/demo.service';
import { esDelDemo } from '../aplicacion/demo/paciente-demo';
import { AccesoService } from '../aplicacion/suscripcion/acceso.service';
import { IdPacientePipe } from './comun/id-paciente.pipe';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { SuscripcionGuard } from './comun/suscripcion.guard';

@Controller('pacientes/:pacienteId/cockpit')
@UseGuards(JwtGuard, SuscripcionGuard)
export class CockpitController {
  private readonly repositorioOffline: RepositorioCockpitPrisma;

  constructor(
    @Inject(CockpitService) private readonly cockpit: CockpitService,
    @Inject(DemoService) private readonly demo: DemoService,
    @Inject(AccesoService) private readonly acceso: AccesoService,
    @Inject(PrismaService) prisma: PrismaService,
  ) {
    this.repositorioOffline = new RepositorioCockpitPrisma(prisma);
  }

  /**
   * La pantalla central. Devuelve, en UNA llamada: datos del paciente, la lista
   * de tratamiento con su espina de severidad, los hallazgos unificados 0-3, los
   * conteos por categoría del dashboard, y los avisos por falta de dato.
   *
   * Nunca se pide fármaco por fármaco desde el cliente (motor §4.6): esa fue la
   * primera versión de GFH y midió 103 peticiones HTTP en una sola pantalla.
   */
  @Get()
  async obtener(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', IdPacientePipe) pacienteId: string,
  ) {
    // El paciente de demostración se responde de memoria: no está en la base y
    // su id no es un uuid, así que la ruta tampoco puede validarlo como tal.
    if (esDelDemo(pacienteId)) {
      const d = this.demo.obtenerCockpit();
      if (!d) throw new NotFoundException('Paciente no encontrado.');
      return {
        paciente: d.paciente,
        prescripciones: d.prescripciones,
        dashboard: d.conteoPorCategoria,
        hallazgos: d.hallazgos,
        avisos: d.avisos,
        condicionesEfectivas: d.condicionesEfectivasCodigos,
        /** La app lo usa para bloquear todo lo que actúa sobre este paciente. */
        esDemostracion: true,
      };
    }

    await this.acceso.exigirSuscripcion(medicoId, 'Ver el cockpit de tus pacientes');
    const r = await this.cockpit.evaluar(medicoId, pacienteId);

    return {
      paciente: r.paciente,
      prescripciones: r.prescripciones,
      dashboard: r.conteoPorCategoria,
      hallazgos: r.hallazgos,
      avisos: r.avisos,
      condicionesEfectivas: r.condicionesEfectivasCodigos,
    };
  }

  /**
   * El contexto crudo del paciente, para que el móvil lo guarde y pueda correr
   * el mismo motor localmente sin señal (modo offline, exclusivo de cuentas
   * con suscripción vigente por los guards de este controller). Nunca se
   * llama para el paciente de demostración: no tiene sentido cachearlo, ya
   * vive en memoria del servidor.
   */
  @Get('contexto-offline')
  async obtenerContextoOffline(
    @MedicoActual() medicoId: string,
    @Param('pacienteId', IdPacientePipe) pacienteId: string,
  ) {
    if (esDelDemo(pacienteId)) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    await this.acceso.exigirSuscripcion(medicoId, 'Guardar este paciente para verlo sin conexión');
    const contexto = await this.repositorioOffline.cargarContexto(medicoId, pacienteId);
    if (!contexto) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    return {
      ...contexto,
      paciente: {
        ...contexto.paciente,
        fechaNacimiento: contexto.paciente.fechaNacimiento.toISOString(),
        clcrMedidoAt: contexto.paciente.clcrMedidoAt?.toISOString() ?? null,
      },
      gruposAlergenicos: [...contexto.gruposAlergenicos.entries()],
      ajustesRenales: [...contexto.ajustesRenales.entries()],
      ajustesHepaticos: [...contexto.ajustesHepaticos.entries()],
      curaciones: [...contexto.curaciones.entries()],
    };
  }
}
