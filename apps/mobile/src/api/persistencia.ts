import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Qué sobrevive a cerrar la app, y qué no.
 *
 * La caché de `react-query` vive en memoria: al cerrar la app se pierde todo y
 * al abrirla sin señal no hay nada que mostrar. Persistirla es el primer nivel
 * del modo offline —«que la app se pueda usar sin conexión»— y cubre la mayor
 * parte de lo que se siente como tal.
 *
 * **Pero no se persiste todo, y esto es lo importante.**
 *
 * El proyecto tiene `staleTime: 0` puesto a propósito: no tiene sentido servir
 * una versión vieja de un dato clínico. Guardar el cockpit en disco
 * contradice eso de frente — al abrir la app sin señal mostraría las
 * verificaciones de ayer con la misma cara que las de hoy, y el médico no
 * tendría cómo saber la diferencia. Eso es exactamente lo que la regla 5
 * prohíbe: no inferir, y no dejar que algo parezca actual cuando no lo es.
 *
 * Así que la línea es **dato de referencia contra dato de paciente**:
 *
 *   Se guarda      el catálogo de productos, los principios activos, las
 *                  fichas técnicas y las restricciones de un fármaco. Es
 *                  contenido publicado: la ficha de la warfarina de ayer y la
 *                  de hoy son la misma, y si cambia, cambia por una
 *                  importación que nosotros controlamos.
 *
 *   No se guarda   todo lo que cuelga de un paciente —cockpit, hallazgos,
 *                  historial, condiciones, alternativas, la lista de
 *                  pacientes— y lo que define el acceso —plan, suscripción,
 *                  sesiones—. Sin señal esas pantallas dicen que no hay
 *                  conexión, que es la verdad.
 *
 * Con esto, sin señal siguen andando el buscador, la ficha de cualquier
 * fármaco y sus restricciones. Que es, justamente, lo que un médico abre
 * parado en un pasillo.
 *
 * El nivel 2 —recalcular el cockpit en el teléfono— es otro trabajo, y arrastra
 * la decisión de mostrar la hora del cálculo. El nivel 3 —escribir sin señal—
 * está descartado.
 */

/**
 * AsyncStorage y no MMKV.
 *
 * MMKV es bastante más rápido, pero desde la v3 arrastra Nitro Modules —otro
 * runtime nativo— y acá se escribe una vez cada tanto, no en un bucle: la
 * diferencia no se nota y el riesgo sí. AsyncStorage lo mantiene Expo, corre
 * igual en las dos plataformas y no suma nada al build.
 *
 * Si algún día el catálogo entero vive en el teléfono y hay que leerlo en cada
 * tecla, ahí sí vale reconsiderarlo.
 */

/** Claves de consulta cuyo contenido es catálogo, no paciente. */
const DE_CATALOGO = new Set([
  'catalogo-indice',
  'principios-activos-indice',
  'ficha',
  'restriccion',
  'cond',
]);

/**
 * ¿Esta consulta se guarda en disco?
 *
 * Exportada para poder testearla: es una decisión clínica disfrazada de
 * detalle técnico, y una clave nueva que caiga del lado equivocado sin que
 * nadie lo note sería un cockpit viejo mostrado como actual.
 */
export function seGuarda(clave: readonly unknown[]): boolean {
  const primera = clave[0];
  return typeof primera === 'string' && DE_CATALOGO.has(primera);
}

export const persistidor = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'gfh-react-query',
});

/**
 * Cuánto vale lo guardado antes de tirarlo.
 *
 * Una semana. El catálogo se actualiza por importación, no solo, así que no
 * hay apuro; pero tampoco tiene sentido servir una ficha de hace un año si el
 * teléfono estuvo seis meses sin abrir la app.
 */
export const MS_MAXIMO = 7 * 24 * 60 * 60 * 1000;

export const opcionesDeshidratado = {
  shouldDehydrateQuery: (q: Query) => q.state.status === 'success' && seGuarda(q.queryKey),
};

/** Para «cerrar sesión»: lo bajado es del médico que lo bajó. */
export async function limpiarCache(): Promise<void> {
  await AsyncStorage.removeItem('gfh-react-query');
}
