// ESLint flat config — pragmatic set: JS/TS recommended + React hooks, no stylistic noise.
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const reactHooks = require("eslint-plugin-react-hooks");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      "dist/**",
      "**/dist/**",
      "coverage/**",
      "**/coverage/**",
      "e2e/**/*.snap",
      "*.min.js",
      ".npm-cache/**",
      ".pnpm-store/**",
      ".superdesign/**",
      ".sd-drafts/**",
      "data/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { sourceType: "commonjs", parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-require-imports": "off", // CJS config files use require()
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // tseslint recommended already enables @typescript-eslint/no-unused-vars;
      // silence the base rule to avoid duplicate reports.
      "no-unused-vars": "off",
      // Pragmatic relaxations (not stylistic):
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // New (v7) react-compiler rule: the codebase uses standard mount-time data-load
      // effects (useEffect(() => load(), [])), a legitimate pattern. Keep the classic
      // rules-of-hooks + exhaustive-deps; opt out of this opinionated one.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Test files mock untyped external boundaries (Express req/res, Nest services).
    // `any` is the right tool there — don't pollute source-file strictness with it.
    files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
];
