/**
 * Lo mínimo de React Native para que los módulos de datos se puedan probar.
 *
 * `cliente.ts` sólo usa `Platform` —para resolver la URL base y el nombre del
 * dispositivo— pero importarlo arrastra el paquete entero, que no corre fuera
 * de un bundler de RN. Con este stub se puede probar la lógica de red, que es
 * donde viven el reintento de token y el corte por timeout.
 */
export const Platform = { OS: 'ios' as const, Version: '17.0' };
