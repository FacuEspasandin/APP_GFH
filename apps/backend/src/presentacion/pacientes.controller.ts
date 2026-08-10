import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PacientesService } from '../aplicacion/pacientes/pacientes.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { ActualizarPacienteDto, CrearGrupoDto, CrearPacienteDto } from './dto/paciente.dto';

@Controller()
@UseGuards(JwtGuard)
export class PacientesController {
  constructor(@Inject(PacientesService) private readonly pacientes: PacientesService) {}

  /** Pantalla de Inicio: grupos con sus pacientes + los que no tienen grupo. */
  @Get('inicio')
  inicio(@MedicoActual() medicoId: string, @Query('q') q?: string) {
    return this.pacientes.inicio(medicoId, q);
  }

  @Post('pacientes')
  crear(@MedicoActual() medicoId: string, @Cuerpo(CrearPacienteDto) dto: CrearPacienteDto) {
    return this.pacientes.crear(medicoId, dto);
  }

  @Get('pacientes/:id')
  obtener(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.pacientes.obtener(medicoId, id);
  }

  @Patch('pacientes/:id')
  actualizar(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(ActualizarPacienteDto) dto: ActualizarPacienteDto,
  ) {
    return this.pacientes.actualizar(medicoId, id, dto);
  }

  @Delete('pacientes/:id')
  @HttpCode(204)
  eliminar(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.pacientes.eliminar(medicoId, id);
  }

  @Post('grupos')
  crearGrupo(@MedicoActual() medicoId: string, @Cuerpo(CrearGrupoDto) dto: CrearGrupoDto) {
    return this.pacientes.crearGrupo(medicoId, dto.nombre);
  }

  @Patch('grupos/:id')
  renombrarGrupo(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(CrearGrupoDto) dto: CrearGrupoDto,
  ) {
    return this.pacientes.renombrarGrupo(medicoId, id, dto.nombre);
  }

  @Delete('grupos/:id')
  @HttpCode(204)
  eliminarGrupo(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.pacientes.eliminarGrupo(medicoId, id);
  }
}
