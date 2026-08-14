import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/cliente';
import type { AlertaFicha, TablaRenalFicha } from '@/dominio/restricciones';
import type { SeveridadInteraccion } from '@gfh/shared-types';

/**
 * La ficha de un producto del catálogo.
 *
 * La comparten la pantalla del fármaco y las cinco que cuelgan de ella. Una
 * sola consulta con una sola `queryKey`: entrar a «Embarazo» y volver no vuelve
 * a pedir nada, y las seis pantallas no pueden mostrar datos distintos del
 * mismo fármaco.
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
  tablasRenales: TablaRenalFicha[];
  /** Alertas del catálogo por condición, no tablas de dosis. */
  embarazo: AlertaFicha[];
  lactancia: AlertaFicha[];
  interaccionesConocidas: Array<{
    conNombre: string;
    severidad: SeveridadInteraccion;
    texto: string;
  }>;
  /** Las mismas, agrupadas por regla y familia: es como se muestran. */
  gruposInteraccion: Array<{
    severidad: SeveridadInteraccion;
    texto: string;
    familias: Array<{ nombre: string; miembros: string[] }>;
    sueltos: string[];
    total: number;
  }>;
  monografia: null;
}

export function useFicha(id: string | undefined) {
  return useQuery({
    queryKey: ['ficha', id],
    queryFn: () => api.get<Ficha>(`/catalogo/productos/${id}`),
    enabled: Boolean(id),
  });
}
