import js from "@eslint/js";
import security from "eslint-plugin-security";

export default [
  {
    ignores: [
      "node_modules/**",
      ".scannerwork/**"
    ]
  },
  js.configs.recommended,
  {
    plugins: {
      security
    },
    rules: {
      ...security.configs.recommended.rules,
      "no-eval": "error",
      "no-unused-vars": "error",
      "eqeqeq": "error"
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly"
      }
    }
  }
];