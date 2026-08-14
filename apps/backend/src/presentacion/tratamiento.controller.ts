import {
  BadRequestException,
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
import { AccesoService } from '../aplicacion/suscripcion/acceso.service';
import { HERRAMIENTAS_FICHA } from '../aplicacion/suscripcion/herramientas-ficha';
import type { HerramientaFicha } from '@prisma/client';
import { Cuerpo } from './comun/cuerpo';
import { DePago } from './comun/requiere-suscripcion';
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

  @DePago('Agregar un fármaco')
  @Post('pacientes/:id/prescripciones')
  crear(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(CrearPrescripcionDto) dto: CrearPrescripcionDto,
  ) {
    return this.tratamiento.crearPrescripcion(medicoId, pacienteId, dto);
  }

  @DePago('Editar una prescripción')
  @Patch('prescripciones/:id')
  actualizar(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(ActualizarPrescripcionDto) dto: ActualizarPrescripcionDto,
  ) {
    return this.tratamiento.actualizarPrescripcion(medicoId, id, dto);
  }

  @DePago('Quitar un fármaco')
  @Delete('prescripciones/:id')
  @HttpCode(204)
  eliminar(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tratamiento.eliminarPrescripcion(medicoId, id);
  }

  @DePago('Agregar una condición')
  @Post('pacientes/:id/condiciones')
  agregarCondicion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(AgregarCondicionDto) dto: AgregarCondicionDto,
  ) {
    return this.tratamiento.agregarCondicion(medicoId, pacienteId, dto);
  }

  @DePago('Quitar una condición')
  @Delete('pacientes/:id/condiciones/:condicionId')
  @HttpCode(204)
  quitarCondicion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Param('condicionId', new ParseUUIDPipe()) condicionId: string,
  ) {
    return this.tratamiento.quitarCondicion(medicoId, pacienteId, condicionId);
  }

  @DePago('Agregar una alergia')
  @Post('pacientes/:id/alergias')
  agregarAlergia(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) pacienteId: string,
    @Cuerpo(AgregarAlergiaDto) dto: AgregarAlergiaDto,
  ) {
    return this.tratamiento.agregarAlergia(medicoId, pacienteId, dto);
  }

  @DePago('Quitar una alergia')
  @Delete('alergias/:id')
  @HttpCode(204)
  quitarAlergia(@MedicoActual() medicoId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tratamiento.quitarAlergia(medicoId, id);
  }

  @DePago('Cargar la función hepática de un paciente')
  @Patch('pacientes/:id/datos-hepaticos')
  datosHepaticos(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Cuerpo(DatosHepaticosDto) dto: DatosHepaticosDto,
  ) {
    return this.tratamiento.actualizarDatosHepaticos(medicoId, id, dto);
  }

  @DePago('Cargar la función renal de un paciente')
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
  constructor(
    @Inject(CatalogoService) private readonly catalogo: CatalogoService,
    @Inject(AccesoService) private readonly acceso: AccesoService,
  ) {}

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

  /**
   * La ficha. Libre siempre: composición, presentación, familia alergénica y
   * el ESTADO de cada restricción —«evitar», «ajustar», «sin datos»— pero no
   * el detalle.
   *
   * El estado es lo que un vademécum gratuito ya da. Lo que se paga, o se
   * gasta del cupo, es el detalle: en qué trimestre, cuánto ajustar, con qué
   * interactúa.
   */
  @Get('productos/:id')
  ficha(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.fichaProducto(id);
  }

  /**
   * El detalle de UNA restricción de un producto.
   *
   * Está separado de la ficha porque es lo que consume cupo. Si estuviera todo
   * en la misma respuesta, el límite no se podría aplicar del lado del
   * servidor: la app ya tendría los cinco detalles en la mano y esconderlos
   * sería puro maquillaje.
   *
   * Es `POST` y no `GET` a propósito: tiene efecto —descuenta una consulta—, y
   * un GET que escribe se rompe con el primer prefetch o reintento.
   */
  @Post('productos/:id/restricciones/:herramienta')
  @HttpCode(200)
  async detalleRestriccion(
    @MedicoActual() medicoId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('herramienta') herramienta: string,
  ) {
    const clave = herramienta.toUpperCase();
    if (!HERRAMIENTAS_FICHA.includes(clave as (typeof HERRAMIENTAS_FICHA)[number])) {
      throw new BadRequestException('Restricción desconocida.');
    }

    await this.acceso.consumirConsulta(medicoId, id, clave as HerramientaFicha);

    const ficha = await this.catalogo.fichaProducto(id);
    const cupo = await this.acceso.estadoCupo(medicoId);

    // Se devuelve sólo lo de esta herramienta: mandar las cinco haría que una
    // consulta pagara por las otras cuatro.
    const detalle =
      clave === 'INTERACCIONES'
        ? { gruposInteraccion: ficha.gruposInteraccion, total: ficha.interaccionesConocidas.length }
        : clave === 'RENAL'
          ? { tablasRenales: ficha.tablasRenales }
          : clave === 'HEPATICO'
            ? { tablasHepaticas: [] }
            : clave === 'EMBARAZO'
              ? { alertas: ficha.embarazo }
              : { alertas: ficha.lactancia };

    return { herramienta: clave, ...detalle, cupo };
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

  @DePago('Cruzar interacciones entre fármacos')
  @Post('interacciones')
  @HttpCode(200)
  interacciones(@Cuerpo(HerramientaInteraccionesDto) dto: HerramientaInteraccionesDto) {
    return this.herramientas.interacciones(dto);
  }

  @DePago('Cruzar un fármaco contra condiciones y alergias')
  @Post('condicion-alergia')
  @HttpCode(200)
  condicionAlergia(@Cuerpo(HerramientaCondicionAlergiaDto) dto: HerramientaCondicionAlergiaDto) {
    return this.herramientas.condicionAlergia(dto);
  }

  @DePago('Cruzar fármacos contra un clearance')
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
