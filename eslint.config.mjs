import nx from "@nx/eslint-plugin";
import pagopa from "@pagopa/eslint-config/jest";

export default [
  {
    ignores: [
      "**/src/client/generated/**/*",
      "**/lib/**/*",
      "**/*.js",
      "**/*.jsx",
      "**/babel.config.*",
      "**/jest.config.js",
      "**/metro.config.js",
      "**/react-native.config.js",
      "**/dist",
      "**/out-tsc",
    ],
  },
  ...pagopa,
  {
    plugins: {
      "@nx": nx,
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
          depConstraints: [
            {
              onlyDependOnLibsWithTags: ["*"],
              sourceTag: "*",
            },
          ],
          enforceBuildableLibDependency: true,
        },
      ],
    },
  },
  {
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.cts",
      "**/*.mts",
      "**/*.js",
      "**/*.jsx",
      "**/*.cjs",
      "**/*.mjs",
    ],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
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
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": [
        "error",
        {
          allow: ["\\.(png|jpg|jpeg|gif|webp)$"],
        },
      ],
    },
  },
];
