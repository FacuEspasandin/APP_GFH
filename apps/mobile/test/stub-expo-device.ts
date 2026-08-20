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
