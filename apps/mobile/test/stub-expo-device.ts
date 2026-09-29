/**
 * `expo-device` lee el modelo y el sistema del teléfono: fuera de él, nada.
 *
 * Los valores van en `null` a propósito y no con un modelo inventado: es
 * exactamente lo que devuelve en web y en un emulador incompleto, así que los
 * tests ejercitan el camino de «no hay dato», que es el que puede romper.
 */
export const modelName: string | null = null;
export const osName: string | null = null;
export const osVersion: string | null = null;
export const deviceName: string | null = null;

/** Los mismos valores que el enum real de `expo-device`. Sin dato, `deviceType`
 *  es `null`, que es lo que devuelve en web. */
export const DeviceType = { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } as const;
export const deviceType: number | null = null;
