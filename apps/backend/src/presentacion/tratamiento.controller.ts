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

import { CatalogoService } from '../aplicacion/catalogo/catalogo.service';
import { HerramientasService } from '../aplicacion/herramientas/herramientas.service';
import { TratamientoService } from '../aplicacion/tratamiento/tratamiento.service';
import { Cuerpo } from './comun/cuerpo';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { SuscripcionGuard } from './comun/suscripcion.guard';
import {
  ActualizarPrescripcionDto,
  AgregarAlergiaDto,
  AgregarCondicionDto,
  CrearPrescripcionDto,
  DatosHepaticosDto,
  DatosRenalesDto,
  HerramientaCondicionAlergiaDto,
  HerramientaHepaticaDto,
  HerramientaInteraccionesDto,
  HerramientaRenalDto,
} from './dto/tratamiento.dto';

@Controller()
@UseGuards(JwtGuard, SuscripcionGuard)
export class TratamientoController {
  constructor(@Inject(TratamientoService) private readonly tratamiento: TratamientoService) {}

  @Post('pacientes/:id/prescripciones')
  crear(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(CrearPrescripcionDto) dto: CrearPrescripcionDto,
  ) {
    return this.tratamiento.crearPrescripcion(medicoId, pacienteId, dto);
  }

  @Patch('prescripciones/:id')
  actualizar(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(ActualizarPrescripcionDto) dto: ActualizarPrescripcionDto,
  ) {
    return this.tratamiento.actualizarPrescripcion(medicoId, id, dto);
  }

  @Delete('prescripciones/:id')
  @HttpCode(204)
  eliminar(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tratamiento.eliminarPrescripcion(medicoId, id);
  }

  @Post('pacientes/:id/condiciones')
  agregarCondicion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(AgregarCondicionDto) dto: AgregarCondicionDto,
  ) {
    return this.tratamiento.agregarCondicion(medicoId, pacienteId, dto);
  }

  @Delete('pacientes/:id/condiciones/:condicionId')
  @HttpCode(204)
  quitarCondicion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Param('condicionId', new ParseUUIDPipe()) condicionId: string,
  ) {
    return this.tratamiento.quitarCondicion(medicoId, pacienteId, condicionId);
  }

  @Post('pacientes/:id/alergias')
  agregarAlergia(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(AgregarAlergiaDto) dto: AgregarAlergiaDto,
  ) {
    return this.tratamiento.agregarAlergia(medicoId, pacienteId, dto);
  }

  @Delete('alergias/:id')
  @HttpCode(204)
  quitarAlergia(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tratamiento.quitarAlergia(medicoId, id);
  }

  @Patch('pacientes/:id/datos-hepaticos')
  datosHepaticos(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(DatosHepaticosDto) dto: DatosHepaticosDto,
  ) {
    return this.tratamiento.actualizarDatosHepaticos(medicoId, id, dto);
  }

  @Patch('pacientes/:id/datos-renales')
  datosRenales(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(DatosRenalesDto) dto: DatosRenalesDto,
  ) {
    return this.tratamiento.actualizarDatosRenales(medicoId, pacienteId, dto);
  }
}

@Controller('catalogo')
@UseGuards(JwtGuard)
export class CatalogoController {
  constructor(@Inject(CatalogoService) private readonly catalogo: CatalogoService) {}

  @Get('productos')
  productos(@Query('q') q?: string, @Query('desde') desde?: string) {
    if (q && q.length >= 2) return this.catalogo.buscarProductos(q);
    return this.catalogo.listarProductos(Number(desde ?? 0));
  }

  /** Antes que `productos/:id`: si no, `conteo` se parsea como un UUID. */
  @Get('productos/conteo')
  conteoProductos() {
    return this.catalogo.conteoProductos();
  }

  @Get('productos/:id')
  ficha(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.fichaProducto(id);
  }

  @Get('principios-activos')
  principiosActivos(@Query('q') q?: string) {
    return this.catalogo.buscarPrincipiosActivos(q ?? '');
  }

  @Get('principios-activos/:id/similares')
  similares(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.similares(id);
  }

  @Get('condiciones')
  condiciones() {
    return this.catalogo.condiciones();
  }

  @Get('grupos-alergenicos')
  grupos() {
    return this.catalogo.gruposAlergenicos();
  }
}

/** Las 4 herramientas. No escriben nada: puro cálculo sin estado. */
@Controller('herramientas')
@UseGuards(JwtGuard)
export class HerramientasController {
  constructor(@Inject(HerramientasService) private readonly herramientas: HerramientasService) {}

  @Post('interacciones')
  @HttpCode(200)
  interacciones(@Cuerpo(HerramientaInteraccionesDto) dto: HerramientaInteraccionesDto) {
    return this.herramientas.interacciones(dto);
  }

  @Post('condicion-alergia')
  @HttpCode(200)
  condicionAlergia(@Cuerpo(HerramientaCondicionAlergiaDto) dto: HerramientaCondicionAlergiaDto) {
    return this.herramientas.condicionAlergia(dto);
  }

  @Post('ajuste-renal')
  @HttpCode(200)
  ajusteRenal(@Cuerpo(HerramientaRenalDto) dto: HerramientaRenalDto) {
    return this.herramientas.ajusteRenal(dto);
  }

  @Post('ajuste-hepatico')
  @HttpCode(200)
  ajusteHepatico(@Cuerpo(HerramientaHepaticaDto) dto: HerramientaHepaticaDto) {
    return this.herramientas.ajusteHepatico(dto);
  }
}
