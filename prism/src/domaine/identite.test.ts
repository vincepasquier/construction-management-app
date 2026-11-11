import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Le moteur financier a été vérifié au franc près sur un projet réel dans Chantier+. Tant que
// plateforme/ existe, PRISM doit en utiliser une copie strictement identique : toute évolution du
// calcul se décide explicitement, en retirant le fichier concerné de cette liste.
const FICHIERS = ["budget.ts", "finance.ts", "sia451.ts", "importSuiviFinancier.ts", "importFactures.ts"];

describe("moteur repris de Chantier+", () => {
  it.each(FICHIERS)("%s est identique à l'original", (f) => {
    const prism = readFileSync(new URL(`./lib/${f}`, import.meta.url), "utf8");
    const origine = readFileSync(new URL(`../../../plateforme/src/lib/${f}`, import.meta.url), "utf8");
    expect(prism).toBe(origine);
  });
});
