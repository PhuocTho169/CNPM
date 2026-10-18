// Local Expo entry point.
//
// package.json used "main": "expo/AppEntry.js". That file does
// `import App from '../../App'`, which is relative to wherever expo itself is
// installed — under a pnpm store that is
// node_modules/.pnpm/expo@…/node_modules/.pnpm/…/App, not this project. The
// bundler then cannot find the app root at all.
//
// Owning the entry here keeps that import relative to this folder, where it
// means what it says.
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);