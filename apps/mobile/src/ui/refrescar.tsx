import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { useColores } from './tema';

/**
 * Deslizar hacia abajo para volver a pedir los datos.
 *
 * Una sola pieza para todas las pantallas: el indicador, la vibración al soltar y
 * el estado «refrescando» salen de acá, y cada pantalla sólo dice QUÉ vuelve a
 * pedir.
 *
 * Vibra al soltar y no al estirar: es el momento en que el médico decide
 * refrescar, y es una sola vez por gesto.
 */
export function ControlRefrescar({
  refrescando,
  onRefrescar,
}: {
  refrescando: boolean;
  onRefrescar: () => void;
}) {
  const col = useColores();
  return (
    <RefreshControl
      refreshing={refrescando}
      onRefresh={() => {
        hapticaSeleccion();
        onRefrescar();
      }}
      // El color del indicador es el de marca y no el de severidad: esto es cromo
      // de la app, no información clínica.
      tintColor={col.primary}
      colors={[col.primary]}
    />
  );
}

/**
 * Qué se vuelve a pedir al deslizar: las consultas con esas claves, las que
 * estén en pantalla. `invalidateQueries` coincide por prefijo, así que
 * `['cockpit', id]` alcanza al cockpit de ese paciente y `['inicio']` a la lista
 * de pacientes y a la de grupos.
 *
 * Devuelve las dos cosas que necesita una pantalla: si está refrescando y la
 * función que lo dispara.
 */
export function useRefrescar(claves: readonly QueryKey[]): {
  refrescando: boolean;
  onRefrescar: () => void;
} {
  const cliente = useQueryClient();
  const [refrescando, setRefrescando] = useState(false);

  const onRefrescar = useCallback(() => {
    setRefrescando(true);
    void Promise.all(claves.map((queryKey) => cliente.invalidateQueries({ queryKey })))
      .catch(() => {
        // Sin señal el error ya se ve en la propia consulta; acá sólo hay que
        // apagar el indicador.
      })
      .finally(() => setRefrescando(false));
    // `claves` se arma en cada render con los mismos valores: depender de la
    // identidad del arreglo volvería a crear la función en cada uno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, JSON.stringify(claves)]);

  return { refrescando, onRefrescar };
}
