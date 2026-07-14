import pagopa from "@pagopa/eslint-config/jest";

export default [
  ...pagopa,
  {
    // Only lint TypeScript sources, matching the previous `--ext .ts,.tsx` scope.
    ignores: [
      "src/client/generated/**/*",
      "lib/**/*",
      "**/*.js",
      "**/*.jsx",
      "**/babel.config.*",
      "**/jest.config.js",
      "**/metro.config.js",
      "**/react-native.config.js",
    ],
    rules: {
      // START: OVERWRITTEN RULES FROM PAGOPA/ESLINT-CONFIG
      //
      // Converting `type = {}` to `interface {}` breaks assignability to
      // `Record<string, unknown>` — TypeScript requires an explicit index
      // signature on interfaces, whereas type aliases satisfy it structurally.
      // This affects analytics helpers, navigation param lists, and any other
      // type used as a generic record argument throughout the codebase.
      "@typescript-eslint/consistent-type-definitions": "off",

      // Allow `_`-prefixed throwaways and rest-sibling destructuring omits
      // (`const { key, ...rest } = obj`), matching tsc's own noUnusedLocals.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Tests have long setup/assertion blocks thus the 200 line limit from @pagopa/eslint-config is too strict.
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
];
