/**
 * Config de Expo que se calcula al construir. `app.json` sigue siendo la fuente;
 * esto sólo ajusta lo que depende del perfil de build de EAS.
 *
 * Lo único que hace hoy: en los builds que se instalan fuera de un simulador
 * (`preview` y `production`) saca la excepción de red local de App Transport
 * Security. `NSAllowsLocalNetworking` existe para que el build de desarrollo
 * hable con el backend de la máquina (`http://192.168.x.x`), y en un build de
 * tienda es una puerta abierta que Apple pregunta para qué sirve (guideline
 * 2.1 / 1.6). Esos perfiles hablan con la API por HTTPS, así que no la necesitan.
 *
 * `EAS_BUILD_PROFILE` lo define EAS durante el build. Sin él (Metro en local,
 * `expo start`) no se toca nada.
 */
const PERFILES_DE_TIENDA = new Set(['preview', 'production']);

module.exports = ({ config }) => {
  const perfil = process.env.EAS_BUILD_PROFILE;
  if (!perfil || !PERFILES_DE_TIENDA.has(perfil)) return config;

  const infoPlist = { ...(config.ios?.infoPlist ?? {}) };
  delete infoPlist.NSAppTransportSecurity;

  return { ...config, ios: { ...config.ios, infoPlist } };
};
