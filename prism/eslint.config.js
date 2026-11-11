import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "pret-a-lancer", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-globals": ["error", { name: "confirm", message: "Utiliser confirmer() de app/ui : les dialogues natifs sont bloqués dans certains contextes." }],
    },
  },
  {
    // Code repris à l'identique de plateforme/ : on ne le retouche pas pour le style
    files: ["src/domaine/lib/**", "src/domaine/data/**"],
    rules: { "@typescript-eslint/no-unused-vars": "off", "@typescript-eslint/no-explicit-any": "off", "prefer-const": "off", "no-empty": "off", "no-useless-escape": "off", "no-irregular-whitespace": "off" },
  },
);
