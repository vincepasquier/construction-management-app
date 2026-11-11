import { describe, expect, it } from "vitest";
import { donneesDemo } from "../data/demo";
import { calculerBudget, totaux } from "../lib/budget";
import { consolider, rapprochement, sante, syntheseDe } from "./synthese";
import type { ReleveSource } from "./types";

const releve = (extra: Partial<ReleveSource> = {}): ReleveSource => ({
  id: "r", projetId: "p", systeme: "Source", date: "2026-11-01T00:00:00Z", budgetInitial: 1000, budgetApprouve: 1200, engage: 700, realise: 500, paye: 400, parAnnee: {}, ...extra,
});

describe("synthèse financière", () => {
  it("mode synthèse : la source fait foi, l'atterrissage vient de la source, sinon de la saisie, sinon du budget", () => {
    const source = syntheseDe({ mode: "synthese", releve: releve({ atterrissage: 1300 }) });
    expect(source).toMatchObject({ budgetApprouve: 1200, atterrissage: 1300, ecart: -100 });
    expect(source.origines.atterrissage).toBe("source");

    const saisi = syntheseDe({ mode: "synthese", releve: releve(), atterrissagesSaisis: [
      { id: "a1", projetId: "p", date: "2026-09-01", montant: 1150, commentaire: "Ancien" },
      { id: "a2", projetId: "p", date: "2026-10-15", montant: 1250, commentaire: "Hausse des prix" },
    ] });
    expect(saisi).toMatchObject({ atterrissage: 1250, commentaireAtterrissage: "Hausse des prix" });
    expect(saisi.origines).toMatchObject({ budgetApprouve: "source", atterrissage: "saisie" });

    expect(syntheseDe({ mode: "synthese", releve: releve() })).toMatchObject({ atterrissage: 1200, ecart: 0 });
    expect(syntheseDe({ mode: "synthese" })).toMatchObject({ vide: true, budgetApprouve: 0 });
  });

  it("mode positions : reprend exactement les totaux du moteur par position", () => {
    const d = donneesDemo();
    const par = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId === "prj-1");
    const positions = {
      budget: par(d.budget), lots: par(d.lots), contrats: par(d.contrats), factures: par(d.factures), facturesHorsCommande: par(d.facturesHorsCommande),
      offres: par(d.offres), ajustements: par(d.ajustements), mutations: par(d.mutations), appelsOffres: par(d.appelsOffres),
    };
    const t = totaux(calculerBudget(positions));
    const s = syntheseDe({ mode: "positions", positions, releve: releve({ budgetApprouve: t.revise - 5000 }) });
    expect(s).toMatchObject({ budgetInitial: t.initial, budgetApprouve: t.revise, engage: t.engage, realise: t.facture, atterrissage: t.atterrissage, ecart: t.ecart });
    expect(s.origines.atterrissage).toBe("calcul");
    expect(rapprochement(s)[0]).toMatchObject({ champ: "Budget approuvé", ecart: 5000 });
  });

  it("consolide les sous-projets sans additionner le total de contrôle du parent", () => {
    const parent = syntheseDe({ mode: "synthese", releve: releve({ budgetApprouve: 2000, realise: 900 }) });
    const e1 = syntheseDe({ mode: "synthese", releve: releve({ budgetApprouve: 800, realise: 300, engage: 400 }) });
    const e2 = syntheseDe({ mode: "synthese", releve: releve({ budgetApprouve: 1200, realise: 500, engage: 600, atterrissage: 1260 }) });
    const c = consolider(parent, [e1, e2]);
    expect(c).toMatchObject({ budgetApprouve: 2000, realise: 800, engage: 1000, atterrissage: 2060, consolidee: true });
    expect(c.origines.atterrissage).toBe("calcul");
    expect(consolider(parent, [])).toBe(parent);
  });

  it("déduit la santé du dépassement prévu et des retards", () => {
    const seuils = { surveiller: 0, critique: 5 };
    expect(sante({ ecartPct: 2, vide: false }, 0, seuils)).toBe("bon");
    expect(sante({ ecartPct: -1, vide: false }, 0, seuils)).toBe("alerte");
    expect(sante({ ecartPct: -6, vide: false }, 0, seuils)).toBe("mauvais");
    expect(sante({ ecartPct: 0, vide: false }, 3, seuils)).toBe("mauvais");
    expect(sante({ ecartPct: -50, vide: true }, 0, seuils)).toBe("bon");
  });

  it("mode positions sans position budgétaire : les valeurs de la source tiennent lieu de synthèse, sans double compte", () => {
    const vide = { budget: [], lots: [], contrats: [], factures: [], facturesHorsCommande: [], offres: [], ajustements: [], mutations: [], appelsOffres: [] };
    const parent = syntheseDe({ mode: "positions", positions: vide, releve: releve({ budgetApprouve: 3000 }) });
    expect(parent).toMatchObject({ mode: "positions", budgetApprouve: 3000, vide: false });
    expect(parent.origines.budgetApprouve).toBe("source");
    expect(syntheseDe({ mode: "positions", positions: vide })).toMatchObject({ budgetApprouve: 0, vide: true });
    // Le total de la source pour le parent ne s'ajoute pas à celui de ses sous-projets
    const enfants = [syntheseDe({ mode: "positions", positions: vide, releve: releve({ budgetApprouve: 1200 }) }), syntheseDe({ mode: "positions", positions: vide, releve: releve({ budgetApprouve: 1700 }) })];
    expect(consolider(parent, enfants)).toMatchObject({ budgetApprouve: 2900, consolidee: true });
  });
});
