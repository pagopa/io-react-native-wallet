import pagopa from "@pagopa/eslint-config/jest";

export default [
  {
    // Only lint TypeScript sources, matching the previous `--ext .ts,.tsx` scope.
    ignores: ["src/client/generated/**/*", "lib/**/*", "**/*.js", "**/*.jsx"],
  },
  ...pagopa,
];
