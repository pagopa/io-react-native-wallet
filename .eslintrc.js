module.exports = {
  root: true,
  extends: ["@react-native", "prettier"],
  plugins: ["prettier"],
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
    // Can be disabled when using React 17
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
  },
};
