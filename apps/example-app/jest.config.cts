/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  coverageDirectory: "../../coverage/apps/example-app",
  displayName: "@io-app-it-wallet/example-app",
  moduleFileExtensions: ["ts", "js", "html", "tsx", "jsx"],
  moduleNameMapper: {
    "[.]svg$": "@nx/expo/plugins/jest/svg-mock",
  },
  passWithNoTests: true,
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  transform: {
    "[.][jt]sx?$": [
      "babel-jest",
      {
        configFile: __dirname + "/.babelrc.js",
      },
    ],
    "^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$":
      require.resolve("jest-expo/src/preset/assetFileTransformer.js"),
  },
};
