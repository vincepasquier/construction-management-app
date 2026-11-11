import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Le mode « artefact » (npm run artefact) produit l'application en une page et deux fichiers, sans
// serveur ni adresse absolue, pour la publier comme artefact claude.ai. Voir src/app/hote.ts.

/** La publication d'un artefact refuse le caractère U+FFFD écrit tel quel (une bibliothèque en contient) : il est échappé. */
const echapperRemplacement = {
  name: "prism-echapper-u-fffd",
  generateBundle(_options: unknown, lot: Record<string, { type: string; code?: string }>) {
    for (const fichier of Object.values(lot)) if (fichier.type === "chunk" && fichier.code) fichier.code = fichier.code.replaceAll("\uFFFD", "\\uFFFD");
  },
};

export default defineConfig(({ mode }) => {
  const artefact = mode === "artefact";
  return {
    base: artefact ? "./" : "/",
    define: { __ARTEFACT__: JSON.stringify(artefact) },
    plugins: [react(), tailwindcss(), ...(artefact ? [echapperRemplacement] : [])],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    build: artefact
      ? { outDir: "dist-artefact", modulePreload: false, rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: "prism.js", assetFileNames: "prism[extname]" } } }
      : {},
    server: {
      port: 5173,
      proxy: { "/api": "http://localhost:8787" },
    },
    test: {
      environment: "node",
      // Les tests de composants et de stockage déclarent eux-mêmes « @vitest-environment jsdom »
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
