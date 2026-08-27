const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Windows corta los nombres de archivo en 260 caracteres.
 *
 * El codegen de algunas librerías nativas —`react-native-keyboard-controller`
 * fue la primera— genera rutas de objeto más largas que eso, y el build muere
 * con `ninja: error: Filename longer than 260 characters`, que no se parece en
 * nada a su causa.
 *
 * Sacar el directorio de compilación de CMake a la raíz del disco recorta unos
 * 65 caracteres del prefijo y alcanza. Por defecto CMake escribe en
 * `android/app/.cxx/...`, que arranca con la ruta completa del proyecto.
 *
 * **Existe como plugin y no como una edición a mano** porque `android/` es
 * generada y está en `.gitignore`: un `prebuild` la regenera y se llevaría el
 * arreglo puesto a mano, dejando un build roto sin ninguna pista de por qué.
 *
 * Sólo aplica en Windows. En Linux y macOS —donde compila EAS— el límite no
 * existe, y ensuciar el disco con un directorio en la raíz no tendría sentido.
 *
 * Se puede sacar el día que la máquina tenga habilitadas las rutas largas:
 *   reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" ^
 *     /v LongPathsEnabled /t REG_DWORD /d 1 /f
 * ...y reiniciar. Eso lo arregla para siempre y para cualquier librería.
 */
module.exports = function rutasCortasWindows(config) {
  if (process.platform !== 'win32') return config;

  return withAppBuildGradle(config, (config) => {
    const gradle = config.modResults;

    if (gradle.contents.includes('buildStagingDirectory')) return config;

    gradle.contents = gradle.contents.replace(
      /^android \{/m,
      `android {
    // Puesto por plugins/rutas-cortas-windows.js — ver ahí el por qué.
    externalNativeBuild { cmake { buildStagingDirectory = file('C:/gfh-cxx') } }`,
    );

    return config;
  });
};
