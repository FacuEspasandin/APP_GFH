import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/api/cliente';
import type { AlertaFicha, ClaveRestriccion, Restriccion, TablaRenalFicha } from '@/dominio/restricciones';
import type { SeveridadInteraccion } from '@gfh/shared-types';

/**
 * La ficha de un producto del catálogo. Libre para cualquiera.
 *
 * Trae lo que un vademécum gratuito ya da —composición, presentación, familia
 * alergénica— más el ESTADO de cada restricción y una glosa de una línea. Con
 * eso alcanza para saber si hay algo que mirar.
 *
 * Lo que NO trae es el detalle: los tramos de la escala renal, el texto de cada
 * alerta, con qué fármacos interactúa. Eso llega por `useDetalleRestriccion`,
 * que descuenta una de las diez consultas del plan gratis. Si viniera todo acá
 * el límite no se podría aplicar del lado del servidor y esconderlo en la app
 * sería maquillaje.
 */
export interface Ficha {
  id: string;
  nombreComercial: string;
  esGenerico: boolean;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  dosisTexto: string | null;
  principiosActivos: Array<{
    id: string;
    nombre: string;
    grupoTerapeutico: string | null;
    codigoATC: string | null;
  }>;
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
  /** Las cuatro tarjetas, ya resueltas por el backend. */
  restricciones: Restriccion[];
  /** De las interacciones sólo lo que dibuja la fila: cuántas y cuán graves. */
  interacciones: { total: number; peorSeveridad: SeveridadInteraccion | null };
  monografia: null;
}

export function useFicha(id: string | undefined) {
  return useQuery({
    queryKey: ['ficha', id],
    queryFn: () => api.get<Ficha>(`/catalogo/productos/${id}`),
    enabled: Boolean(id),
  });
}

// --- el detalle, que consume cupo --------------------------------------------

export interface CupoRestante {
  usadas: number;
  total: number;
  agotado: boolean;
}

/** Lo que devuelve el detalle: sólo los campos de SU herramienta. */
export interface DetalleRestriccion {
  herramienta: 'INTERACCIONES' | 'RENAL' | 'HEPATICO' | 'EMBARAZO' | 'LACTANCIA';
  tablasRenales?: TablaRenalFicha[];
  tablasHepaticas?: Array<{ clase: string; texto: string | null; severidad?: string }>;
  alertas?: AlertaFicha[];
  gruposInteraccion?: Array<{
    severidad: SeveridadInteraccion;
    texto: string;
    familias: Array<{ nombre: string; miembros: string[] }>;
    sueltos: string[];
    total: number;
  }>;
  total?: number;
  /** `null` con suscripción, o mientras no corresponda avisar. */
  cupo: CupoRestante | null;
}

export type ClaveDetalle = ClaveRestriccion | 'interacciones';

/**
 * El detalle de UNA restricción.
 *
 * Es `POST` porque tiene efecto: descuenta una consulta del plan gratis. Un GET
 * que escribe se rompe con el primer prefetch o reintento de la librería.
 *
 * Por eso también `retry: false` y `staleTime: Infinity`: reintentar un 403 no
 * lo va a convertir en 200, y refrescar al volver a la pantalla haría parecer
 * que se gasta cupo de nuevo. El backend no lo cobra dos veces —la cuenta es
 * por par (producto, herramienta)— pero el contador de la pantalla parpadearía.
 */
export function useDetalleRestriccion(id: string | undefined, clave: ClaveDetalle) {
  const cache = useQueryClient();

  const consulta = useQuery({
    queryKey: ['restriccion', id, clave],
    queryFn: () => api.post<DetalleRestriccion>(`/catalogo/productos/${id}/restricciones/${clave}`),
    enabled: Boolean(id),
    staleTime: Infinity,
    retry: false,
  });

  // El plan se cachea cinco minutos porque casi nunca cambia; esta petición es
  // justamente lo que lo cambia. Sin invalidarlo, el médico vuelve a la ficha y
  // el contador sigue diciendo el número anterior.
  const { isSuccess } = consulta;
  useEffect(() => {
    if (isSuccess) void cache.invalidateQueries({ queryKey: ['plan'] });
  }, [isSuccess, cache]);

  return consulta;
}
