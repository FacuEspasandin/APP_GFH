import { useEffect, useState } from 'react';

/**
 * El valor, unos milisegundos después de que dejó de cambiar.
 *
 * Para búsquedas: sin esto, "amoxicilina" son once consultas al servidor de
 * las que sólo importa la última, y las diez anteriores igual vuelven y
 * repintan la lista con resultados de un texto que el médico ya terminó de
 * escribir.
 *
 * 250 ms está por encima del ritmo de tipeo normal y por debajo de lo que se
 * percibe como demora.
 */
export function useValorDemorado<T>(valor: T, ms = 250): T {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    const reloj = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(reloj);
  }, [valor, ms]);

  return demorado;
}
