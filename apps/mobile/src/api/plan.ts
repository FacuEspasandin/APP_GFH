import { useQuery } from '@tanstack/react-query';

import type { EstadoDelPlan } from '@/dominio/plan-gratis';
import { api } from './cliente';

/**
 * Qué permite el plan del médico.
 *
 * El backend es la autoridad: tanto `puedeCrearPaciente` como el cupo de
 * consultas se calculan allá. La app usa esto sólo para no ofrecer lo que va a
 * ser rechazado — el límite real lo sigue aplicando la API.
 *
 * La forma la define el dominio y no este archivo: es lo que deciden
 * `rutaHerramienta`, `textoCupo` y compañía, y tenerla escrita dos veces
 * llevaría a que una de las dos se quede vieja.
 */
export type Plan = EstadoDelPlan;

export function usePlan() {
  return useQuery({
    queryKey: ['plan'],
    queryFn: () => api.get<Plan>('/perfil/plan'),
    // Cambia sólo cuando el médico crea o borra un paciente, o cuando entra un
    // webhook de RevenueCat. Refrescarlo en cada foco haría un request de más
    // en cada navegación para un dato que casi nunca se mueve.
    staleTime: 5 * 60_000,
  });
}
