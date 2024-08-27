const path = require("path");
const pak = require("../package.json");

const dependencies = {
  [pak.name]: {
    root: path.join(__dirname, ".."),
  },
};

module.exports = {
  dependencies: {
    ...dependencies,
    "@pagopa/react-native-cie": {
      platforms: {
        android: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
  },
  assets: ["./assets/fonts"],
};
