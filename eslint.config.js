// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Plain-Node code (no bundler): the assistant server and the standalone
    // distribution service. Expose Node globals such as Buffer to ESLint.
    files: ["apps/server/**/*.mjs", "apps/dist/**/*.mjs", "tools/**/*.mjs"],
    languageOptions: { globals: require("globals").node },
  },
  {
    // Dashboard browser modules are served as-is by the assistant server.
    files: ["apps/admin/public/**/*.mjs"],
    languageOptions: { globals: { ...require("globals").browser } },
  },
  {
    // Node-only scripts (run through tsx): resolve `../src/campus/db` to `db.ts`. The default
    // React Native extension order tries `.web.ts` first, which makes `import/no-duplicates`
    // think the native and web implementations imported side by side are the same module.
    files: ["tools/**"],
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
    ignores: ["apps/mobile/dist/*", "apps/mobile/.expo/*", "apps/mobile/ios/*", "apps/mobile/android/*", "apps/dist/dist/*", "apps/admin/dist/*", "apps/docs/build/*", "apps/docs/.docusaurus/*", "node_modules/*"],
  }
]);
