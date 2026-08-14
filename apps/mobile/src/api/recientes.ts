import { useCallback, useEffect, useState } from 'react';

import { marcarUsada } from '@/dominio/recientes';
import { guardar, leer } from './almacen';

/**
 * Las herramientas usadas hace poco, guardadas en el teléfono.
 *
 * Guarda **claves de herramienta y nada más** — ni valores ni datos de ningún
 * paciente. Las herramientas sueltas siguen sin guardar la consulta; lo que se
 * recuerda es haber entrado, que es lo que permite ofrecerlas de nuevo.
 *
 * No va al backend: es una preferencia de este teléfono, no del médico. Mandarla
 * al servidor obligaría a un endpoint, una migración y una decisión de
 * privacidad, a cambio de sincronizar un atajo entre dispositivos.
 */
const CLAVE = 'gfh.herramientasRecientes';

async function leerLista(): Promise<string[]> {
  const crudo = await leer(CLAVE);
  if (!crudo) return [];
  try {
    const v = JSON.parse(crudo) as unknown;
    // Se valida la forma porque el dato es del disco: una versión vieja o un
    // valor a medio escribir no puede tirar la pantalla de herramientas.
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useRecientes() {
  const [recientes, setRecientes] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    void leerLista().then((l) => {
      if (vivo) setRecientes(l);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Se llama al ABRIR la herramienta, no al volver.
   *
   * El estado se actualiza antes de que termine la escritura: la lista es un
   * atajo, y esperar al disco para navegar sería pagar latencia por un adorno.
   */
  const usar = useCallback((clave: string) => {
    setRecientes((antes) => {
      const nueva = marcarUsada(antes, clave);
      void guardar(CLAVE, JSON.stringify(nueva));
      return nueva;
    });
  }, []);

  return { recientes, usar };
}
