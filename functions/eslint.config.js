/**
 * ESLint flat config for Firebase Functions (this directory only).
 * This file ensures that when "npm run lint" runs from the functions folder
 * during firebase deploy, ESLint uses this config instead of the root
 * eslint.config.js, which ignores "functions/**" and would leave nothing to lint.
 */
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", { allowTemplateLiterals: true }],
    },
  },
];
