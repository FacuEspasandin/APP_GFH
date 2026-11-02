import { Platform } from 'react-native';

/**
 * Cómo se llama la tienda de ESTE teléfono.
 *
 * Los textos hablaban de «App Store o Google Play» en todos lados. En un
 * iPhone, nombrar Google Play es referirse a otra plataforma —Apple lo marca en
 * la revisión (guideline 2.3.10)— y además no le sirve a quien lee: la
 * suscripción se gestiona en la tienda del aparato que tiene en la mano.
 */
export function nombreDeLaTienda(): 'App Store' | 'Google Play' {
  return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
}

/**
 * Dónde se compró, para mostrar en el estado de la suscripción.
 *
 * Si coincide con la tienda de este teléfono, se nombra. Si no (alguien que
 * compró en Android y abre la cuenta en un iPhone), no se nombra la otra: se
 * dice que es de otra plataforma y que se gestiona desde allí.
 */
export function tiendaDeLaCompra(store?: string | null): string | null {
  if (!store) return null;
  const aqui = Platform.OS === 'ios' ? 'APP_STORE' : 'PLAY_STORE';
  return store === aqui ? nombreDeLaTienda() : 'Otra plataforma';
}
