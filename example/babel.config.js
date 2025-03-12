const path = require("path");
const pak = require("../package.json");

module.exports = function (api) {
  api.cache(false); // Required by react-native-dotenv to make babel detect changes in .env file
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".tsx", ".ts", ".js", ".json"],
          alias: {
            [pak.name]: path.join(__dirname, "..", pak.source),
          },
        },
      ],
      ["module:react-native-dotenv"],
      "react-native-reanimated/plugin",
    ],
  };
};
