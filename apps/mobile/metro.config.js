const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const raizProyecto = __dirname;
const raizMonorepo = path.resolve(raizProyecto, '../..');

const config = getDefaultConfig(raizProyecto);

// Monorepo: Metro tiene que mirar los paquetes del workspace (@gfh/shared-types)
// y resolver desde los dos node_modules.
config.watchFolders = [raizMonorepo];
config.resolver.nodeModulesPaths = [
  path.resolve(raizProyecto, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Web de desarrollo: módulos que sólo existen en nativo se reemplazan por un stub.
// No afecta a iOS ni a Android.
const resolverPorDefecto = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, nombre, plataforma) => {
  if (plataforma === 'web' && nombre === 'react-native-pager-view') {
    return { type: 'sourceFile', filePath: path.resolve(raizProyecto, 'web-stubs/pager-view.js') };
  }
  return (resolverPorDefecto ?? contexto.resolveRequest)(contexto, nombre, plataforma);
};

module.exports = withNativeWind(config, { input: './global.css' });
