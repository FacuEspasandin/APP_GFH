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

module.exports = withNativeWind(config, { input: './global.css' });
