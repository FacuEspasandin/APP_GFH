import { useQuery } from '@tanstack/react-query';

import type { Campos } from '@/dominio/busqueda';
import { api } from './cliente';

/**
 * El catálogo, entero y en el teléfono.
 *
 * Se baja una vez y se busca local. Medido contra la base real, una consulta
 * por tecla cuesta ~390 ms y da igual escribir «i» (542 coincidencias) que
 * «pirac» (2): el tiempo es la ida y vuelta a São Paulo, no la consulta. Con el
 * catálogo acá, cada tecla vale cero, el buscador arranca en la primera letra y
 * además anda sin señal.
 *
 * Son 163 KB para 638 productos. La pestaña ya se los bajaba igual, en dieciséis
 * peticiones paginadas, para poder listar el catálogo A-Z.
 */

export interface ProductoResumen {
  id: string;
  nombreComercial: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  dosisTexto: string | null;
  esGenerico: boolean;
  principiosActivos: string[];
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
}

/**
 * Por dónde se busca un producto.
 *
 * El nombre comercial es lo que se muestra y lo que ordena; el principio activo
 * y el laboratorio encuentran sin mostrarse. Es lo que hace que «amoxicilina»
 * encuentre «Amoxidal», que es como busca un médico que sabe la droga y no la
 * marca.
 *
 * Vive acá, al lado del tipo que describe, para que agregar un campo al
 * resumen y olvidarse de que se puede buscar por él sea una sola lectura.
 */
export const POR_PRODUCTO: Campos<ProductoResumen> = {
  nombre: (p) => p.nombreComercial,
  tambien: (p) => [...p.principiosActivos, p.laboratorio ?? ''],
};

export interface PrincipioActivoResumen {
  id: string;
  nombre: string;
  grupoTerapeutico: string | null;
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
}

/**
 * Cuánto vale la copia local antes de volver a pedirla.
 *
 * El catálogo clínico cambia cuando se siembra, o sea casi nunca: una hora es
 * conservador. `gcTime` más largo que `staleTime` para que volver a la pestaña
 * no muestre un esqueleto por algo que ya está en memoria.
 */
const UNA_HORA = 60 * 60_000;

export function useIndiceProductos() {
  return useQuery({
    queryKey: ['catalogo-indice'],
    queryFn: () => api.get<ProductoResumen[]>('/catalogo/productos/indice'),
    staleTime: UNA_HORA,
    gcTime: 24 * UNA_HORA,
  });
}

/**
 * Los principios activos, para las pantallas que los piden por nombre.
 *
 * `habilitado` porque no lo necesita el arranque: son 91 KB que sólo hacen
 * falta en las herramientas y al cargar una alergia farmacológica. Bajarlos al
 * abrir la app sería pagar por algo que la mayoría de las sesiones no usa.
 */
export function useIndicePrincipiosActivos(habilitado = true) {
  return useQuery({
    queryKey: ['principios-activos-indice'],
    queryFn: () => api.get<PrincipioActivoResumen[]>('/catalogo/principios-activos/indice'),
    enabled: habilitado,
    staleTime: UNA_HORA,
    gcTime: 24 * UNA_HORA,
  });
}
