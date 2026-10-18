// Metro resolves `../config/gps` to `../config/gps.js`. Node's ESM resolver does
// not, so pure modules can only be imported in tests once this hook is
// registered. It also redirects the one native module the shared api.js needs,
// since there is no React Native runtime outside a device.
//
// This changes nothing about how the app itself bundles.
const ASYNC_STORAGE_STUB = new URL('./stubs/async-storage.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@react-native-async-storage/async-storage') {
    return { url: ASYNC_STORAGE_STUB, shortCircuit: true, format: 'module' };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      try {
        return await nextResolve(`${specifier}.js`, context);
      } catch {
        // fall through to the original error
      }
    }
    throw err;
  }
}