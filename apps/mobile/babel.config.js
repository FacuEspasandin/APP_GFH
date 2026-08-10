module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Reanimated queda habilitado: desde SDK 57 viene la versión 4, que
          // trae `react-native-worklets` como paquete propio y con él el plugin
          // de Babel que antes faltaba. Hasta el SDK 52 esto tenía que estar en
          // `false` porque el plugin no existía y el bundle no compilaba.
        },
      ],
      'nativewind/babel',
    ],
  };
};
