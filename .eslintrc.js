module.exports = {
  root: true,
  extends: ["@react-native", "prettier"],
  plugins: ["prettier", "jest"],
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
