// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // eslint-config-expo's own resolver (eslint-import-resolver-node) doesn't
    // understand the "@/*" tsconfig path alias, only plain node_modules/relative
    // resolution — it happens to work for most files only because a non-suffixed
    // sibling exists too. It breaks for files that ONLY exist as platform variants
    // (e.g. googleAuth.native.ts / googleAuth.web.ts, no plain googleAuth.ts) —
    // eslint-import-resolver-typescript reads tsconfig paths/moduleSuffixes correctly.
    settings: {
      'import/resolver': {
        typescript: {
          extensions: [
            '.native.ts', '.native.tsx',
            '.ios.ts', '.ios.tsx',
            '.android.ts', '.android.tsx',
            '.web.ts', '.web.tsx',
            '.ts', '.tsx', '.d.ts', '.js', '.jsx',
          ],
        },
      },
    },
  },
]);
