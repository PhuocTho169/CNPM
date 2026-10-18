const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// pnpm workspace support.
//
// This repo installs apps/* through pnpm, which means real packages live under
// the store at <root>/node_modules/.pnpm and are reached via symlinks. Metro
// neither watches those directories nor follows the symlinks by default, so a
// stock config fails with "Unable to resolve module .../expo/AppEntry.js"
// even though the file is sitting right there.
//
// Three settings are needed together: watch the workspace root, tell the
// resolver where node_modules can live, and allow symlinked packages.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so the store and sibling packages are in scope.
config.watchFolders = [workspaceRoot];

// Resolution order for bare imports: this app's own deps first, then the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Follow pnpm's symlinks into .pnpm instead of treating them as unreadable.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;