import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PacientesService } from '../aplicacion/pacientes/pacientes.service';
import { DemoService } from '../aplicacion/demo/demo.service';
import { AccesoService } from '../aplicacion/suscripcion/acceso.service';
import { esDelDemo, ID_PACIENTE_DEMO } from '../aplicacion/demo/paciente-demo';
import { DePago } from './comun/requiere-suscripcion';
import { EventosService } from '../aplicacion/historial/eventos.service';
import { Cuerpo } from './comun/cuerpo';
import { IdPacientePipe } from './comun/id-paciente.pipe';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { ActualizarPacienteDto, CrearGrupoDto, CrearPacienteDto } from './dto/paciente.dto';

@Controller()
@UseGuards(JwtGuard)
export class PacientesController {
  constructor(
    @Inject(PacientesService) private readonly pacientes: PacientesService,
    @Inject(EventosService) private readonly eventos: EventosService,
    @Inject(DemoService) private readonly demo: DemoService,
    @Inject(AccesoService) private readonly acceso: AccesoService,
  ) {}

  /**
   * El historial del paciente, del hecho más nuevo al más viejo.
   *
   * `antesDe` es la fecha del último evento que el cliente ya tiene, no un
   * número de página: la lista crece por arriba y con `skip` el médico vería
   * repetido lo que ya leyó si registra algo mientras scrollea.
   */
  @DePago('El historial del paciente')
  @Get('pacientes/:id/historial')
  historial(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('antesDe') antesDe?: string,
  ) {
    return this.eventos.listar(medicoId, id, { antesDe });
  }

  /** Pantalla de Inicio: grupos con sus pacientes + los que no tienen grupo. */
  /**
   * Inicio. Sin suscripción devuelve SÓLO el paciente de demostración.
   *
   * Los pacientes propios no se borran ni se filtran de la base: se dejan de
   * servir. Si el médico se suscribe vuelven a aparecer tal cual estaban.
   */
  @Get('inicio')
  async inicio(@MedicoActual() medicoId: string, @Query('q') q?: string) {
    if (await this.acceso.tieneSuscripcion(medicoId)) {
      return this.pacientes.inicio(medicoId, q);
    }

    const fila = this.demo.obtenerFila();
    const grupo = this.demo.obtenerGrupo();
    return {
      pacientes: fila ? [fila] : [],
      grupos: grupo ? [grupo] : [],
      buscando: false,
      /** La app usa esto para saber que no puede crear ni editar. */
      soloDemostracion: true,
    };
  }

  @Post('pacientes')
  @DePago('Crear un paciente')
  crear(@MedicoActual() medicoId: string, @Cuerpo(CrearPacienteDto) dto: CrearPacienteDto) {
    return this.pacientes.crear(medicoId, dto);
  }

  /**
   * El id del demo no es un uuid, así que la ruta no puede validarlo como tal:
   * se acepta cualquier string y se decide adentro.
   */
  @Get('pacientes/:id')
  async obtener(@MedicoActual() medicoId: string, @Param('id', IdPacientePipe) id: string) {
    if (esDelDemo(id)) {
      const c = this.demo.obtenerCockpit();
      if (!c) throw new NotFoundException('Paciente no encontrado.');
      return c.paciente;
    }
    await this.acceso.exigirSuscripcion(medicoId, 'Ver tus pacientes');
    return this.pacientes.obtener(medicoId, id);
  }

  @Patch('pacientes/:id')
  @DePago('Editar un paciente')
  actualizar(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(ActualizarPacienteDto) dto: ActualizarPacienteDto,
  ) {
    return this.pacientes.actualizar(medicoId, id, dto);
  }

  @Delete('pacientes/:id')
  @HttpCode(204)
  @DePago('Eliminar un paciente')
  eliminar(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.pacientes.eliminar(medicoId, id);
  }

  @Post('grupos')
  @DePago('Crear un grupo')
  crearGrupo(@MedicoActual() medicoId: string, @Cuerpo(CrearGrupoDto) dto: CrearGrupoDto) {
    return this.pacientes.crearGrupo(medicoId, dto.nombre);
  }

  @DePago('Renombrar un grupo')
  @Patch('grupos/:id')
  renombrarGrupo(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(CrearGrupoDto) dto: CrearGrupoDto,
  ) {
    return this.pacientes.renombrarGrupo(medicoId, id, dto.nombre);
  }

  @DePago('Eliminar un grupo')
  @Delete('grupos/:id')
  @HttpCode(204)
  eliminarGrupo(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.pacientes.eliminarGrupo(medicoId, id);
  }
}
