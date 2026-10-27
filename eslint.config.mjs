import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 ships a native flat config; FlatCompat crashes on it.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design mocks and their build scripts are not app code.
    ".impeccable/**",
    "prototype/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
      // ponytail: the legacy admin pages fetch in useEffect + setState (28 hits). They are rebuilt as
      // server components in MVP steps 2 and 9; these go back to "error" once that lands. New code must not use the pattern.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
]);

export default eslintConfig;
