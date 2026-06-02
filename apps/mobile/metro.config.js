const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo root and shared packages
config.watchFolders = [workspaceRoot];

// Resolve modules from workspace root first, then project root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Fall back to workspace root node_modules for any module not found locally.
// Required for HMR entry-point registration in monorepos (Metro resolves the
// entry as a relative ./node_modules/ path which bypasses nodeModulesPaths).
config.resolver.extraNodeModules = new Proxy(
  { '@shared': path.resolve(workspaceRoot, 'packages/shared/src') },
  {
    get: (target, name) => {
      if (name in target) return target[name];
      return path.join(workspaceRoot, `node_modules/${String(name)}`);
    },
  }
);

module.exports = withNativeWind(config, { input: './global.css' });
