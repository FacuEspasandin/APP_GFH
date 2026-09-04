import { Text, View } from 'react-native';

import { enOraciones, type ClaveSeccion } from '@gfh/shared-types';

import { Icono, type NombreIcono } from '@/ui/iconos';
import { useColores } from '@/ui/tema';

/**
 * Las piezas de la monografía: el índice y el texto de una sección.
 *
 * Toda la pantalla usa UN solo color de acento —el primario— y ninguno de la
 * escala clínica. La tentación era pintar «Contraindicaciones» de rojo, pero
 * el rojo en esta app significa que hay un riesgo PARA ESTE PACIENTE, y acá no
 * hay paciente: es el texto descriptivo del fármaco. Un rojo decorativo en una
 * lista que no cruzó nada contra nadie enseña al ojo a desconfiar del rojo que
 * sí importa.
 */

/** El ícono de cada sección. Vive acá y no en `shared-types` porque el
 *  servidor no tiene por qué conocer el inventario de íconos de la app. */
export const ICONO_SECCION: Record<ClaveSeccion, NombreIcono> = {
  posologia: 'capsula',
  interacciones: 'interacciones',
  contraindicaciones: 'prohibido',
  precauciones: 'alerta',
  embarazo: 'embarazo',
  lactancia: 'lactancia',
  reaccionesAdversas: 'pulso',
  usos: 'check',
  descripcion: 'info',
};

/**
 * El ícono en su cuadrado.
 *
 * El cuadrado existe para que el ícono tenga peso en una lista de nueve filas:
 * suelto se pierde contra el texto y no ayuda a encontrar la sección de un
 * vistazo, que es para lo único que está.
 */
export function SelloSeccion({
  clave,
  grande = false,
}: {
  clave: ClaveSeccion;
  grande?: boolean;
}) {
  const col = useColores();
  const lado = grande ? 44 : 34;

  return (
    <View
      style={{
        width: lado,
        height: lado,
        borderRadius: grande ? 12 : 9,
        backgroundColor: col.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icono nombre={ICONO_SECCION[clave]} tamano={grande ? 22 : 17} color={col.primary} />
    </View>
  );
}

// --- el texto de una sección -------------------------------------------------

/**
 * Una oración que tiene forma de «Etiqueta: a, b, c».
 *
 * Es la forma en que la fuente escribe las interacciones —«Disminuyen su
 * eficacia: diuréticos tiazídicos, verapamilo, corticoides…»— y no es prosa:
 * es una lista con título. Mostrarla como un renglón corrido obliga a leerla
 * entera para saber si el fármaco que uno busca está adentro; con el título
 * arriba y los ítems separados, se busca con la vista.
 *
 * El corte pide dos puntos seguidos de espacio, un título de menos de 70
 * caracteres y al menos dos comas en la cola. Sin esas tres condiciones,
 * «Insuf. renal: ajustar dosis» —que es una oración normal— también se
 * partiría.
 */
const CON_LISTA = /^(.{4,70}?):\s+(.+?)\.?$/;

function comoLista(oracion: string): { titulo: string; items: string[] } | null {
  const m = CON_LISTA.exec(oracion);
  if (!m) return null;

  const [, titulo, cola] = m;
  if (titulo!.includes('.')) return null; // «por ej. X: y» no es un título

  // La cola se parte por comas y por el « y » final, que es como se enumera en
  // castellano. Los paréntesis se respetan: «(por ej, a, b)» es UN ítem.
  const items = partirEnumeracion(cola!);
  return items.length >= 3 ? { titulo: titulo!.trim(), items } : null;
}

/** Parte «a, b (x, y) y c» en tres, sin romper adentro de los paréntesis. */
function partirEnumeracion(cola: string): string[] {
  const partes: string[] = [];
  let actual = '';
  let profundidad = 0;

  for (const ch of cola) {
    if (ch === '(') profundidad++;
    else if (ch === ')') profundidad = Math.max(0, profundidad - 1);

    if (ch === ',' && profundidad === 0) {
      partes.push(actual);
      actual = '';
    } else {
      actual += ch;
    }
  }
  partes.push(actual);

  return partes
    .flatMap((p) => p.split(/\s+y\s+(?![^(]*\))/))
    .map((p) => p.trim().replace(/\.$/, ''))
    .filter((p) => p.length > 0);
}

/**
 * El texto de una sección, abierto para que se lea.
 *
 * Dos formas y no una: las oraciones sueltas van como renglones con su punto
 * al margen —una lista de condiciones se recorre así— y las que tienen forma
 * de «título: enumeración» se abren en título y fichas. La fuente mezcla las
 * dos en el mismo campo, así que la pantalla también.
 */
export function TextoSeccion({ texto }: { texto: string }) {
  const col = useColores();
  const oraciones = enOraciones(texto);

  return (
    <View className="gap-2.5">
      {oraciones.map((oracion, i) => {
        const lista = comoLista(oracion);

        if (lista) {
          return (
            <View
              key={i}
              className="rounded-card border border-line bg-surface px-3.5 py-3"
            >
              <Text className="text-fila font-medio leading-5 text-ink">{lista.titulo}</Text>
              <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                {lista.items.map((item, j) => (
                  <View
                    key={j}
                    className="rounded px-2 py-1"
                    style={{ backgroundColor: col.paper }}
                  >
                    <Text className="font-sans text-meta leading-4 text-ink">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        }

        return (
          <View key={i} className="flex-row rounded-card bg-surface px-3.5 py-3">
            <View
              className="mr-3 mt-2 rounded-full"
              style={{ width: 5, height: 5, backgroundColor: col.primary, opacity: 0.55 }}
            />
            <Text className="font-sans flex-1 text-body leading-6 text-ink">{oracion}</Text>
          </View>
        );
      })}
    </View>
  );
}
