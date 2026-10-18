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
    // Node-only scripts (run through tsx): resolve `../src/campus/db` to `db.ts`. The default
    // React Native extension order tries `.web.ts` first, which makes `import/no-duplicates`
    // think the native and web implementations imported side by side are the same module.
    files: ["scripts/**"],
    languageOptions: { globals: require("globals").node },
    settings: {
      "import/extensions": [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"],
      "import/resolver": {
        node: { extensions: [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"] },
        typescript: { extensions: [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"] },
      },
    },
  },
  {
    // Generated output only. `expo lint` lints just src/app/components, so list the rest
    // explicitly in the `lint` script; these ignores keep a bare `eslint .` usable too.
    ignores: ["dist/*", ".expo/*", "ios/*", "android/*", "docs-site/build/*", "docs-site/.docusaurus/*"],
  }
]);
