// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // The assistant server is plain Node (no bundler): expose its globals to ESLint.
    files: ["server/**/*.mjs"],
    languageOptions: { globals: require("globals").node },
  },
  {
    ignores: ["dist/*"],
  }
]);
