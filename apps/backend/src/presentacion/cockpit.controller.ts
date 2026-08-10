import { Controller, Get, Inject, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';

import { CockpitService } from '../aplicacion/cockpit/cockpit.service';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { SuscripcionGuard } from './comun/suscripcion.guard';

@Controller('pacientes/:pacienteId/cockpit')
@UseGuards(JwtGuard, SuscripcionGuard)
export class CockpitController {
  constructor(@Inject(CockpitService) private readonly cockpit: CockpitService) {}

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
    @Param('pacienteId', new ParseUUIDPipe()) pacienteId: string,
  ) {
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
