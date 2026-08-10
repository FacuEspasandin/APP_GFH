import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  construirCatalogo,
  type CatalogoInteracciones,
} from '../../dominio/clinico/interacciones';
import { cargarReglasInteraccion, RUTA_REGLAS_POR_DEFECTO } from './cargar-reglas-interaccion';

/**
 * El catálogo de interacciones vive en memoria, cargado una sola vez al boot
 * (motor §1.7). Consultarlo después es gratis — es lo que permite resolver la
 * detección de un paciente sin una consulta por par.
 *
 * Si el archivo de reglas está mal, la app NO arranca. Es deliberado: un
 * catálogo a medias no falla con un error, falla mostrando menos interacciones
 * de las que hay.
 */
@Injectable()
export class CatalogoInteraccionesService implements OnModuleInit {
  private readonly logger = new Logger(CatalogoInteraccionesService.name);
  private catalogo: CatalogoInteracciones = new Map();

  onModuleInit(): void {
    const { reglas, listasSinUso } = cargarReglasInteraccion(RUTA_REGLAS_POR_DEFECTO);
    this.catalogo = construirCatalogo(reglas);

    this.logger.log(
      `Catálogo de interacciones: ${reglas.length} reglas → ${this.catalogo.size} pares`,
    );
    if (listasSinUso.length > 0) {
      this.logger.warn(`Listas declaradas y no usadas por ninguna regla: ${listasSinUso.join(', ')}`);
    }
  }

  obtener(): CatalogoInteracciones {
    return this.catalogo;
  }
}
