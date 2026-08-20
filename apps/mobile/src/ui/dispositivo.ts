import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Qué sabe la app de dónde está corriendo.
 *
 * Vive acá y no repartido en las pantallas porque las tres respuestas —qué
 * versión, qué teléfono, qué sistema— salen de las mismas dos librerías y
 * tienen la misma trampa: **todo puede venir `null`**. En web no hay nada de
 * esto, en un emulador falta la mitad, y en un dispositivo viejo alguna
 * propiedad no existe. Cada función de abajo devuelve algo legible igual.
 */

/**
 * «1.0.2 (build 47)».
 *
 * Sale del paquete instalado, no de una constante en el código: la pantalla
 * «Acerca de» tenía la versión escrita a mano y se iba a quedar en 0.0.1 para
 * siempre. Son además los mismos números que ve la tienda, así que un reporte
 * de un médico se puede atar a un build exacto.
 */
export function versionApp(): string {
  const version = Application.nativeApplicationVersion;
  const build = Application.nativeBuildVersion;

  if (!version) return 'versión de desarrollo';
  return build ? `${version} (build ${build})` : version;
}

/** «Pixel 7», «iPhone 14 Pro». `null` cuando la plataforma no lo expone. */
export function modeloDispositivo(): string | null {
  return Device.modelName ?? null;
}

/** «Android 14», «iOS 18.2». */
export function sistemaOperativo(): string | null {
  const nombre = Device.osName ?? (Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : null);
  if (!nombre) return null;
  return Device.osVersion ? `${nombre} ${Device.osVersion}` : nombre;
}

/** «Pixel 7 · Android 14», o lo que haya de los dos. */
export function dondeCorre(): string | null {
  const partes = [modeloDispositivo(), sistemaOperativo()].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : null;
}

/**
 * Lo que se manda al servidor para identificar la sesión.
 *
 * **Se manda el MODELO y no el nombre del dispositivo.** `Device.deviceName`
 * suele ser «iPhone de Facundo» —el nombre que el dueño le puso— y eso es un
 * dato personal viajando al servidor sin ninguna necesidad: para distinguir dos
 * teléfonos en la lista de sesiones alcanza y sobra con «iPhone 14 Pro».
 *
 * El texto viejo era `ios · GFH 18`, que no identifica nada: con dos iPhones,
 * el médico no tenía forma de saber cuál estaba cerrando.
 */
export function infoDeSesion(): string {
  return dondeCorre() ?? `${Platform.OS} · GFH`;
}
