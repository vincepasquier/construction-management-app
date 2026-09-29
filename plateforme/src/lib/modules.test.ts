import { describe, expect, it } from "vitest";
import { donneesDemo } from "../data/demo";
import type { CircuitValidation, Personne } from "../types";
import { annuler, attendDe, decider, etapeCourante, nouvelleVersion } from "./validations";
import { descendance, enfants, genererDepuisProjet } from "./organigramme";
import { parcoursMarche } from "./parcours";
import { accesDe, niveau, projetsAccessibles } from "./acces";
import { criticite, exposition, score } from "./risques";

const circuit = (): CircuitValidation => ({
  id: "v", projetId: "p", titre: "Plan", objet: { type: "Document" }, version: 1, demandeurId: "dem", statut: "En cours", dateCreation: "2026-09-01",
  etapes: [{ id: "a", personneId: "p1", statut: "En attente" }, { id: "b", personneId: "p2", statut: "En attente" }],
  historique: [],
});

describe("circuits de validation", () => {
  it("fait valider chaque personne à son tour, puis approuve le circuit", () => {
    let c = circuit();
    expect(attendDe(c, "p1")).toBe(true);
    expect(attendDe(c, "p2")).toBe(false);
    expect(() => decider(c, "p2", "Approuvé", "2026-09-02")).toThrow();
    c = decider(c, "p1", "Approuvé", "2026-09-02");
    expect(c.statut).toBe("En cours");
    expect(etapeCourante(c)?.personneId).toBe("p2");
    c = decider(c, "p2", "Approuvé", "2026-09-03");
    expect(c.statut).toBe("Approuvé");
    expect(etapeCourante(c)).toBeUndefined();
    expect(c.historique).toHaveLength(2);
  });

  it("renvoie au demandeur puis repart du début avec une nouvelle version", () => {
    let c = decider(circuit(), "p1", "Approuvé", "2026-09-02");
    c = decider(c, "p2", "Modifications demandées", "2026-09-03", "Compléter la légende");
    expect(c.statut).toBe("À corriger");
    expect(attendDe(c, "p1")).toBe(false);
    c = nouvelleVersion(c, "dem", "2026-09-04");
    expect(c.version).toBe(2);
    expect(c.statut).toBe("En cours");
    expect(c.etapes.every((e) => e.statut === "En attente")).toBe(true);
    expect(etapeCourante(c)?.personneId).toBe("p1");
  });

  it("gère refus et annulation", () => {
    expect(decider(circuit(), "p1", "Refusé", "2026-09-02", "Non conforme").statut).toBe("Refusé");
    expect(annuler(circuit(), "dem", "2026-09-02").statut).toBe("Annulé");
  });
});

describe("organigramme", () => {
  it("génère la structure depuis le projet : MO → DP → mandataires, direction des travaux, lots → entreprises", () => {
    const d = donneesDemo();
    const par = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId === "prj-1");
    const n = genererDepuisProjet(d.projets[0], par(d.lots), d.personnes, par(d.contrats), d.entreprises);
    const racines = enfants(n, undefined);
    expect(racines).toHaveLength(1);
    expect(racines[0].type).toBe("Maître d'ouvrage");
    const dp = enfants(n, racines[0].id)[0];
    expect(dp.personneId).toBe("per-1");
    const sousDP = enfants(n, dp.id);
    expect(sousDP.filter((x) => x.type === "Lot")).toHaveLength(4);
    expect(sousDP.some((x) => x.type === "Mandataire")).toBe(true);
    const lot2 = sousDP.find((x) => x.titre.startsWith("L2"))!;
    // Hydro-Réseaux SA a deux contrats sur le lot 2 : une seule case entreprise
    expect(enfants(n, lot2.id)).toHaveLength(1);
    expect(descendance(n, dp.id)).toHaveLength(n.length - 1);
  });
});

describe("parcours d'un marché", () => {
  const d = donneesDemo();
  it("situe un appel d'offres adjugé dont le contrat est en cours de facturation", () => {
    const ao = d.appelsOffres.find((a) => a.id === "ao-1")!;
    const c = d.contrats.find((x) => x.id === "ctr-1")!;
    const etapes = parcoursMarche(ao, c, d.factures);
    expect(etapes.filter((e) => e.etat === "fait").map((e) => e.id)).toEqual(["descriptif", "consultation", "offres", "adjudication", "contrat"]);
    expect(etapes.find((e) => e.etat === "actuel")?.id).toBe("facturation");
  });
  it("propose l'adjudication quand les offres sont reçues", () => {
    const ao = d.appelsOffres.find((a) => a.id === "ao-2")!;
    expect(parcoursMarche(ao, undefined, []).find((e) => e.etat === "actuel")?.id).toBe("adjudication");
  });
  it("marque les étapes d'appel d'offres sans objet pour un gré à gré", () => {
    const c = { ...d.contrats[0], appelOffresId: undefined, statut: "En préparation" as const };
    const etapes = parcoursMarche(undefined, c, []);
    expect(etapes.slice(0, 4).every((e) => e.etat === "sans-objet")).toBe(true);
    expect(etapes.find((e) => e.etat === "actuel")?.id).toBe("contrat");
  });
});

describe("droits d'accès", () => {
  const base: Personne = { id: "x", nom: "X", role: "Responsable de lot", email: "", organisation: "", capacite: 100 };
  it("déduit un profil du rôle et applique les dérogations", () => {
    expect(accesDe(base).profil).toBe("Responsable de lot");
    expect(niveau(base, "finances")).toBe("lecture");
    expect(niveau(base, "acces")).toBe("aucun");
    const p = { ...base, acces: { profil: "Responsable de lot" as const, projets: "tous" as const, modules: { finances: "ecriture" as const } } };
    expect(niveau(p, "finances")).toBe("ecriture");
  });
  it("restreint les projets visibles", () => {
    const p = { ...base, acces: { profil: "Collaborateur" as const, projets: ["b"], modules: {} } };
    expect(projetsAccessibles(p, [{ id: "a" }, { id: "b" }]).map((x) => x.id)).toEqual(["b"]);
    expect(projetsAccessibles(undefined, [{ id: "a" }])).toHaveLength(1);
  });
});

describe("risques", () => {
  it("calcule score, criticité et exposition pondérée", () => {
    expect(score({ probabilite: 4, impact: 4 })).toBe(16);
    expect(criticite(16)).toBe("Critique");
    expect(criticite(9)).toBe("Élevée");
    expect(criticite(3)).toBe("Faible");
    const d = donneesDemo();
    // Les risques survenus ou clos ne comptent pas dans l'exposition
    const r = d.risques.filter((x) => x.id === "rsk-1" || x.id === "rsk-8");
    expect(exposition(r)).toBeCloseTo(180_000 * 0.7);
  });
});
