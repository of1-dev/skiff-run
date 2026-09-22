const globals = require("globals");

module.exports = [
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ignores: ["node_modules/**", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        SkiffDebugGod: "readonly",
        SkiffWaypoints: "readonly",
        SkiffSkills: "readonly",
        SkiffCrew: "readonly",
        SkiffChartFind: "readonly",
        SkiffRoute: "readonly",
        SkiffTradeFog: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { "args": "none" }],
      "no-implicit-globals": "warn",
      "eqeqeq": ["error", "always", { "null": "ignore" }]
    }
  }
];
