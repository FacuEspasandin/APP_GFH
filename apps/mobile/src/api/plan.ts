import { useQuery } from '@tanstack/react-query';

import { api } from './cliente';

/**
 * Qué permite el plan del médico.
 *
 * El backend es la autoridad: `puedeCrearPaciente` sale de contar los
 * pacientes que ya tiene contra el límite del plan gratis, no de una marca en
 * la cuenta. La app usa esto sólo para no ofrecer lo que va a ser rechazado —
 * el límite real lo sigue aplicando la API.
 */
export interface Plan {
  vigente: boolean;
  pacientes: number;
  /** `null` cuando la suscripción está vigente: no hay tope. */
  limitePacientes: number | null;
  puedeCrearPaciente: boolean;
}

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
