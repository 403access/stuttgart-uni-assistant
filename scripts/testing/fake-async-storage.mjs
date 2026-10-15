/**
 * In-memory test double for `@react-native-async-storage/async-storage`
 * (same promise API subset the app uses). Redirected to by
 * `resolve-hook.mjs` in tests.
 */

const store = new Map();

export default {
  async setItem(key, value) {
    store.set(String(key), String(value));
  },
  async getItem(key) {
    const value = store.get(String(key));
    return value === undefined ? null : value;
  },
  async removeItem(key) {
    store.delete(String(key));
  },
  async getAllKeys() {
    return [...store.keys()];
  },
  /** Test-only reset between suites. */
  __clear() {
    store.clear();
  },
};
