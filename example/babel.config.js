const path = require("path");

const pak = require("../package.json");

module.exports = function (api) {
  api.cache(false); // Required by react-native-dotenv to make babel detect changes in .env file
  return {
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            buffer: "@craftzdog/react-native-buffer",
            crypto: "react-native-quick-crypto",
            [pak.name]: path.join(__dirname, "..", pak.source),
            stream: "readable-stream",
          },
          extensions: [".tsx", ".ts", ".js", ".json"],
        },
      ],
      ["module:react-native-dotenv"],
      "react-native-reanimated/plugin",
    ],
    presets: ["module:@react-native/babel-preset"],
  };
};
