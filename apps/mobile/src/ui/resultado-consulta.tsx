import type { ReactNode } from 'react';

import { ErrorApi } from '@/api/cliente';
import { ErrorGenerico, SinConexion, Skeleton } from './estados-sistema';

/**
 * Envuelve el par cargando/error de una consulta.
 *
 * Existe para que la distinción entre "no hay internet" y "algo falló del otro
 * lado" se aplique en todas las pantallas y no sólo donde alguien se acordó.
 * La primera es accionable por el usuario; la segunda no, y mezclarlas hace que
 * el médico reintente en vano.
 */
export function ResultadoConsulta({
  cargando,
  error,
  onReintentar,
  filasSkeleton,
  children,
}: {
  cargando: boolean;
  error: unknown;
  onReintentar: () => void;
  filasSkeleton?: number;
  children: ReactNode;
}) {
  if (cargando) return <Skeleton filas={filasSkeleton} />;

  if (error) {
    if (error instanceof ErrorApi && error.esSinConexion) {
      return <SinConexion onReintentar={onReintentar} />;
    }
    return (
      <ErrorGenerico
        onReintentar={onReintentar}
        detalle={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return <>{children}</>;
}
