import { describe, expect, it } from "vitest";
import { changerStatut, indicateursFiges, phaseSuivante, phasesTerminees, rapportVide, rubriques, rubriquesVides } from "./rapports";

const PHASES = ["Définition des objectifs", "Étude du projet", "Réalisation", "Clôture"];

describe("rapports de phase et de clôture", () => {
  it("propose une trame de rubriques selon le type de rapport", () => {
    const r = rapportVide({ id: "r1", projetId: "p", type: "Phase", phase: "Étude du projet", date: "2027-02-01", preremplissage: { finances: "Budget tenu." } });
    expect(r.titre).toBe("Rapport de phase – Étude du projet");
    expect(r.sections.map((s) => s.cle)).toEqual(rubriques("Phase").map((x) => x.cle));
    expect(r.sections.find((s) => s.cle === "finances")?.texte).toBe("Budget tenu.");
    expect(rapportVide({ id: "r2", projetId: "p", type: "Clôture", date: "2027-10-01" }).sections.some((s) => s.cle === "enseignements")).toBe(true);
  });

  it("n'admet à la revue qu'un rapport complet, ou déposé sous forme de document", () => {
    const r = rapportVide({ id: "r1", projetId: "p", type: "Phase", phase: "Réalisation", date: "2027-02-01" });
    expect(() => changerStatut(r, "En revue")).toThrow(/Rubriques à compléter/);
    expect(rubriquesVides({ ...r, documentUrl: "https://exemple.sharepoint.com/rapport.pdf" })).toEqual([]);
    const complet = { ...r, sections: r.sections.map((s) => ({ ...s, texte: "Rédigé." })) };
    const soumis = changerStatut(complet, "En revue", { Atterrissage: 100 });
    expect(soumis).toMatchObject({ statut: "En revue", indicateurs: { Atterrissage: 100 } });
    expect(changerStatut(soumis, "Validé").statut).toBe("Validé");
    expect(() => changerStatut(changerStatut(soumis, "Validé"), "Brouillon")).toThrow();
    expect(changerStatut(changerStatut(soumis, "Refusé"), "Brouillon").statut).toBe("Brouillon");
  });

  it("fige les indicateurs du projet", () => {
    const i = indicateursFiges({ budgetInitial: 1, budgetApprouve: 1_000_000.4, engage: 600_000, realise: 400_000, paye: 0, atterrissage: 1_050_000, atterrissageDefavorable: 0 }, { avancement: 41.6, retards: 2, risquesOuverts: 5, risquesCritiques: 1, completude: 80, date: "2027-02-01" });
    expect(i).toMatchObject({ "Budget approuvé": 1_000_000, "Écart": -50_000, "Avancement (%)": 42, "Indice de complétude (%)": 80 });
  });

  it("déduit les phases terminées et la phase suivante", () => {
    expect(phasesTerminees(PHASES, "Réalisation")).toEqual(["Définition des objectifs", "Étude du projet"]);
    expect(phasesTerminees(PHASES, "Définition des objectifs")).toEqual([]);
    expect(phasesTerminees(PHASES, undefined)).toEqual([]);
    expect(phasesTerminees(PHASES, "Clôture", true)).toEqual(PHASES);
    expect(phaseSuivante(PHASES, "Étude du projet")).toBe("Réalisation");
    expect(phaseSuivante(PHASES, "Clôture")).toBeUndefined();
    expect(phaseSuivante(PHASES, undefined)).toBe("Définition des objectifs");
  });
});
