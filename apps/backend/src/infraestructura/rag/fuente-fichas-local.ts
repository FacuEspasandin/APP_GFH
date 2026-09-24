import fs from 'node:fs';
import path from 'node:path';

import type { FichaCruda, FuenteFichas, SeccionFicha } from './fuente-fichas';

/** Las claves reales del JSON, en el orden en que interesa mostrarlas —
 *  `nombre` queda afuera porque no es una sección, es el identificador. */
const SECCIONES: Array<{ clave: string; titulo: string }> = [
  { clave: 'descripcion', titulo: 'Descripción' },
  { clave: 'usos', titulo: 'Usos' },
  { clave: 'posologia', titulo: 'Posología' },
  { clave: 'precauciones', titulo: 'Precauciones' },
  { clave: 'contraindicaciones', titulo: 'Contraindicaciones' },
  { clave: 'reaccionesAdversas', titulo: 'Reacciones adversas' },
  { clave: 'interacciones', titulo: 'Interacciones' },
  { clave: 'embarazo', titulo: 'Embarazo' },
  { clave: 'lactancia', titulo: 'Lactancia' },
];

interface FarmacoCrudo {
  nombre: string;
  [clave: string]: string | undefined;
}

/**
 * Lee las ~30 fichas de desarrollo. `PENDIENTE`: no va a producción sin
 * licencia de Farmanuario — ver `docs/11-motor-clinico-para-app-movil.md`.
 */
export class FuenteFichasLocal implements FuenteFichas {
  constructor(private readonly rutaArchivo: string) {}

  listarFichas(): FichaCruda[] {
    const contenido = JSON.parse(fs.readFileSync(this.rutaArchivo, 'utf8')) as {
      farmacos: FarmacoCrudo[];
    };

    return contenido.farmacos.map((f) => this.aFicha(f));
  }

  private aFicha(farmaco: FarmacoCrudo): FichaCruda {
    const secciones: SeccionFicha[] = SECCIONES.filter(
      ({ clave }) => typeof farmaco[clave] === 'string' && farmaco[clave]!.trim().length > 0,
    ).map(({ clave, titulo }) => ({ titulo, texto: farmaco[clave]! }));

    return { nombrePrincipioActivo: farmaco.nombre, secciones };
  }
}

export const RUTA_FICHAS_LOCAL_POR_DEFECTO = path.resolve(
  __dirname,
  '../../../prisma/datos/monografias-texto.json',
);

export function obtenerFuenteFichas(): FuenteFichas {
  return new FuenteFichasLocal(RUTA_FICHAS_LOCAL_POR_DEFECTO);
}
