import { describe, expect, it } from "vitest";
import { evaluerCompletude, type FaitsCompletude } from "./completude";
import type { CritereCompletude } from "./types";

const c = (regle: string, poids: number, axe: CritereCompletude["axe"] = "Qualité des données", actif = true): CritereCompletude => ({ id: regle, libelle: regle, axe, poids, regle, actif });
const CRITERES = [c("responsable", 1), c("champsObligatoires", 2), c("periodeRecente", 2), c("risquesRevus", 2), c("jalonsAJour", 1), c("mandatSigne", 3, "Documentaire"), c("rapportsPhase", 2, "Documentaire"), c("partiesPrenantes", 1, "Documentaire"), c("conditionsSuivies", 1, "Documentaire")];
const parfait: FaitsCompletude = { responsableDesigne: true, champsManquants: [], dernierePeriode: "2026-10", moisAttendu: "2026-10", risquesOuverts: 3, risquesNonRevus: 0, jalonsDepassesSansReel: 0, mandatSigne: true, phasesTerminees: ["Étude du projet"], phasesAvecRapport: ["Étude du projet"], partiesPrenantes: 4, conditionsEchues: 0, nonDemarre: false };

describe("indice de complétude", () => {
  it("vaut 100 quand tous les critères sont remplis", () => {
    const r = evaluerCompletude(CRITERES, parfait);
    expect(r.indice).toBe(100);
    expect(r.manquants).toEqual([]);
  });

  it("pondère les critères et distingue les deux axes", () => {
    const r = evaluerCompletude(CRITERES, { ...parfait, mandatSigne: false, champsManquants: ["sponsorId"] });
    // Poids total 15, manquent le mandat (3) et la fiche (2)
    expect(r.indice).toBe(67);
    expect(r.parAxe).toEqual({ Documentaire: 57, "Qualité des données": 75 });
    expect(r.manquants.map((m) => m.critere.regle)).toEqual(["champsObligatoires", "mandatSigne"]);
    expect(r.manquants[0].explication).toContain("sponsorId");
  });

  it("ne pénalise pas un critère sans objet", () => {
    const r = evaluerCompletude(CRITERES, { ...parfait, risquesOuverts: 0, risquesNonRevus: 0, phasesTerminees: [], phasesAvecRapport: [], dernierePeriode: undefined, nonDemarre: true });
    expect(r.indice).toBe(100);
    expect(r.criteres.filter((x) => x.sansObjet).map((x) => x.critere.regle)).toEqual(["periodeRecente", "risquesRevus", "rapportsPhase"]);
  });

  it("ignore les critères inactifs et les règles inconnues", () => {
    const r = evaluerCompletude([c("mandatSigne", 3, "Documentaire", false), c("inconnue", 5), c("responsable", 1)], { ...parfait, mandatSigne: false });
    expect(r.indice).toBe(100);
    expect(r.criteres).toHaveLength(2);
  });

  it("signale une période en retard, des risques non revus et des rapports manquants", () => {
    const r = evaluerCompletude(CRITERES, { ...parfait, dernierePeriode: "2026-08", risquesNonRevus: 2, phasesTerminees: ["Étude du projet", "Appel d'offres"], conditionsEchues: 1 });
    expect(r.manquants.map((m) => m.critere.regle)).toEqual(["periodeRecente", "risquesRevus", "rapportsPhase", "conditionsSuivies"]);
    expect(r.manquants[2].explication).toContain("Appel d'offres");
  });
});
