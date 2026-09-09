import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/**
 * RevenueCat: compra y estado de suscripción del lado del teléfono.
 *
 * Lo que este archivo NO hace: decidir si el médico tiene acceso. Esa
 * decisión sigue siendo 100% del backend (`/perfil/plan`, regla no
 * negociable 6) — acá sólo se arranca el SDK, se lo identifica con el
 * médico logueado, y se presenta la UI de compra/gestión que RevenueCat ya
 * resuelve. Después de comprar, quien usa este módulo tiene que refrescar
 * `usePlan()` y esperar a que el webhook llegue — nunca desbloquear algo
 * localmente a partir de `CustomerInfo`.
 *
 * `ENTITLEMENT_ID = 'premium'`: coincide con el fallback que ya tenía
 * `suscripcion.service.ts` en el backend (`entitlement_ids?.[0] ?? 'premium'`)
 * desde antes de que este SDK existiera. Es el mismo identificador que hay
 * que crear en el dashboard de RevenueCat — uno solo, porque la app tiene un
 * plan único (mensual/anual son el mismo entitlement, dos duraciones).
 */
export const ENTITLEMENT_ID = 'premium';

/**
 * Clave pública del SDK, una por tienda. NO es secreta —a diferencia del
 * header del webhook, que sí lo es y vive sólo en el backend— así que no hay
 * problema en que viaje en el bundle de la app; aun así entra por variable de
 * entorno, mismo criterio que `EXPO_PUBLIC_API_URL`, para no hardcodear un
 * valor de sandbox en el código fuente.
 */
function claveApi(): string | undefined {
  const especifica =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  return especifica ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

let configurado = false;

/**
 * Arranca el SDK. Se llama UNA vez, al boot de la app — antes de saber quién
 * es el médico: RevenueCat empieza anónimo y se identifica después con
 * `identificarEnRevenueCat`, que es el patrón que RevenueCat documenta para
 * apps con su propio login (no el de RevenueCat).
 *
 * Sin clave configurada no rompe el arranque, igual que `VISION_API_KEY` en
 * `foto.service.ts`: queda avisado y las compras simplemente no van a andar
 * hasta que se cargue la variable de entorno.
 */
export function configurarRevenueCat(): void {
  const apiKey = claveApi();
  if (!apiKey) {
    console.warn(
      '[RevenueCat] Sin API key (EXPO_PUBLIC_REVENUECAT_API_KEY). Las compras no van a funcionar.',
    );
    return;
  }

  void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  configurado = true;
}

/**
 * Identifica al SDK con el médico ya logueado. Mismo id que el backend
 * recibe como `app_user_id` en el webhook (`suscripcion.service.ts`) — sin
 * esto, la compra queda asociada a un usuario anónimo que el backend nunca
 * puede cruzar contra ningún `medicoId`.
 *
 * Se llama tanto después de un login/registro fresco como al restaurar una
 * sesión guardada al abrir la app — `Purchases.logIn` es seguro de llamar de
 * nuevo con el mismo id, no repite trabajo.
 */
export async function identificarEnRevenueCat(medicoId: string): Promise<void> {
  if (!configurado) return;
  try {
    await Purchases.logIn(medicoId);
  } catch (e) {
    console.warn('[RevenueCat] No se pudo identificar al médico', e);
  }
}

/** Al cerrar sesión: vuelve a anónimo, para que el próximo login no arrastre
 *  el estado de compra de quien usó este teléfono antes. */
export async function cerrarSesionRevenueCat(): Promise<void> {
  if (!configurado) return;
  try {
    await Purchases.logOut();
  } catch {
    // Nunca se identificó, o ya estaba anónimo — no es un error real.
  }
}

/**
 * Sólo para feedback optimista en pantalla (por ejemplo, mientras se espera
 * a que el webhook llegue después de una compra recién hecha). NUNCA se usa
 * para decidir si algo se habilita — eso lo sigue haciendo `/perfil/plan`.
 */
export async function tieneEntitlementActivo(): Promise<boolean> {
  if (!configurado) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export { PAYWALL_RESULT };

/**
 * Abre el paywall diseñado en el dashboard de RevenueCat (Paywalls), y no
 * uno propio: es precio/oferta, cambia sin tocar código, y la UI de compra,
 * error y restaurar ya viene resuelta.
 *
 * `presentPaywallIfNeeded` y no `presentPaywall` a secas: si el médico ya
 * tiene el entitlement activo —por ejemplo, tocó "Suscribirme" dos veces
 * seguidas antes de que la pantalla se cerrara— no vuelve a mostrar nada.
 */
export async function presentarPaywall(): Promise<PAYWALL_RESULT> {
  if (!configurado) return PAYWALL_RESULT.ERROR;
  return RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
}

/**
 * Centro de gestión de RevenueCat: cancelar, cambiar de plan, pedir reembolso
 * (iOS), o levantar una compra que no llegó a activarse. Reemplaza tener que
 * armar esas pantallas a mano — es exactamente lo que "Cancelar o cambiar de
 * plan se hace desde la tienda, no desde acá" (perfil.tsx) le pide al médico
 * hacer por su cuenta; esto lo hace posible sin salir de la app.
 */
export async function presentarCentroDeCliente(): Promise<void> {
  if (!configurado) return;
  await RevenueCatUI.presentCustomerCenter();
}
