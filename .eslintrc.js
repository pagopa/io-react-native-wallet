module.exports = {
  root: true,
  extends: ["@react-native", "prettier"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        singleQuote: false,
        tabWidth: 2,
        trailingComma: "es5",
        useTabs: false,
      },
    ],
  },
};
