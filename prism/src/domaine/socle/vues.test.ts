import { describe, expect, it } from "vitest";
import { agreger, parAnnee, total, type LigneProjet } from "./vues";

const l = (cle: string, budgetApprouve: number, atterrissage: number, sante: LigneProjet["sante"] = "bon"): LigneProjet => ({ cle, valeurs: { budgetApprouve, engage: budgetApprouve / 2, realise: budgetApprouve / 4, atterrissage }, sante });

describe("agrégats des vues de pilotage", () => {
  const lignes = [l("INF", 1000, 1100, "mauvais"), l("ENR", 3000, 2900), l("INF", 500, 500, "alerte")];
  it("regroupe et classe par budget", () => {
    const a = agreger(lignes);
    expect(a.map((x) => x.cle)).toEqual(["ENR", "INF"]);
    expect(a[1]).toMatchObject({ projets: 2, budgetApprouve: 1500, atterrissage: 1600, ecart: -100, critiques: 1, aSurveiller: 1, engage: 750, realise: 375 });
    expect(a[1].ecartPct).toBeCloseTo(-6.67, 1);
  });
  it("totalise l'ensemble", () => {
    expect(total(lignes)).toMatchObject({ projets: 3, budgetApprouve: 4500, atterrissage: 4500, ecart: 0, ecartPct: 0 });
    expect(total([])).toMatchObject({ projets: 0, ecartPct: 0 });
  });
  it("répartit le budget et le réalisé par année", () => {
    expect(parAnnee([{ parAnnee: { "2026": { budget: 10, realise: 4 }, "2027": { budget: 20, realise: 0 } } }, { parAnnee: { "2026": { budget: 5, realise: 5 } } }]))
      .toEqual([{ annee: "2026", budget: 15, realise: 9 }, { annee: "2027", budget: 20, realise: 0 }]);
  });
});
