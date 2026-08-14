import { Controller, Get, Inject, NotFoundException, Param, UseGuards } from '@nestjs/common';

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
  constructor(
    @Inject(CockpitService) private readonly cockpit: CockpitService,
    @Inject(DemoService) private readonly demo: DemoService,
    @Inject(AccesoService) private readonly acceso: AccesoService,
  ) {}

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
}
