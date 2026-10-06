/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  coverageDirectory: "../../coverage/libs/io-react-native-wallet",
  displayName: "@io-app-it-wallet/io-react-native-wallet",
  moduleFileExtensions: ["ts", "js", "mjs", "html", "tsx", "jsx"],
  moduleNameMapper: {
    "[.]svg$": "@nx/expo/plugins/jest/svg-mock",
  },
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/out-tsc/", "<rootDir>/lib/"],
  transform: {
    "[.][cm]?[jt]sx?$": [
      "babel-jest",
      {
        configFile: __dirname + "/.babelrc.js",
      },
    ],
    "^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$":
      require.resolve("jest-expo/src/preset/assetFileTransformer.js"),
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@openid4vc|@pagopa|dcql|valibot))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
