import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["public", "vendor", "node_modules", "tmp"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  prettier,
  {
    files: ["app/frontend/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
);
