// In-memory stand-in for @react-native-async-storage/async-storage.
//
// The shared api.js module reads the auth token through AsyncStorage on every
// request. Offline tests have no React Native runtime, so the resolver hook
// redirects the real package here. The GPS guide endpoints are public and send
// no token, so an empty store is the honest equivalent of a visitor who has
// never logged in.
const store = new Map();

export default {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, value);
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
};